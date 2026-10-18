# Render content at runtime; hydrate islands

Content must eventually publish independently of app deployment. Remix renders
through an async content loader; public HTML gets a 60-second edge TTL, browser
revalidation, and a page cache tag. Future CMX publication can purge tagged HTML.

Only interactive entries ship to the browser; content/layout modules stay server-only.
Build-time HTML would couple content to app deployments. The spike uses a bundled
fixture and tests loader updates in-process; hosted CMX and invalidation come later.
