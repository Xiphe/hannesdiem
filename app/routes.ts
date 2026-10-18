import { get, route } from 'remix/routes'
export const routes = route({
  health:get('/health'),
  emptyOverlay:get('/_overlay'),
  navigation:get('/nav'),
  songOverlay:get('/m/*path'),
  sitemap:get('/sitemap.xml'),
  robots:get('/robots.txt'),
  legacyShareImage:get('/og-image/:collection/:file'),
  content:get('/*path'),
})
