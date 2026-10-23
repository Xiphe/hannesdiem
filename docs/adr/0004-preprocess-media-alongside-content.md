# Publish media and metadata independently of the website

Keep originals in Git LFS; preprocessing emits immutable responsive images on R2 plus dimensions, alt text, focal points, average color, and palettes. CMX image imports carry this metadata; Remix chooses sizes/loading. This temporary same-repo pipeline will move alongside hosted content without making image processing a website/runtime responsibility.

Use the legacy `node-vibrant` algorithm inside the image loader for both local and CI builds to preserve colors. CMX caches the complete image object, including average color and palette, so separate palette files and extraction caches are unnecessary. Keep extraction a content build dependency. Derive page themes server-side from the returned metadata and preserve existing named theme overrides.
