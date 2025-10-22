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

    // Fetch non-validated products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('erp_product_code')
      .is('validated', false);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`Found ${products?.length || 0} non-validated products to sync`);

    // Fetch all yli_hu_products and yli_ro_products
    const { data: huProducts, error: huError } = await supabase
      .from('yli_hu_products')
      .select('sku, url_key');

    if (huError) {
      console.error('Error fetching HU products:', huError);
      throw huError;
    }

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

    // Process updates
    let updatedCount = 0;

    for (const product of products || []) {
      const erpCode = product.erp_product_code;
      const roSku = roMap.get(erpCode);
      const huSku = huMap.get(erpCode);

      // Only update if at least one match exists
      if (!roSku && !huSku) {
        continue;
      }

      const updateData: any = {};
      
      if (roSku) {
        updateData.yliro_sku = erpCode;
        updateData.site_ro_url = roSku;
      }
      
      if (huSku) {
        updateData.ylihu_sku = erpCode;
        updateData.site_hu_url = huSku;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('erp_product_code', erpCode);

      if (updateError) {
        console.error(`Error updating product ${erpCode}:`, updateError);
      } else {
        updatedCount++;
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} products so far...`);
        }
      }
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
