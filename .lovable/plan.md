

## Update Image Generation Model

### What changes

Switch the image generation model from `google/gemini-2.5-flash-image` to `google/gemini-3.1-flash-image-preview` (Nano Banana 2) in the existing edge function. No API key changes needed — the Lovable AI Gateway already supports this model via `LOVABLE_API_KEY`.

**Important**: No need for `@google/generative-ai` npm package or a separate `GOOGLE_API_KEY`. The Lovable AI Gateway handles everything with the existing `LOVABLE_API_KEY`.

### File: `supabase/functions/generate-image/index.ts`

**Single change** — update the model name on line ~93:

```
model: 'google/gemini-2.5-flash-image'
```
→
```
model: 'google/gemini-3.1-flash-image-preview'
```

Everything else (prompt structure, reference image support, angle suffixes, auth, error handling) stays exactly the same — the API format is identical between models.

### Why this is simple

The current function already:
- Uses the Lovable AI Gateway (`ai.gateway.lovable.dev`)
- Sends `modalities: ['image', 'text']`
- Supports reference images via `image_url` in message content
- Handles all error codes (429, 402, etc.)

The only difference is the model identifier. Nano Banana 2 produces higher quality images with the same API interface.

### No other changes needed

- No new secrets required
- No new dependencies
- No config.toml changes
- Frontend code unchanged

