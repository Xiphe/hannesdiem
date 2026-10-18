import { createRouter } from 'remix/router'
import { render } from 'remix/middleware/render'
import { css } from 'remix/component'
import { redirect } from 'remix/response/redirect'
import { loadContent, renderContent, contentRoutes, type ContentLoader } from './content.ts'
import { Page } from './page.tsx'
import { Navigation } from './navigation.tsx'
import { getNewsletterState, type NewsletterEnvironment } from './newsletter.ts'
import { routes } from './routes.ts'
import shareImages from '../.generated/og.json' with {type:'json'}

export const legacyRedirects = new Map<string,{to:string;status:307|308}>([
  ['/',{to:'/linktree',status:307}],
  ['/owa',{to:'/one-week-album',status:308}],
  ['/one-week-album-retreat',{to:'/one-week-album',status:308}],
  ['/owa/form',{to:'https://docs.google.com/forms/d/e/1FAIpQLSfOWkJ_24G5sPa694SbLp6jv7JmtDulCLJOwUwtGC5UcDSxJQ/viewform?usp=dialog',status:307}],
  ['/owa/summer-2025',{to:'https://e.pcloud.link/publink/show?code=kZlBJOZQvIgTgpy8TLDaBAVWSJKPmWo2jv7',status:307}],
  ['/cv',{to:'https://docs.google.com/document/d/1LEo6Z-sLCULuJikA1JjbfcQTfP6UavQyjM7DehcMZeQ/edit?usp=sharing',status:307}],
])
const privateHeaders = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}
export function createApp(content:ContentLoader=loadContent,env:NewsletterEnvironment={}) {
  const router=createRouter({middleware:[render()],defaultHandler:()=>new Response('Not found',{status:404,headers:privateHeaders})})
  router.get(routes.health,()=>Response.json({ok:true},{headers:privateHeaders}))
  router.get(routes.emptyOverlay,()=>new Response('',{headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8'}}))
  router.get(routes.navigation,async({request,render})=>{
    const state=await getNewsletterState(request,env)
    const referer=request.headers.get('Referer')
    const sourcePath=new URL(request.url).searchParams.get('from')
    const path=sourcePath?.startsWith('/')&&!sourcePath.startsWith('//')?sourcePath:referer&&new URL(referer).origin===new URL(request.url).origin?new URL(referer).pathname:'/nav'
    const body=<Navigation pathname={path} state={state}/>
    const response=render(request.headers.get('X-Remix-Target')==='overlay'?body:<Page title="Navigation" body={body} path="/nav" noindex plain/>,{headers:privateHeaders})
    const result=await response
    for(const cookie of state.headers.getSetCookie()) result.headers.append('Set-Cookie',cookie)
    return result
  })
  router.get(routes.songOverlay,async({request,params,render})=>{
    const path='/'+params.path
    const page=await content(new Request(new URL(path,request.url)))
    if(page.status===404||page.route?.kind!=='song')return new Response('Not found',{status:404,headers:privateHeaders})
    if(request.headers.get('X-Remix-Target')!=='overlay')return redirect(path,307)
    return render(<div mix={css({display:'flex',minHeight:'100dvh',alignItems:'center',justifyContent:'center',padding:'1rem'})}><div data-overlay-panel mix={css({position:'relative','--letter-bg':'var(--theme-bg)','--letter-fg':'var(--theme-fg)','--letter-heading':'var(--theme-fg)'})}>
      <button type="button" data-close-overlay aria-label="Close lyrics" mix={css({position:'absolute',top:'1rem',right:'1rem',zIndex:10,padding:'.25rem',fontSize:'1.75rem',lineHeight:1,opacity:.5})}>×</button>
      {renderContent(page.document).body}
      <button type="button" data-close-overlay mix={css({position:'absolute',bottom:'1.5rem',left:'50%',transform:'translateX(-50%)',background:'color-mix(in oklab,var(--theme-fg) 5%,transparent)',borderRadius:4,padding:'.25rem .75rem','@media (width >= 48rem)':{display:'none'}})}>← Back</button>
    </div></div>,{headers:privateHeaders})
  })
  router.get(routes.sitemap,()=>new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+contentRoutes.filter(route=>!route.noindex&&route.path!=='/about').map(route=>`<url><loc>https://hannesdiem.de${route.path}</loc>${route.updatedAt?`<lastmod>${new Date(route.updatedAt).toISOString()}</lastmod>`:''}<changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}}))
  router.get(routes.legacyShareImage,({params})=>{
    const kind=params.collection==='hdm-pages'?'page':params.collection==='hdm-songs'?'song':undefined
    const page=kind&&contentRoutes.find(route=>route.kind===kind&&route.sourceId===params.file.replace(/\.png$/,''))
    const image=page&&shareImages[page.path as keyof typeof shareImages]
    return image?redirect(image.src,307):new Response('Not found',{status:404,headers:privateHeaders})
  })
  router.get(routes.robots,()=>new Response('User-agent: *\nAllow: /\nDisallow: /nav\nDisallow: /login\nDisallow: /m/\nSitemap: https://hannesdiem.de/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}}))
  router.get(routes.content,async({request,render})=>{
    const path=new URL(request.url).pathname
    const destination=legacyRedirects.get(path)
    if(destination)return redirect(destination.to,destination.status)
    if(path.endsWith('/')&&path!=='/')return redirect(path.slice(0,-1)+new URL(request.url).search,308)
    const page=await content(request)
    return render(<Page {...renderContent(page.document)} route={page.route} path={path} noindex={page.status===404}/>,{status:page.status,headers:page.status===404?privateHeaders:{
      'Cache-Control':'no-cache','Cloudflare-CDN-Cache-Control':'public, max-age=60, stale-if-error=0','Cache-Tag':`page:${page.key}`,
    }})
  })
  return router
}
