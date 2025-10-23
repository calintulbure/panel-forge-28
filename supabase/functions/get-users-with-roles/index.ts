import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Check if user is admin
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleCheck) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Fetch all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (rolesError) throw rolesError;

    // Fetch all users to get emails
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    // Map emails to roles
    const usersWithEmails = (userRoles || []).map((role) => {
      const user = users.find((u) => u.id === role.user_id);
      return {
        ...role,
        user_email: user?.email || "Unknown"
      };
    });

    return jsonResponse({ users: usersWithEmails });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : "An error occurred" 
    }, 500);
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}
