import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data } = await req.json();
    
    console.log('Received request:', { operation, data });

    // Validate operation type
    if (!['insert', 'update'].includes(operation)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid operation. Must be "insert" or "update"' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result;

    if (operation === 'insert') {
      // Insert new record
      console.log('Inserting new product:', data);
      
      const { data: insertedData, error } = await supabase
        .from('products')
        .insert(data)
        .select();

      if (error) {
        console.error('Insert error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to insert record', 
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      result = insertedData;
      console.log('Insert successful:', result);

    } else if (operation === 'update') {
      // Update existing record
      const { erp_product_code, ...updateFields } = data;
      
      if (!erp_product_code) {
        return new Response(
          JSON.stringify({ 
            error: 'erp_product_code is required for update operations' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Updating product:', { erp_product_code, updateFields });

      const { data: updatedData, error } = await supabase
        .from('products')
        .update(updateFields)
        .eq('erp_product_code', erp_product_code)
        .select();

      if (error) {
        console.error('Update error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update record', 
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!updatedData || updatedData.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No record found with the provided erp_product_code' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      result = updatedData;
      console.log('Update successful:', result);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        operation,
        data: result 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in manage-products function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
