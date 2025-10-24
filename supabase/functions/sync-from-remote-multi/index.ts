import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FilterOperator = "=" | "<>" | ">" | "<" | ">=" | "<=" | "LIKE" | "TRUE" | "NOT TRUE";

interface Filter {
  field: string;
  operator: FilterOperator;
  value?: any;
}

interface SyncRequest {
  table: string;
  matchingField: string;
  fieldsToUpdate: string[];
  sourceFilters?: Filter[];
  targetFilters?: Filter[];
  dryRun?: boolean;
}

const SRC = createClient(
  mustEnv("SRC_SUPABASE_URL"),
  mustEnv("SRC_SUPABASE_SERVICE_ROLE_KEY")
);

const DEST = createClient(
  mustEnv("SUPABASE_URL"),
  mustEnv("SUPABASE_SERVICE_ROLE_KEY")
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SyncRequest = await req.json();
    const { table, matchingField, fieldsToUpdate, sourceFilters = [], targetFilters = [], dryRun = false } = body;

    console.log(`Sync request: table=${table}, matchingField=${matchingField}, dryRun=${dryRun}`);

    // Validate required fields
    if (!table || !matchingField || !fieldsToUpdate || fieldsToUpdate.length === 0) {
      return json({ 
        error: "Missing required fields: table, matchingField, and fieldsToUpdate are required" 
      }, 400);
    }

    // Build source query with filters
    let sourceQuery = SRC.from(table).select(`${matchingField}, ${fieldsToUpdate.join(", ")}`);
    sourceQuery = applyFilters(sourceQuery, sourceFilters);

    const { data: sourceData, error: sourceError } = await sourceQuery;
    
    if (sourceError) {
      console.error("Source query error:", sourceError);
      return json({ error: "Failed to fetch from source", details: sourceError }, 500);
    }

    console.log(`Fetched ${sourceData?.length || 0} records from source`);

    if (!sourceData || sourceData.length === 0) {
      return json({ 
        success: true, 
        dryRun, 
        message: "No records found in source matching filters",
        stats: { fetched: 0, matched: 0, updated: 0 }
      });
    }

    // Get matching keys from source
    const sourceKeys = sourceData.map(row => (row as any)[matchingField]).filter(k => k !== null && k !== undefined);

    // Build target query to find existing records
    let targetQuery = DEST.from(table).select(matchingField).in(matchingField, sourceKeys);
    targetQuery = applyFilters(targetQuery, targetFilters);

    const { data: targetData, error: targetError } = await targetQuery;
    
    if (targetError) {
      console.error("Target query error:", targetError);
      return json({ error: "Failed to fetch from target", details: targetError }, 500);
    }

    const targetKeys = new Set(targetData?.map(row => (row as any)[matchingField]) || []);
    console.log(`Found ${targetKeys.size} matching records in target`);

    // Filter source data to only include records that match target filters
    const recordsToUpdate = sourceData.filter(row => targetKeys.has((row as any)[matchingField]));

    console.log(`Records to update: ${recordsToUpdate.length}`);

    if (dryRun) {
      return json({
        success: true,
        dryRun: true,
        message: "Dry run completed - no changes made",
        stats: {
          fetched: sourceData.length,
          matched: recordsToUpdate.length,
          updated: 0
        },
        preview: recordsToUpdate.slice(0, 5) // Show first 5 records as preview
      });
    }

    // Perform the actual update
    if (recordsToUpdate.length > 0) {
      const { data: updated, error: updateError } = await DEST
        .from(table)
        .upsert(recordsToUpdate, { onConflict: matchingField })
        .select();

      if (updateError) {
        console.error("Update error:", updateError);
        return json({ error: "Failed to update target", details: updateError }, 500);
      }

      console.log(`Successfully updated ${updated?.length || 0} records`);

      return json({
        success: true,
        dryRun: false,
        message: `Updated ${updated?.length || 0} records`,
        stats: {
          fetched: sourceData.length,
          matched: recordsToUpdate.length,
          updated: updated?.length || 0
        }
      });
    }

    return json({
      success: true,
      dryRun: false,
      message: "No records to update",
      stats: {
        fetched: sourceData.length,
        matched: 0,
        updated: 0
      }
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

function applyFilters(query: any, filters: Filter[]) {
  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (operator) {
      case "=":
        query = query.eq(field, value);
        break;
      case "<>":
        query = query.neq(field, value);
        break;
      case ">":
        query = query.gt(field, value);
        break;
      case "<":
        query = query.lt(field, value);
        break;
      case ">=":
        query = query.gte(field, value);
        break;
      case "<=":
        query = query.lte(field, value);
        break;
      case "LIKE":
        query = query.ilike(field, value);
        break;
      case "TRUE":
        query = query.eq(field, true);
        break;
      case "NOT TRUE":
        query = query.or(`${field}.is.null,${field}.eq.false`);
        break;
      default:
        console.warn(`Unknown operator: ${operator}`);
    }
  }
  return query;
}

function mustEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
