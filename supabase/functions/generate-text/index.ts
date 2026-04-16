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

function buildSpecsBlock(specs: Record<string, any> | undefined): string {
  if (!specs || typeof specs !== 'object') return '';
  const lines: string[] = [];
  if (specs.material && specs.material !== 'N/A') lines.push(`Material: ${specs.material}`);
  if (specs.fabric_composition && specs.fabric_composition !== 'N/A') lines.push(`Fabric composition: ${specs.fabric_composition}`);
  if (specs.style && specs.style !== 'N/A') lines.push(`Style: ${specs.style}`);
  if (specs.fit && specs.fit !== 'N/A') lines.push(`Fit: ${specs.fit}`);
  if (specs.thickness && specs.thickness !== 'N/A') lines.push(`Thickness: ${specs.thickness}`);
  if (specs.craft && specs.craft !== 'N/A') lines.push(`Craft: ${specs.craft}`);
  if (specs.collar_type && specs.collar_type !== 'N/A') lines.push(`Collar type: ${specs.collar_type}`);
  if (specs.sleeve_type && specs.sleeve_type !== 'N/A') lines.push(`Sleeve type: ${specs.sleeve_type}`);
  if (specs.length && specs.length !== 'N/A') lines.push(`Length: ${specs.length}`);
  if (specs.season && specs.season !== 'N/A') lines.push(`Season: ${specs.season}`);
  if (specs.use_case && specs.use_case !== 'N/A') lines.push(`Use case: ${specs.use_case}`);
  if (specs.target_audience && specs.target_audience !== 'N/A') lines.push(`Target audience: ${specs.target_audience}`);
  if (Array.isArray(specs.additional_features) && specs.additional_features.length > 0) {
    lines.push(`Additional features: ${specs.additional_features.join(', ')}`);
  }
  if (lines.length === 0) return '';
  return `\n\nPRODUCT SPECIFICATIONS (AI-generated, use to enrich content):\n${lines.join('\n')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, brief, title, language, languageCode, countryName, customPrompt, tone, usedNames, gender, productContext, productSpecs } = await req.json();

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

    const toneDirective = TONE_MAP[tone || 'minimal'] || TONE_MAP.minimal;
    const genderLine = gender && GENDER_MAP[gender] ? `\nTARGET GENDER: ${GENDER_MAP[gender]}. Adapt language, tone, and product positioning accordingly.` : '';
    const contextBlock = buildContextBlock(productContext);
    const specsBlock = buildSpecsBlock(productSpecs);

    const brandContext = `You are a senior-level e-commerce copywriter, brand strategist, and SEO specialist working with premium global fashion brands.
BRAND STYLE: ${toneDirective}${genderLine}
RULES: Avoid hype, exaggeration, aggressive sales language, generic phrasing, cliché wording, emojis. Sound like a curated fashion label, not a marketplace listing. Every sentence must feel intentional and clean.
ACCURACY: Do not invent technical features or make unsupported claims. Prefer cautious language like "textured finish", "structured look", "soft knit appearance" instead of specific fabric/material claims unless confirmed.
SEO: Naturally include relevant keywords (product type, material, use case). Do NOT keyword stuff. Keep flow natural and readable.`;

    let systemPrompt = '';
    let userPrompt = '';

    if (customPrompt) {
      systemPrompt = `${brandContext}${contextBlock}${specsBlock}\n\n${langDirective}\n\nThe user may write instructions in Portuguese (Brazilian). Understand their intent and execute it, BUT write your response ONLY in ${config.name}. Never respond in Portuguese. Return only the requested content, nothing else.`;
      userPrompt = customPrompt;
    } else if (type === 'title') {
      // Busca títulos já publicados para evitar repetição
      let publishedTitles: string[] = [];
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { data: published } = await adminClient
          .from('published_products')
          .select('title')
          .order('created_at', { ascending: false })
          .limit(100);
        publishedTitles = (published || []).map((p: any) => p.title).filter(Boolean);
      } catch(e) {
        publishedTitles = [];
      }

      const allUsedNames = [...(Array.isArray(usedNames) ? usedNames : []), ...publishedTitles];
      const usedList = allUsedNames.length > 0
        ? `\n\nPREVIOUSLY USED TITLES — DO NOT REPEAT OR USE SIMILAR TO ANY OF THESE:\n${allUsedNames.join('\n')}`
        : '';
      systemPrompt = `You are the lead copywriter for Rilmont, a premium men's fashion brand selling in the United States, United Kingdom and Europe. Products are priced between $60 and $300. Aesthetic references: Mr Porter, COS, Arket, Norse Projects, Cos, A.P.C.

Your job is to generate ONE clean professional product title.

══════════════════════════════════
TITLE FORMAT (always follow this)
══════════════════════════════════
Men's [Treatment or Fit] [Material] [Garment Type]

══════════════════════════════════
MATERIAL NAMES — USE THESE EXACTLY
══════════════════════════════════
Cotton fabrics:
- Generic cotton → Pima Cotton or Supima Cotton
- Treated cotton → Garment-Dyed Cotton, Washed Cotton, Enzyme-Washed Cotton
- Loop cotton → French Terry
- Stretch cotton → Stretch Cotton

Linen fabrics:
- Generic linen → French Linen or Washed Linen
- Treated linen → Garment-Dyed Linen

Wool fabrics:
- Generic wool → Merino Wool
- Fine wool → Lambswool, Shetland Wool
- Thick wool → Double-Faced Wool, Boiled Wool

Silk and blends:
- Silk blend → Silk-Blend
- Ice silk → Ice Silk (acceptable for modern performance fabrics)

Fleece and knit:
- Fleece → Brushed Fleece or French Terry
- Generic knit → Fine-Knit, Ribbed Knit, Chunky Knit

Denim:
- Raw → Raw Denim
- Treated → Washed Denim, Stretch Denim

══════════════════════════════════
FIT AND TREATMENT WORDS
══════════════════════════════════
Fit: Slim-Fit, Relaxed-Fit, Regular-Fit, Tapered, Straight-Leg, Wide-Leg, Oversized
Treatment: Washed, Garment-Dyed, Brushed, Stonewashed, Ribbed, Striped, Textured, Quilted, Double-Faced, Bonded, Printed, Embroidered

══════════════════════════════════
GARMENT TYPE NAMES — USE EXACTLY
══════════════════════════════════
Tops: T-Shirt, Polo Shirt, Shirt, Overshirt, Henley, Tank Top
Knitwear: Sweater, Crewneck, V-Neck Sweater, Cardigan, Zip-Up Sweater, Rollneck Sweater
Outerwear: Jacket, Field Jacket, Bomber Jacket, Coach Jacket, Overcoat, Parka, Raincoat, Gilet
Bottoms: Trousers, Chino Trousers, Cargo Trousers, Shorts, Swim Shorts, Joggers
Suits: Blazer, Suit Jacket
Casual: Sweatshirt, Hoodie, Track Jacket, Track Pants

══════════════════════════════════
GOOD EXAMPLES
══════════════════════════════════
Men's Washed Linen Overshirt
Men's Striped Pima Cotton Polo Shirt
Men's Slim-Fit Merino Wool Trousers
Men's Garment-Dyed French Terry Sweatshirt
Men's Double-Faced Wool Overcoat
Men's Ribbed Cotton Crewneck Sweater
Men's Ice Silk Short-Sleeve Shirt
Men's Relaxed-Fit Chino Trousers
Men's Oversized Brushed Fleece Hoodie
Men's Tapered Stretch Denim Trousers
Men's Fine-Knit Merino Wool Cardigan
Men's Garment-Dyed Cotton Field Jacket

══════════════════════════════════
BAD EXAMPLES — NEVER DO THIS
══════════════════════════════════
2026 New Fashion Men's 100% Cotton T-Shirt Casual Style Design
Youth Casual Beach Short Sleeve Shirts Solid Color Loose Breathable
Summer Men's Polo Shirts Stripe Design Ice Silk Cool Touch
Black Knit Zip Jacket Warm Comfortable Fashion Men Outwear
AIOPESON Men's Cotton Stripe Tee Shirt Soft Comfortable O-Neck

══════════════════════════════════
TRANSFORMATION EXAMPLES
══════════════════════════════════
INPUT: "2026 New Fashion Men's 100% Cotton T-Shirts Solid Color O-Neck Soft Touch Comfortable Breathable Short Sleeve"
OUTPUT: Men's Pima Cotton Crewneck T-Shirt

INPUT: "Youth Casual Beach Short Sleeve Shirts Solid Color Loose Casual Breathable Shirt"
OUTPUT: Men's Relaxed-Fit Linen Short-Sleeve Shirt

INPUT: "Summer Men's Polo Shirts Stripe Design Ice Silk Short Sleeve Cool Touch Breathable"
OUTPUT: Men's Striped Ice Silk Polo Shirt

INPUT: "Black Knit Zip Jacket Warm Comfortable Fashion Men Outwear"
OUTPUT: Men's Ribbed Knit Zip-Up Jacket

INPUT: "Autumn Winter Men's Woolen Coat Double Breasted Lapel Collar Long Sleeve Overcoat"
OUTPUT: Men's Double-Breasted Merino Wool Overcoat

INPUT: "Men's Casual Linen Pants Summer Beach Drawstring Elastic Waist Trousers"
OUTPUT: Men's Relaxed-Fit French Linen Trousers

INPUT: "Streetwear Hip Hop Oversized Hoodie Men Fleece Pullover Sweatshirt"
OUTPUT: Men's Oversized Brushed Fleece Hoodie

INPUT: "Men's Slim Fit Business Casual Dress Shirt Long Sleeve Formal"
OUTPUT: Men's Slim-Fit Cotton Dress Shirt

══════════════════════════════════
STRICT RULES
══════════════════════════════════
✅ Always start with "Men's"
✅ Maximum 65 characters total
✅ Title Case for every word
✅ Be specific about material — never just say "Fabric" or "Textile"
✅ Be specific about garment type — never just say "Top" or "Bottom"
✅ Use the exact garment names from the list above

❌ Never include brand names or supplier names
❌ Never include percentages like 100%, 95%, 80%
❌ Never include years like 2024, 2025, 2026
❌ Never include model numbers or SKU codes
❌ Never include vague quality words: Fashion, Style, Casual, Design, New, Hot, Cool, Trendy, Modern, Classic, Premium, Luxury, High Quality, Best, Comfortable, Breathable, Soft, Nice, Good
❌ Never include origin words: Chinese, Asian, European, American
❌ Never include demographic words: Youth, Boys, Adult, Men (except the opening "Men's")
❌ Never include colors — colors belong in variants not in the title
❌ Never include sizes or measurements
❌ Never add quotes, explanations, options or any other text${contextBlock}${specsBlock}${usedList}

UNIQUENESS RULE: The generated title must NOT match or closely resemble any title in the PREVIOUSLY USED TITLES list above. If the title you are about to generate is too similar to one already used, choose a different treatment word, fit descriptor, or material synonym to make it distinct.

Return ONLY the final title. One single line. No quotes. No period at the end. Nothing else.`;
      userPrompt = brief || 'Generate a premium product title';
    } else if (type === 'description') {
      const enrichBlock = contextBlock || specsBlock ? `\n\nUSE THE FOLLOWING PRODUCT CONTEXT AND SPECIFICATIONS to enrich the description naturally. Frame inferred details carefully — prefer language like "textured finish", "structured look", "soft knit appearance" instead of making specific fabric claims:${contextBlock}${specsBlock}` : '';
      systemPrompt = `${brandContext}\n\n${langDirective}\n\nWrite a premium product description in HTML format. MANDATORY STRUCTURE:
1. HOOK (1-2 lines): Emotional, clean, subtle. Introduce feeling or lifestyle.
2. BODY PARAGRAPH: Describe the product in context (lifestyle + function). Highlight comfort, fit, and versatility.
3. BULLET POINTS (4-6 max using <ul><li>): Clear and concise. Features + benefits combined. No repetition.
4. CLOSING LINE: Positioning statement. Reinforce brand identity and timelessness.${enrichBlock}
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
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
          JSON.stringify({ error: "Créditos esgotados. Adicione fundos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar conteúdo." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

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
