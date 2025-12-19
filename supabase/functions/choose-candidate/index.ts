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

    // First, get the product to retrieve articol_id
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('articol_id')
      .eq('erp_product_code', erp_product_code)
      .single();

    if (productError || !product) {
      console.error('Failed to find product:', productError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Product not found: ${erp_product_code}`
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const articolId = product.articol_id;
    const server = site === "ro" ? "yli.ro" : "yli.hu";

    // Prepare update object for products table (SKU and product_id only)
    const productUpdateData: Record<string, any> = {};
    
    if (site === "ro") {
      productUpdateData.yliro_sku = candidate.product_code;
      if (candidate.product_id) {
        productUpdateData.site_ro_product_id = candidate.product_id;
      }
    } else {
      productUpdateData.ylihu_sku = candidate.product_code;
      if (candidate.product_id) {
        productUpdateData.site_hu_product_id = candidate.product_id;
      }
    }

    // Update product record (SKU and product_id)
    const { error: updateError } = await supabase
      .from('products')
      .update(productUpdateData)
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

    // Update or insert URL in products_resources table
    const { data: existingResource, error: resourceFetchError } = await supabase
      .from('products_resources')
      .select('resource_id')
      .eq('articol_id', articolId)
      .eq('resource_type', 'html')
      .eq('resource_content', 'webpage')
      .eq('server', server)
      .maybeSingle();

    if (resourceFetchError) {
      console.error('Failed to check existing resource:', resourceFetchError);
    }

    if (existingResource) {
      // Update existing resource
      const { error: resourceUpdateError } = await supabase
        .from('products_resources')
        .update({ 
          url: candidate.url,
          processed: false,
          updated_at: new Date().toISOString()
        })
        .eq('resource_id', existingResource.resource_id);

      if (resourceUpdateError) {
        console.error('Failed to update resource URL:', resourceUpdateError);
      } else {
        console.log(`Updated URL in products_resources for articol_id ${articolId}, server ${server}`);
      }
    } else {
      // Insert new resource
      const { error: resourceInsertError } = await supabase
        .from('products_resources')
        .insert({
          articol_id: articolId,
          erp_product_code: erp_product_code,
          resource_type: 'html',
          resource_content: 'webpage',
          server: server,
          url: candidate.url,
        });

      if (resourceInsertError) {
        console.error('Failed to insert resource URL:', resourceInsertError);
      } else {
        console.log(`Inserted new URL in products_resources for articol_id ${articolId}, server ${server}`);
      }
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
