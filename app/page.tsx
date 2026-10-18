import { clientEntry, type Handle, type RemixNode } from 'remix/component'
import assets from '../.generated/assets.json' with { type:'json' }
import { Chrome as ChromeComponent } from './chrome.tsx'
import { Footer } from './navigation.tsx'
import { contentTheme, type ContentRoute } from './content.ts'
import { getMedia } from './media.ts'
import { themeCss } from './theme.ts'
import shareImages from '../.generated/og.json' with { type:'json' }
const Chrome = clientEntry(assets.chrome + '#Chrome', ChromeComponent)
export function Page(handle:Handle<{title:string;body:RemixNode;route?:ContentRoute;path?:string;noindex?:boolean;plain?:boolean}>) {
  return () => {
    const { title,body,route,path='/',noindex,plain }=handle.props
    const canonical = `https://hannesdiem.de${path}`
    const image = shareImages[path as keyof typeof shareImages] ?? (route?.image ? getMedia(route.image) : undefined)
    const pageTitle = route?.title ?? title
    const documentTitle = pageTitle === 'Hannes Diem' ? pageTitle : `${pageTitle} • Hannes Diem`
    return <html lang="en"><head>
      <meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>{documentTitle}</title><link rel="canonical" href={canonical}/>
      {route?.description && <meta name="description" content={route.description}/>}
      {(noindex||route?.noindex) && <meta name="robots" content={route?.nofollow?'noindex,nofollow':'noindex,follow'}/>}
      <meta property="og:site_name" content="Hannes Diem"/><meta property="og:title" content={route?.ogTitle??pageTitle}/><meta property="og:url" content={canonical}/>
      <meta property="og:type" content={route?.ogType??'website'}/>
      {route?.profile&&<><meta property="profile:first_name" content={route.profile.firstName}/><meta property="profile:last_name" content={route.profile.lastName}/></>}
      {route?.musicians?.map(url=><meta property="music:musician" content={url}/>)}
      {route?.songs?.map(url=><meta property="music:song" content={url}/>)}
      {route?.description && <meta property="og:description" content={route.description}/>}
      {image && <><meta property="og:image" content={new URL(image.src,'https://hannesdiem.de').href}/><meta property="og:image:width" content={String(image.width)}/><meta property="og:image:height" content={String(image.height)}/><meta property="og:image:alt" content={image.alt??''}/></>}
      <meta name="twitter:card" content="summary_large_image"/>
      <link rel="icon" href={assets.mark} type="image/svg+xml"/><link rel="stylesheet" href={assets.style}/>
      <style>{themeCss(contentTheme(route))}</style><script type="module" src={assets.entry}></script>
    </head><body>{!plain&&<Chrome path={path}/>}<main id="content">{body}</main>{!plain&&<Footer/>}</body></html>
  }
}
