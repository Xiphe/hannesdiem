import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CmxNode } from '@cmx-tools/contracts'
import { loadContent, contentRoutes } from '../app/content.ts'
import { createApp, legacyRedirects } from '../app/router.tsx'

async function publication(title:string,paragraph:string) {
  const page=structuredClone(await loadContent(new Request('https://example.com/linktree')))
  page.key='test-publication'
  page.route=undefined
  page.document.content.title=title
  page.document.content.default={type:'element',tag:'article',children:[{type:'element',tag:'h1',children:[title]},{type:'element',tag:'p',children:[paragraph]}]} satisfies CmxNode
  return page
}
test('content publications change without rebuilding or recreating the app',async()=>{
  let title='First publication'
  const app=createApp(async()=>publication(title,'A complete article.'))
  const first=await app.fetch('https://example.com/publication')
  assert.equal(first.headers.get('Cloudflare-CDN-Cache-Control'),'public, max-age=60, stale-if-error=0')
  assert.equal(first.headers.get('Cache-Control'),'no-cache')
  assert.equal(first.headers.get('Cache-Tag'),'page:test-publication')
  assert.match(await first.text(),/First publication/)
  title='Updated publication'
  const second=await app.fetch('https://example.com/publication')
  const html=await second.text()
  assert.match(html,/Updated publication/)
  assert.doesNotMatch(html,/First publication/)
})
test('content strings are escaped before becoming HTML',async()=>{
  const app=createApp(async()=>publication('<script>alert(1)</script>','<img src=x onerror=alert(1)>'))
  const html=await(await app.fetch('https://example.com/publication')).text()
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>|<img src=x/)
  assert.match(html,/&lt;script&gt;/)
})
test('all 34 migrated routes render CMX and keep public responses unpersonalized',async()=>{
  assert.equal(contentRoutes.length,34)
  const app=createApp()
  for(const route of contentRoutes){
    const response=await app.fetch(`https://example.com${route.path}`)
    assert.equal(response.status,200,route.path)
    assert.equal(response.headers.get('Set-Cookie'),null,route.path)
    assert.equal(response.headers.get('Cache-Tag'),`page:${route.document}`,route.path)
    const html=await response.text()
    assert.ok(html.includes(route.title.replaceAll('&','&amp;').replaceAll('<','&lt;')),route.path)
    assert.match(html,/<style data-rmx-style/)
    assert.doesNotMatch(html,/\[object Object\]|Count:|data-rmx-key="example-counter"/)
    if(route.kind==='release')assert.match(html,/data-rmx-target="overlay"/)
  }
})
test('missing routes, health, and personalized navigation are uncached',async()=>{
  const app=createApp()
  for(const path of ['/missing','/health','/nav','/_overlay']){
    const response=await app.fetch(`https://example.com${path}`)
    assert.equal(response.headers.get('Cache-Control'),'no-store',path)
    assert.equal(response.headers.get('Cloudflare-CDN-Cache-Control'),null,path)
    assert.equal(response.headers.get('Cache-Tag'),null,path)
    if(path==='/missing'){assert.equal(response.status,404);assert.match(await response.text(),/Page Not Found/)}
    if(path==='/health')assert.deepEqual(await response.json(),{ok:true})
    if(path==='/nav')assert.match(await response.text(),/Let’s stay in touch/)
  }
})
test('legacy aliases and direct modal URLs keep their redirects',async()=>{
  const app=createApp()
  for(const[path,expected]of legacyRedirects){
    const response=await app.fetch(`https://example.com${path}`)
    assert.equal(response.status,expected.status,path)
    assert.equal(response.headers.get('Location'),expected.to,path)
  }
  const song=contentRoutes.find(route=>route.kind==='song')!
  const direct=await app.fetch(`https://example.com/m${song.path}`)
  assert.equal(direct.status,307)
  assert.equal(direct.headers.get('Location'),song.path)
  const modal=await app.fetch(new Request(`https://example.com/m${song.path}`,{headers:{'X-Remix-Frame':'true','X-Remix-Target':'overlay'}}))
  assert.equal(modal.status,200)
  const html=await modal.text()
  assert.match(html,/Close lyrics/)
  assert.doesNotMatch(html,/<html/)
})
