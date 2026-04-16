# Memory: index.md
Updated: now

# Project Memory

## Core
UI language is Portuguese (Brazil). White premium theme (light default), dark mode available.
Registration disabled, use only email/password (no social login).
Shopify publish updates: use `PUT` with `shopify_product_id`, fallback to `POST` on 404.
Gemini API: Base64 'inlineData' must be processed in 8KB chunks to prevent max call stack size.
Data sync: prioritize backend images on reconciliation. Ignore Postgres 23505 (unique constraint violation).

## Memories
- [AI Field Controls](mem://features/ai-field-controls) — Step 2 Title/Desc AI generation and SEO metadata context
- [Image Optimization](mem://features/image-optimization-publish) — Optional Step 4 WebP conversion with high/balanced/max presets
- [Session Management](mem://auth/session-management) — Auto redirect to login on expiry/invalid refresh token
- [Shopify Strategy](mem://architecture/shopify-publish-strategy) — Prioritize manual image over AI cover, auto-link variant images, translate options
- [Product Understanding](mem://ai/product-understanding) — Regex visual classification (Blazer vs Sweater vs Knit Jacket vs Cardigan)
- [Gallery Management](mem://features/image-gallery-management) — Cumulative Step 1 gallery, persistent deletions synced in real-time
- [Variant Bulk Edit](mem://features/variant-management-bulk) — Step 3 variant bulk edit, visual color cards linked to generated images
- [History Management](mem://features/publication-history-management) — Product history view/edit, PUT update with POST fallback on 404
- [Store Settings](mem://ui/store-management-settings) — Store header selector, custom logo, Country/Lang/Currency config
- [Gemini Integration](mem://ai/unified-gemini-integration) — Direct Gemini API, 8KB base64 chunks, gemini-3.1-flash-image-preview & 2.5-flash
- [Pricing Engine](mem://features/pricing-engine) — Step 3 calculator with margins, shipping, CPA, platform fees, exchange rates
- [Stability & Errors](mem://ui/stability-error-handling) — Dashboard ErrorBoundary, metadata validation, Postgres 23505 ignored
- [Persistent Projects](mem://architecture/persistent-project-system) — Draft autosave, prevent re-adding deleted images, UNIQUE(project_id, url)
- [Prompts Management](mem://features/prompts-management) — Rilmont brand templates (British premium), variables like {product_name}, unique default prompt
- [Draft System](mem://features/wizard-draft-system) — Session storage 'Draft Resume Dialog' valid for 7 days (shown once per session)
- [Generation Presets](mem://features/image-generation-presets) — Step 1 visual presets, custom_presets with RLS, hidden in localStorage
- [Premium Standards](mem://ai/image-generation-premium-standards) — Zara/COS style, 8K editorial, mandatory angle/proportion, no stiff poses
- [Selective Regen](mem://features/image-selective-regeneration) — Per-angle regen in Step 1, uses lastUsedPromptRef if desc empty
- [White Theme](mem://design/white-premium-theme) — Neutral monochrome palette, no blue accent, Shopify/Stripe aesthetic
