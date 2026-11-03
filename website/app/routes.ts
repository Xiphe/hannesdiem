import { get, route } from 'remix/routes'
export const routes = route({
  health: get('/health'),
  contact: get('/_contact'),
  contactFile: get('/_contact.vcf'),
  emptyOverlay: get('/_overlay'),
  songOverlay: get('/m/*path'),
  sitemap: get('/sitemap.xml'),
  robots: get('/robots.txt'),
  content: get('/*path'),
})
