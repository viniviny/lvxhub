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

const GENDER_MAP: Record<string, string> = {
  masculino: 'menswear / male',
  feminino: 'womenswear / female',
  unissex: 'unisex / gender-neutral',
  infantil: 'kidswear / children',
};

const TONE_MAP: Record<string, string> = {
  minimal: 'Minimal, refined, modern, premium. Inspired by Zara, COS, ZEGNA. Clean sentences, understated elegance.',
  bold: 'Bold, confident, statement-making. Inspired by Off-White, Balenciaga, Fear of God. Strong language, impactful phrasing.',
  casual: 'Casual, approachable, warm. Inspired by Uniqlo, Everlane, H&M. Conversational tone, friendly and relatable.',
  editorial: 'Editorial, storytelling, atmospheric. Inspired by Vogue, SSENSE, Mr Porter. Evocative prose, rich imagery, cultural references.',
};

/** Build a structured product context block from the resolved productContext */
function buildContextBlock(ctx: Record<string, string> | undefined): string {
  if (!ctx || typeof ctx !== 'object') return '';
  const lines: string[] = [];
  if (ctx.product_type) lines.push(`Product type: ${ctx.product_type}`);
  if (ctx.gender) lines.push(`Gender: ${ctx.gender}`);
  if (ctx.style) lines.push(`Style: ${ctx.style}`);
  if (ctx.main_color) lines.push(`Main color: ${ctx.main_color}`);
  if (ctx.material_look) lines.push(`Material look: ${ctx.material_look}`);
  if (ctx.fit) lines.push(`Fit/Structure: ${ctx.fit}`);
  if (ctx.use_case) lines.push(`Use case: ${ctx.use_case}`);
  if (ctx.visual_details) lines.push(`Visual details: ${ctx.visual_details}`);
  if (ctx.tags) lines.push(`Tags: ${ctx.tags}`);
  if (lines.length === 0) return '';
  return `\n\nPRODUCT CONTEXT (resolved from user inputs + image analysis):\n${lines.join('\n')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, brief, title, language, languageCode, countryName, customPrompt, tone, usedNames, gender, productContext } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = languageCode || 'en-US';
    const config = getLangConfig(code, language || 'English');
    const langDirective = `Write ONLY in ${config.name}${countryName ? ` as spoken by native speakers in ${countryName}` : ''}. Tone: ${config.tone}. NEVER respond in Portuguese or any other language.`;

    const toneDirective = TONE_MAP[tone || 'minimal'] || TONE_MAP.minimal;
    const genderLine = gender && GENDER_MAP[gender] ? `\nTARGET GENDER: ${GENDER_MAP[gender]}. Adapt language, tone, and product positioning accordingly.` : '';
    const contextBlock = buildContextBlock(productContext);

    const brandContext = `You are a senior-level e-commerce copywriter, brand strategist, and SEO specialist working with premium global fashion brands.
BRAND STYLE: ${toneDirective}${genderLine}
RULES: Avoid hype, exaggeration, aggressive sales language, generic phrasing, cliché wording, emojis. Sound like a curated fashion label, not a marketplace listing. Every sentence must feel intentional and clean.
ACCURACY: Do not invent technical features or make unsupported claims. Prefer cautious language like "textured finish", "structured look", "soft knit appearance" instead of specific fabric/material claims unless confirmed.
SEO: Naturally include relevant keywords (product type, material, use case). Do NOT keyword stuff. Keep flow natural and readable.`;

    let systemPrompt = '';
    let userPrompt = '';

    if (customPrompt) {
      systemPrompt = `${brandContext}${contextBlock}\n\n${langDirective}\n\nThe user may write instructions in Portuguese (Brazilian). Understand their intent and execute it, BUT write your response ONLY in ${config.name}. Never respond in Portuguese. Return only the requested content, nothing else.`;
      userPrompt = customPrompt;
    } else if (type === 'title') {
      const usedList = Array.isArray(usedNames) && usedNames.length > 0
        ? `\n\nPREVIOUSLY USED NAMES (DO NOT REPEAT OR USE SIMILAR):\n${usedNames.join(', ')}`
        : '';
      systemPrompt = `${brandContext}\n\n${langDirective}\n\nYou are a global luxury fashion brand naming expert working with high-end Shopify brands.\n\nYour task is to generate a UNIQUE, PREMIUM, and BRAND-LEVEL product title.\n\nSTEP 1 — TRANSLATION:\n- Translate the product type into ${config.name} if needed\n- Keep it natural and commonly used in that language\n\nSTEP 2 — NAME CREATION:\nGenerate a unique name to follow the product type.\n\nNAMING STRUCTURE:\nFinal output must be: [Translated Product Type] [Generated Name]\n\nNAMING RULES:\n- The generated name must be 1 or 2 words\n- The final title should ideally contain 2 to 4 words total\n- Must be abstract, conceptual, or emotional\n- Must not describe the product literally\n- Must not include generic fashion words\n- Must be elegant, premium, and globally brandable\n- Must be easy to read and pronounce internationally\n- No emojis, no quotes\n\nFORBIDDEN WORDS: Basic, Casual, Fashion, Premium, Comfort, Classic, Style, Modern, Trend, Essential, Fit, Soft, Slim, Cotton, Best, Cheap, Sale, Hot, Trending\n\nPreferred style examples: Obsidian, Velora, Elaris, Nexor, Kaelis, Vireon, Zorath${usedList}${contextBlock}\n\nUNIQUENESS RULE: The generated name must not match or resemble any name in the previously used list. If it is too similar, generate a different one.\n\nOUTPUT RULE: Return ONLY one single line: [Translated Product Type] [Generated Name]\nDo not add explanations. Do not add multiple options. Do not use quotes. Do not break lines.`;
      userPrompt = brief || 'Generate a premium product title';
    } else if (type === 'description') {
      systemPrompt = `${brandContext}\n\n${langDirective}\n\nWrite a premium product description in HTML format. MANDATORY STRUCTURE:
1. HOOK (1-2 lines): Emotional, clean, subtle. Introduce feeling or lifestyle.
2. BODY PARAGRAPH: Describe the product in context (lifestyle + function). Highlight comfort, fit, and versatility.
3. BULLET POINTS (4-6 max using <ul><li>): Clear and concise. Features + benefits combined. No repetition.
4. CLOSING LINE: Positioning statement. Reinforce brand identity and timelessness.${contextBlock ? `\n\nUSE THE FOLLOWING PRODUCT CONTEXT to enrich the description naturally. Frame inferred details carefully — prefer language like "textured finish", "structured look", "soft knit appearance" instead of making specific fabric claims:${contextBlock}` : ''}
RULES: Premium, calm, confident tone. No exaggeration. No emojis. No filler text. Max 150 words. Do not wrap in code blocks or markdown.`;
      userPrompt = `Product: ${title || 'Product'}. Details: ${brief || 'Generate a compelling premium product description'}`;
    } else if (type === 'seo-title') {
      systemPrompt = `${brandContext}\n\n${langDirective}\n\nWrite an SEO-optimized product title. Max 60 characters. Use keywords that customers in ${countryName || 'this market'} actually search for. Keep it brandable and elegant.${contextBlock} Only return the title, nothing else. No quotes.`;
      userPrompt = brief || title || 'Generate an SEO title';
    } else if (type === 'seo-description') {
      systemPrompt = `${brandContext}\n\n${langDirective}\n\nWrite an SEO meta description. Max 155 characters. Compelling, with relevant keywords for ${countryName || 'this market'}. Premium tone.${contextBlock} Only return the description, nothing else. No quotes.`;
      userPrompt = `Product: ${title || brief || 'Product'}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Tipo inválido." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API key inválida ou sem cota. Verifique sua GOOGLE_API_KEY." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("Google AI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar conteúdo." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
