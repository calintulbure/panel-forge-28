import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productCode, siteUrl, site } = await req.json();
    
    if (!productCode || !siteUrl || !site) {
      throw new Error('Missing required fields: productCode, siteUrl, or site');
    }

    if (site !== 'ro' && site !== 'hu') {
      throw new Error('Invalid site parameter. Must be "ro" or "hu"');
    }

    console.log(`Triggering snapshot capture for ${site.toUpperCase()} site:`, { productCode, siteUrl });

    // Get the appropriate webhook URL
    const secretName = site === 'ro' ? 'N8N_WEBHOOK_URL_RO' : 'N8N_WEBHOOK_URL_HU';
    const webhookUrl = site === 'ro'
      ? Deno.env.get('N8N_WEBHOOK_URL_RO')
      : Deno.env.get('N8N_WEBHOOK_URL_HU');

    if (!webhookUrl) {
      throw new Error(`n8n webhook URL not configured for ${site.toUpperCase()} site. Please set the ${secretName} secret to the full https URL.`);
    }

    // Validate that the configured value is a full URL
    try {
      new URL(webhookUrl);
    } catch {
      throw new Error(`Invalid n8n webhook URL configured in ${secretName}. Please set a full https URL (e.g. https://your-n8n-host/webhook/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX).`);
    }

    // Call n8n webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productCode,
        url: siteUrl,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error(`n8n webhook failed with status ${n8nResponse.status}`);
    }

    const n8nData = await n8nResponse.json();
    console.log('n8n response:', n8nData);

    // Update the product with the snapshot URL if returned
    if (n8nData.snapshotUrl) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const updateField = site === 'ro' ? 'site_ro_snapshot_url' : 'site_hu_snapshot_url';
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ [updateField]: n8nData.snapshotUrl })
        .eq('erp_product_code', productCode);

      if (updateError) {
        console.error('Failed to update product:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        snapshotUrl: n8nData.snapshotUrl,
        message: `Snapshot capture triggered for ${site.toUpperCase()} site` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
