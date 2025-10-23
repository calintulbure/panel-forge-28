import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchCandidatesRequest {
  erp_product_code: string;
  erp_product_description?: string;
  website: "ro" | "hu" | string;
}

interface N8nCandidate {
  candidate_product_code: string;
  product_url: string;
  product_id?: number;
  title?: string;
  confidence?: number;
}

interface N8nResponse {
  candidates?: N8nCandidate[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { erp_product_code, erp_product_description, website }: MatchCandidatesRequest = await req.json();

    if (!erp_product_code || !website) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: erp_product_code and website'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine site from website parameter
    let site: "ro" | "hu";
    if (website === "ro" || website === "hu") {
      site = website;
    } else {
      // Infer from URL hostname
      try {
        const url = new URL(website);
        if (url.hostname.includes('yli.ro')) {
          site = "ro";
        } else if (url.hostname.includes('yli.hu')) {
          site = "hu";
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Unable to determine site from website parameter. Use "ro", "hu", or a valid yli.ro/yli.hu URL'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid website parameter. Use "ro", "hu", or a valid URL'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get appropriate webhook URL
    const webhookUrl = site === "ro" 
      ? Deno.env.get("N8N_MATCH_WEBHOOK_RO")
      : Deno.env.get("N8N_MATCH_WEBHOOK_HU");

    if (!webhookUrl) {
      console.error(`Missing webhook URL for site: ${site}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Configuration error: Missing webhook URL for ${site.toUpperCase()}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching candidates from n8n for ${erp_product_code} (${site})...`);
    console.log(`Product description: ${erp_product_description || 'not provided'}`);

    // Prepare payload for n8n
    const payload: Record<string, any> = {
      product_code: erp_product_code,
      site
    };
    
    // Only include product_description if it exists
    if (erp_product_description) {
      payload.product_description = erp_product_description;
    }
    
    console.log('Sending payload to n8n:', JSON.stringify(payload));

    // Call n8n webhook with retry logic
    let n8nResponse: Response;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        n8nResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25000), // 25s timeout
        });

        if (n8nResponse.ok) break;

        // If not OK and this was our last retry, throw
        if (retryCount === maxRetries) {
          throw new Error(`n8n returned status ${n8nResponse.status}`);
        }
      } catch (error) {
        if (retryCount === maxRetries) {
          console.error('n8n request failed after retry:', error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to fetch candidates from n8n'
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      retryCount++;
    }

    const n8nData: N8nResponse = await n8nResponse!.json();

    // Validate response
    if (!n8nData.candidates || !Array.isArray(n8nData.candidates)) {
      console.error('Invalid n8n response:', n8nData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No candidates returned from matching service'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize candidates
    const candidates = n8nData.candidates.map(c => ({
      product_code: c.candidate_product_code,
      url: c.product_url,
      product_id: c.product_id,
      title: c.title || c.candidate_product_code,
      confidence: c.confidence,
    }));

    console.log(`Found ${candidates.length} candidates for ${erp_product_code}`);

    return new Response(
      JSON.stringify({
        success: true,
        site,
        input: {
          erp_product_code,
          website,
        },
        candidates,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in match-candidates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
