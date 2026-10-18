# Publish media and metadata independently of the website

Keep originals in Git LFS; preprocessing emits immutable responsive images on R2 plus dimensions, alt text, focal points, average color, and palettes. CMX references image identities; Remix chooses sizes/loading. This temporary same-repo pipeline will move alongside hosted content without making image processing a website/runtime responsibility.

Use the legacy `node-vibrant` algorithm as an Actions-only dependency to preserve colors. Save palettes keyed by original-byte hash. Local builds reuse saved metadata and fall back to the default theme for new/unprocessed images; extraction need not be available locally. Derive page themes server-side from metadata and preserve existing named theme overrides.
