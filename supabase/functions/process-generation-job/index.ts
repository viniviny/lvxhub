// Worker: processa um job de generation_jobs em background.
// Suporta type='generate-images' (lote de ângulos) chamando Lovable AI Gateway.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

async function callImageModel(prompt: string, references: Array<{ base64: string; mimeType: string }> = []) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const content: any[] = [{ type: 'text', text: prompt }];
  for (const ref of references) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${ref.mimeType};base64,${ref.base64}` },
    });
  }

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GEMINI_IMAGE_MODEL,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${text}`);
  }
  const data = await res.json();
  const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) throw new Error('No image returned by model');
  return imageUrl as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  let jobId: string | null = null;
  try {
    const body = await req.json();
    jobId = body.jobId;
    if (!jobId) throw new Error('jobId required');

    const { data: job, error: jobErr } = await admin
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobErr || !job) throw new Error('Job not found');

    await admin
      .from('generation_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    if (job.type === 'generate-images') {
      const { angles, basePrompt, references } = job.payload as {
        angles: Array<{ id: string; angle: string; prompt: string }>;
        basePrompt?: string;
        references?: Array<{ base64: string; mimeType: string }>;
      };
      if (!Array.isArray(angles) || angles.length === 0) throw new Error('angles required');

      const results: Array<{ id: string; angle: string; url: string; error?: string }> = [];
      let done = 0;
      for (const item of angles) {
        try {
          const fullPrompt = basePrompt ? `${basePrompt}\n\n${item.prompt}` : item.prompt;
          const url = await callImageModel(fullPrompt, references ?? []);
          results.push({ id: item.id, angle: item.angle, url });
        } catch (e) {
          console.error(`Angle ${item.angle} failed:`, e);
          results.push({ id: item.id, angle: item.angle, url: '', error: String(e) });
        }
        done += 1;
        await admin
          .from('generation_jobs')
          .update({ progress: done, result: { images: results } })
          .eq('id', jobId);
      }

      await admin
        .from('generation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { images: results },
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unsupported job type: ${job.type}`);
  } catch (err) {
    console.error('process-generation-job error:', err);
    if (jobId) {
      await admin
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: String(err),
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});