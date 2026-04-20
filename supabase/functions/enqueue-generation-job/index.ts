// Enqueue job + dispara worker em background (sem await)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const { type, payload, projectId, totalSteps } = body;
    if (!type || !payload) {
      return new Response(JSON.stringify({ error: 'type and payload required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: job, error: insertErr } = await admin
      .from('generation_jobs')
      .insert({
        user_id: userData.user.id,
        project_id: projectId ?? null,
        type,
        payload,
        total_steps: totalSteps ?? 1,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr || !job) {
      console.error('Insert job failed:', insertErr);
      return new Response(JSON.stringify({ error: insertErr?.message || 'Failed to enqueue' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fire-and-forget: dispara worker em background usando EdgeRuntime.waitUntil
    const workerUrl = `${supabaseUrl}/functions/v1/process-generation-job`;
    const workerPromise = fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((e) => console.error('Worker dispatch failed:', e));

    // @ts-ignore EdgeRuntime is global in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(workerPromise);
    }

    return new Response(JSON.stringify({ jobId: job.id, status: 'pending' }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('enqueue-generation-job error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});