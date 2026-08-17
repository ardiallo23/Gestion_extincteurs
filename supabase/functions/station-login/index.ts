import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractTokensFromUrl(urlStr: string): { access_token?: string; refresh_token?: string } {
  try {
    const url = new URL(urlStr);
    // Tokens can be in the hash fragment (OAuth-style) or query params
    const params = new URLSearchParams(url.hash.replace(/^#/, "") || url.searchParams.toString());
    return {
      access_token: params.get("access_token") ?? undefined,
      refresh_token: params.get("refresh_token") ?? undefined,
    };
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { stationCode } = await req.json();

    if (!stationCode || typeof stationCode !== "string") {
      return new Response(JSON.stringify({ error: "Code station requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = stationCode.trim().toUpperCase();

    // Step 1: find the station by code
    const { data: station, error: stationErr } = await adminClient
      .from("stations")
      .select("id, code, name")
      .eq("code", code)
      .maybeSingle();

    if (stationErr || !station) {
      return new Response(JSON.stringify({ error: "Code station introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: find the manager assigned to that station
    const { data: manager, error: managerErr } = await adminClient
      .from("profiles")
      .select("email, role, station_id")
      .eq("role", "manager")
      .eq("station_id", station.id)
      .maybeSingle();

    if (managerErr || !manager) {
      return new Response(JSON.stringify({ error: "Aucun gérant assigné à cette station" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link for the manager's email
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: manager.email,
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: "Impossible de générer la connexion" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The verify endpoint returns a 302 redirect with tokens in the Location header URL
    const verifyResp = await fetch(linkData.properties.action_link, {
      headers: { "Accept": "application/json" },
      redirect: "manual",
    });

    // Try to get tokens from the Location header first
    const locationHeader = verifyResp.headers.get("location");
    let tokens: { access_token?: string; refresh_token?: string } = {};

    if (locationHeader) {
      tokens = extractTokensFromUrl(locationHeader);
    }

    // If not found in Location header, try parsing the response body as JSON
    if (!tokens.access_token) {
      const contentType = verifyResp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const session = await verifyResp.json();
        tokens = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        };
      } else {
        // HTML response — parse tokens from any embedded URLs in the body
        const body = await verifyResp.text();
        const match = body.match(/href="([^"]*(?:access_token|refresh_token)[^"]*)"/);
        if (match) {
          tokens = extractTokensFromUrl(match[1]);
        }
      }
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      return new Response(JSON.stringify({ error: "Échec de l'authentification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
