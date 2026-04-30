/**
 * ═══════════════════════════════════════════════════════════════════════
 * Edge Function: studio-generate
 * ───────────────────────────────────────────────────────────────────────
 * Independent generation endpoint for the Image Studio.
 *
 * No dependency on products, drafts, Shopify, stores or markets.
 * Reads/writes ONLY: visual_projects, image_sessions, studio_images
 * and storage bucket `studio-images`.
 *
 * Body:
 *   {
 *     project_id: uuid,
 *     session_id: uuid,
 *     parent_image_id?: uuid,
 *     branch_id?: uuid,
 *     user_prompt: string,
 *     role?: string,                 // anchor | variation | branch | ...
 *     locks?: { style, product, background, model, useAnchor, useSeedFamily },
 *     output?: { quantity, aspect_ratio, quality, format },
 *     anchor_image_url?: string,     // optional override
 *   }
 * ═══════════════════════════════════════════════════════════════════════
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';
const RATIO_INSTRUCTIONS: Record<AspectRatio, string> = {
  '1:1': 'OUTPUT FORMAT: Square 1:1 aspect ratio. Compose subject centered.',
  '4:5': 'OUTPUT FORMAT: Portrait 4:5 aspect ratio (vertical). Editorial framing.',
  '16:9': 'OUTPUT FORMAT: Landscape 16:9 wide horizontal. Banner composition.',
  '9:16': 'OUTPUT FORMAT: Vertical 9:16 mobile full-screen. Story composition.',
};

function buildStudioPrompt(input: {
  userPrompt: string;
  role?: string;
  locks?: any;
  visualDNA?: any;
  aspectRatio: AspectRatio;
  hasAnchor: boolean;
  seed?: string;
}): { final: string; negative: string } {
  const blocks: string[] = [];
  const dna = input.visualDNA || {};

  // Base prompt
  blocks.push(`PRIMARY DIRECTION: ${input.userPrompt.trim()}`);

  // Style direction
  const style = dna.style_direction;
  if (style) blocks.push(`STYLE DIRECTION: ${style}.`);

  // Camera / lighting / background / palette
  if (dna.camera_style) blocks.push(`CAMERA: ${dna.camera_style}.`);
  if (dna.lighting_style) blocks.push(`LIGHTING: ${dna.lighting_style}.`);
  if (dna.background_style) blocks.push(`BACKGROUND: ${dna.background_style}.`);
  if (dna.color_palette) blocks.push(`COLOR PALETTE: ${dna.color_palette}.`);

  // Locks
  const L = input.locks || {};
  if (L.style)
    blocks.push(
      'STYLE LOCK: Preserve the same lighting, color palette, mood, camera style, background and overall composition direction across generations.',
    );
  if (L.product)
    blocks.push(
      'PRODUCT LOCK: Preserve exact product design, color, shape, material, texture, seams, proportions and details. Do not invent or alter the product.',
    );
  if (L.background)
    blocks.push(
      'BACKGROUND LOCK: Keep the same backdrop type, surface, perspective and lighting on the background.',
    );
  if (L.model)
    blocks.push(
      'MODEL LOCK: Preserve the model identity (face, hair, body type, skin tone). Same person across variations.',
    );
  if (L.useAnchor && input.hasAnchor)
    blocks.push(
      'ANCHOR REFERENCE: The attached image is the visual anchor. Treat it as the source of truth for product, style and lighting.',
    );
  if (L.useSeedFamily && input.seed)
    blocks.push(`SEED FAMILY: ${input.seed} — produce a coherent variation within the same family.`);

  // Aspect
  blocks.push(RATIO_INSTRUCTIONS[input.aspectRatio]);

  // Quality clamp
  blocks.push(
    'MANDATORY: Commercial-grade quality, sharp focus, professional lighting, true colors, no watermarks, no text overlays, no UI elements, no borders.',
  );

  const negative =
    dna.negative_prompt ||
    'oversaturated, plastic, cheap, low quality, watermark, text, logo, frame, border, distorted anatomy, extra limbs';
  blocks.push(`NEGATIVE: avoid — ${negative}.`);

  return { final: blocks.join('\n\n'), negative };
}

async function callGemini(
  apiKey: string,
  prompt: string,
  refs: Array<{ data: string; mimeType: string }>,
): Promise<string | null> {
  const parts: any[] = [{ text: prompt }];
  for (const r of refs) parts.push({ inlineData: { mimeType: r.mimeType, data: r.data } });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 110_000);
  try {
    const url = `${GEMINI_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Gemini ${res.status}: ${txt.slice(0, 240)}`);
    }
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
    if (!part) return null;
    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
  } finally {
    clearTimeout(t);
  }
}

// Convert remote URL to base64 (for anchor reference)
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const m = url.match(/^data:(.*?);base64,(.*)$/);
      if (!m) return null;
      return { data: m[2], mimeType: m[1] };
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const mt = res.headers.get('content-type') || 'image/png';
    const buf = new Uint8Array(await res.arrayBuffer());
    // 8KB chunks (memory rule)
    let bin = '';
    for (let i = 0; i < buf.length; i += 8192) {
      bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    return { data: btoa(bin), mimeType: mt };
  } catch {
    return null;
  }
}

async function uploadToStorage(
  admin: any,
  userId: string,
  dataUrl: string,
): Promise<{ publicUrl: string; path: string } | null> {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!m) return null;
  const [, mt, b64] = m;
  const ext = (mt.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const path = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const { error } = await admin.storage
    .from('studio-images')
    .upload(path, bytes, { contentType: mt, upsert: false });
  if (error) {
    console.error('upload error', error);
    return null;
  }
  const { data } = admin.storage.from('studio-images').getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = auth.replace('Bearer ', '').trim();
    let userId: string;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) throw new Error('expired');
      if (!payload.sub) throw new Error('no sub');
      userId = payload.sub;
    } catch {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      project_id,
      session_id,
      parent_image_id,
      branch_id,
      user_prompt,
      role = 'variation',
      locks = {},
      output = {},
      anchor_image_url,
    } = body || {};

    if (!project_id || !session_id || !user_prompt || String(user_prompt).trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'project_id, session_id e user_prompt (≥3) são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate ownership
    const { data: project } = await admin
      .from('visual_projects')
      .select('id, user_id')
      .eq('id', project_id)
      .maybeSingle();
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Projeto inválido' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: session } = await admin
      .from('image_sessions')
      .select('id, user_id, project_id, visual_dna, seed_base, seed_family, anchor_image_id')
      .eq('id', session_id)
      .maybeSingle();
    if (!session || session.user_id !== userId || session.project_id !== project_id) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve anchor reference
    let anchorUrl: string | null = anchor_image_url || null;
    if (!anchorUrl && session.anchor_image_id) {
      const { data: anchor } = await admin
        .from('studio_images')
        .select('image_url')
        .eq('id', session.anchor_image_id)
        .maybeSingle();
      if (anchor?.image_url) anchorUrl = anchor.image_url;
    }
    if (!anchorUrl && parent_image_id) {
      const { data: parent } = await admin
        .from('studio_images')
        .select('image_url')
        .eq('id', parent_image_id)
        .maybeSingle();
      if (parent?.image_url) anchorUrl = parent.image_url;
    }
    const refs: Array<{ data: string; mimeType: string }> = [];
    if (anchorUrl && (locks.useAnchor || role === 'variation' || role === 'branch')) {
      const ref = await urlToBase64(anchorUrl);
      if (ref) refs.push(ref);
    }

    const aspectRatio: AspectRatio = (output.aspect_ratio as AspectRatio) || '4:5';
    const quantity = Math.min(Math.max(parseInt(output.quantity) || 1, 1), 4);

    const built = buildStudioPrompt({
      userPrompt: String(user_prompt),
      role,
      locks,
      visualDNA: session.visual_dna || {},
      aspectRatio,
      hasAnchor: refs.length > 0,
      seed: session.seed_base || undefined,
    });

    // Generate N in parallel
    const tasks = Array.from({ length: quantity }, (_, i) =>
      callGemini(GEMINI, `${built.final}\n\nVARIANT #${i + 1}`, refs).catch((e) => {
        console.error('gen failed', i, e);
        return null;
      }),
    );
    const results = await Promise.all(tasks);
    const goodImages = results.filter((x): x is string => !!x);

    if (goodImages.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma imagem gerada' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload + persist
    const saved: any[] = [];
    for (const dataUrl of goodImages) {
      const up = await uploadToStorage(admin, userId, dataUrl);
      const insertPayload: any = {
        user_id: userId,
        project_id,
        session_id,
        parent_image_id: parent_image_id || null,
        branch_id: branch_id || null,
        image_url: up?.publicUrl || dataUrl,
        storage_path: up?.path || null,
        prompt: String(user_prompt).slice(0, 4000),
        final_prompt: built.final.slice(0, 8000),
        negative_prompt: built.negative.slice(0, 2000),
        mode: null,
        role,
        status: 'generated',
        aspect_ratio: aspectRatio,
        format: output.format || 'png',
        provider: 'gemini',
        model: GEMINI_IMAGE_MODEL,
        seed: session.seed_base || null,
        metadata: { quality: output.quality || 'standard' },
      };
      const { data: row, error: insErr } = await admin
        .from('studio_images')
        .insert(insertPayload)
        .select()
        .single();
      if (insErr) {
        console.error('insert err', insErr);
        continue;
      }
      saved.push(row);
    }

    // Touch session
    await admin.from('image_sessions').update({ updated_at: new Date().toISOString() }).eq('id', session_id);
    await admin.from('visual_projects').update({ updated_at: new Date().toISOString() }).eq('id', project_id);

    return new Response(JSON.stringify({ images: saved, finalPrompt: built.final }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('studio-generate error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Erro inesperado' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});