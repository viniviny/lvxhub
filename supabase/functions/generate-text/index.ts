import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LangConfig {
  name: string;
  tone: string;
}

const LANGUAGE_MAP: Record<string, LangConfig> = {
  'en-US': { name: 'English (American)', tone: 'casual, direct, benefit-focused' },
  'en-GB': { name: 'English (British)', tone: 'slightly formal, quality-focused' },
  'en-AU': { name: 'English (Australian)', tone: 'casual, relaxed' },
  'de-DE': { name: 'German', tone: 'precise, quality-focused, detailed' },
  'fr-FR': { name: 'French', tone: 'elegant, lifestyle-oriented' },
  'it-IT': { name: 'Italian', tone: 'stylish, fashion-forward' },
  'es-ES': { name: 'Spanish (Spain)', tone: 'warm, expressive' },
  'nl-NL': { name: 'Dutch', tone: 'direct, practical' },
  'sv-SE': { name: 'Swedish', tone: 'clean, minimalist' },
  'pl-PL': { name: 'Polish', tone: 'informative, professional' },
  'ja-JP': { name: 'Japanese', tone: 'polite, detail-oriented' },
  'ko-KR': { name: 'Korean', tone: 'polite, trend-aware' },
  'zh-CN': { name: 'Chinese Simplified', tone: 'concise, professional' },
  'pt-BR': { name: 'Portuguese (Brazil)', tone: 'warm, conversational' },
};

function getLangConfig(langCode: string, langLabel: string): LangConfig {
  if (LANGUAGE_MAP[langCode]) return LANGUAGE_MAP[langCode];
  return { name: langLabel || 'English (American)', tone: 'professional and neutral' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, brief, title, language, languageCode, countryName, customPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = languageCode || 'en-US';
    const config = getLangConfig(code, language || 'English');
    const langDirective = `Write ONLY in ${config.name}${countryName ? ` as spoken by native speakers in ${countryName}` : ''}. Tone: ${config.tone}. NEVER respond in Portuguese or any other language.`;

    let systemPrompt = '';
    let userPrompt = '';

    if (customPrompt) {
      systemPrompt = `You are an expert e-commerce copywriter. ${langDirective}\n\nThe user may write instructions in Portuguese (Brazilian). Understand their intent and execute it, BUT write your response ONLY in ${config.name}. Never respond in Portuguese. Return only the requested content, nothing else.`;
      userPrompt = customPrompt;
    } else if (type === 'title') {
      systemPrompt = `You are an expert e-commerce copywriter. ${langDirective}\n\nWrite only the product title, nothing else. Max 60 characters. SEO optimized. Do not include quotes around the title.`;
      userPrompt = brief || 'Generate a product title';
    } else if (type === 'description') {
      systemPrompt = `You are an expert e-commerce copywriter. ${langDirective}\n\nWrite only the product description in HTML format. Use <ul><li> for feature bullet points. 2-3 short paragraphs. Max 150 words. Do not wrap in code blocks or markdown.`;
      userPrompt = `Product: ${title || 'Product'}. Details: ${brief || 'Generate a compelling product description'}`;
    } else if (type === 'seo-title') {
      systemPrompt = `You are an SEO specialist for e-commerce. ${langDirective}\n\nWrite an SEO-optimized product title. Max 60 characters. Use keywords that customers in ${countryName || 'this market'} actually search for. Only return the title, nothing else. No quotes.`;
      userPrompt = brief || title || 'Generate an SEO title';
    } else if (type === 'seo-description') {
      systemPrompt = `You are an SEO specialist for e-commerce. ${langDirective}\n\nWrite an SEO meta description. Max 155 characters. Compelling, with relevant keywords for ${countryName || 'this market'}. Only return the description, nothing else. No quotes.`;
      userPrompt = `Product: ${title || brief || 'Product'}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Tipo inválido." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar conteúdo." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ content, language: config.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error("generate-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
