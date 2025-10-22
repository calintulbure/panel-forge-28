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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting product URLs sync...');

    // Fetch all products with their ERP codes
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('erp_product_code');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`Found ${products?.length || 0} products to sync`);

    // Fetch all yli_hu_products
    const { data: huProducts, error: huError } = await supabase
      .from('yli_hu_products')
      .select('sku, url_key');

    if (huError) {
      console.error('Error fetching HU products:', huError);
      throw huError;
    }

    // Fetch all yli_ro_products
    const { data: roProducts, error: roError } = await supabase
      .from('yli_ro_products')
      .select('sku, url_key');

    if (roError) {
      console.error('Error fetching RO products:', roError);
      throw roError;
    }

    console.log(`Found ${huProducts?.length || 0} HU products and ${roProducts?.length || 0} RO products`);

    // Create lookup maps
    const huMap = new Map(huProducts?.map(p => [p.sku, p.url_key]) || []);
    const roMap = new Map(roProducts?.map(p => [p.sku, p.url_key]) || []);

    // Update products in batches
    let updatedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < (products?.length || 0); i += batchSize) {
      const batch = products!.slice(i, i + batchSize);
      
      const updates = batch.map(product => {
        const erpCode = product.erp_product_code;
        const update: any = { erp_product_code: erpCode };

        if (huMap.has(erpCode)) {
          update.ylihu_sku = erpCode;
          update.site_hu_url = huMap.get(erpCode);
        }

        if (roMap.has(erpCode)) {
          update.yliro_sku = erpCode;
          update.site_ro_url = roMap.get(erpCode);
        }

        return update;
      }).filter(update => update.ylihu_sku || update.yliro_sku);

      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              ylihu_sku: update.ylihu_sku,
              yliro_sku: update.yliro_sku,
              site_ro_url: update.site_ro_url,
              site_hu_url: update.site_hu_url,
            })
            .eq('erp_product_code', update.erp_product_code);

          if (updateError) {
            console.error(`Error updating product ${update.erp_product_code}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }

      console.log(`Processed batch ${i / batchSize + 1}, updated ${updatedCount} products so far`);
    }

    console.log(`Sync completed. Updated ${updatedCount} products.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        total: products?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in sync-products-urls:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
