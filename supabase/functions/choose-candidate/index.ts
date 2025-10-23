import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChooseCandidateRequest {
  erp_product_code: string;
  site: "ro" | "hu";
  candidate: {
    product_code: string;
    url: string;
    product_id?: number;
    title?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { erp_product_code, site, candidate }: ChooseCandidateRequest = await req.json();

    // Validate input
    if (!erp_product_code || !site || !candidate?.product_code || !candidate?.url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: erp_product_code, site, candidate.product_code, candidate.url'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (site !== "ro" && site !== "hu") {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid site. Must be "ro" or "hu"'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Choosing candidate for ${erp_product_code} (${site}): ${candidate.product_code}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare update object based on site
    const updateData: Record<string, any> = {};
    
    if (site === "ro") {
      updateData.yliro_sku = candidate.product_code;
      updateData.site_ro_url = candidate.url;
      if (candidate.product_id) {
        updateData.site_ro_product_id = candidate.product_id;
      }
    } else {
      updateData.ylihu_sku = candidate.product_code;
      updateData.site_hu_url = candidate.url;
      if (candidate.product_id) {
        updateData.site_hu_product_id = candidate.product_id;
      }
    }

    // Update product record
    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('erp_product_code', erp_product_code);

    if (updateError) {
      console.error('Failed to update product:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to update product: ${updateError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Product ${erp_product_code} updated successfully`);

    // Trigger snapshot capture
    console.log(`Triggering snapshot for ${erp_product_code}...`);
    
    const { data: snapshotData, error: snapshotError } = await supabase.functions.invoke('trigger-snapshot', {
      body: {
        productCode: erp_product_code,
        siteUrl: candidate.url,
        site,
      }
    });

    if (snapshotError) {
      console.error('Snapshot trigger error:', snapshotError);
      // Don't fail the whole operation if snapshot fails
      return new Response(
        JSON.stringify({
          success: true,
          updated: {
            erp_product_code,
            site,
            sku: candidate.product_code,
            url: candidate.url,
          },
          trigger_snapshot: {
            status: 500,
            error: snapshotError.message,
          },
          message: 'Candidate applied but snapshot trigger failed',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Snapshot triggered successfully for ${erp_product_code}`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: {
          erp_product_code,
          site,
          sku: candidate.product_code,
          url: candidate.url,
        },
        trigger_snapshot: {
          status: 200,
        },
        message: 'Candidate applied and snapshot triggered',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in choose-candidate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
