---
name: Image Studio
description: Independent visual creation tool — no coupling to products, drafts, Shopify, stores, markets or publish flow
type: feature
---
Image Studio is a standalone tool. It must NEVER reference draft_id, product_id, shopify_connection_id, store_id, market_id, publish flow, product media or product workspace.

Owns its own entities:
- visual_projects, image_sessions (visual_dna jsonb, seed_base, anchor_image_id), studio_images (parent_image_id, branch_id, role, status, approved), studio_presets (style|pack, is_system flag).

Storage bucket: `studio-images` (public read by design — RLS restricts upload/update/delete to `auth.uid()/...` folder). Public listing is intentional — internal Studio gallery enumerates user images.

Edge function: `studio-generate` validates JWT + project/session ownership, builds final prompt via buildStudioPrompt (locks: style/product/background/model/useAnchor/useSeedFamily, mode hints, preset config, aspect ratio, negative prompt). Uses Gemini gemini-2.5-flash-image. Anchor reference fetched from session.anchor_image_id or parent_image_id and re-injected as inlineData (8KB chunked btoa).

UI: 3-column premium layout (Flow / Canvas / Controls). Mobile uses tabs with sticky Generate button.
