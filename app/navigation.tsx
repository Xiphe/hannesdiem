import { css, type Handle } from 'remix/component'
import assets from '../.generated/assets.json' with { type:'json' }
import routeData from '../content/routes.json' with { type:'json' }
import { ServiceLogo } from './icons.tsx'
import { ChevronDownIcon, XMarkIcon } from './heroicons.tsx'
import { NewsletterArea } from './newsletter-view.tsx'
import type { NewsletterState } from './newsletter.ts'

export const socialLinks = [
  {title:'Twitch',href:'https://www.twitch.tv/hannes_diem',name:'twitch'},
  {title:'YouTube',href:'https://www.youtube.com/@hannes_diem',name:'youtube'},
  {title:'Instagram',href:'https://www.instagram.com/hannes.diem/',name:'instagram'},
  {title:'TikTok',href:'https://www.tiktok.com/@hannes.diem',name:'tiktok'},
]
export const listenLinks = [
  {title:'Spotify',href:'https://open.spotify.com/artist/2eaXfpAkFuTlmu5IsLhxMl',name:'spotify'},
  {title:'Apple Music',href:'https://music.apple.com/us/artist/hannes-diem/377388675',name:'applemusic'},
  {title:'Deezer',href:'https://www.deezer.com/us/artist/533043',name:'deezer'},
  {title:'Amazon Music',href:'https://www.amazon.com/s?k=Hannes+Diem',name:'amazonmusic'},
  {title:'Tidal',href:'https://tidal.com/browse/artist/3711015',name:'tidal'},
  {title:'SoundCloud',href:'https://soundcloud.com/hannesdiem',name:'soundcloud'},
]
export const sections = [
  {name:'Work',items:routeData.filter(route => route.kind === 'release').sort((a,b) => ('releaseDate' in b ? b.releaseDate??'':'').localeCompare('releaseDate' in a ? a.releaseDate??'':'')).map(route=>({name:route.title,href:route.path}))},
  {name:'One Week Album',items:[{name:'About',href:'/one-week-album'},{name:'California 2024 Recap',href:'/one-week-album/california-2024'},{name:'Løkken 2024 Recap',href:'/one-week-album/lokken-2024'}]},
]
const quietLink = css({opacity:.6,'&:hover':{opacity:1}})
export function Brand(handle:Handle<{footer?:boolean}>) {
  return () => <a href="/" mix={css({display:'flex',alignItems:'center',borderRadius:4,...(!handle.props.footer?{height:'1.75rem',paddingRight:'1rem'}:{})})}>
    <img src={assets.mark} alt="" mix={css({height:handle.props.footer?'4rem':'2.5rem',width:handle.props.footer?'1.8rem':'2.5rem',marginLeft:handle.props.footer?0:'-.5rem',marginRight:handle.props.footer?'.75rem':0,marginBottom:handle.props.footer?'.375rem':0})}/>
    <span mix={css({fontSize:handle.props.footer?'1.5rem':'1.25rem',fontWeight:200,...(!handle.props.footer?{lineHeight:'1.75rem'}:{}),color:'var(--theme-fg)'})}>Hannes Diem</span>
  </a>
}
export function SocialLinks(handle:Handle<{listen?:boolean;footer?:boolean}>) {
  return () => <ul aria-label={handle.props.listen?'Find my music':'Connect on social media'} mix={css({display:'flex',flexWrap:'wrap',gap:handle.props.footer?'.75rem':'0 1rem',justifyContent:handle.props.footer?'start':'center',padding:0,listStyle:'none'})}>
    {(handle.props.listen?listenLinks:socialLinks).map(link=><li><a href={link.href} aria-label={link.title} title={link.title} target="_blank" rel="noopener noreferrer" mix={css({display:'inline-flex',padding:'.25rem',borderRadius:4,color:'color-mix(in oklab,var(--theme-fg) 40%,transparent)','&:hover':{color:'var(--theme-fg)'}})}>
      <ServiceLogo name={link.name} style={{width:handle.props.listen?(handle.props.footer?'5.5rem':'6.5rem'):(handle.props.footer?'1.25rem':'1.5rem'),height:handle.props.listen?(handle.props.footer?'1.75rem':'2rem'):(handle.props.footer?'1.25rem':'1.5rem')}}/>
    </a></li>)}
  </ul>
}
const navStyle = css({display:'flex',height:'100%',minHeight:'100dvh',flexDirection:'column',overflowY:'auto',padding:'1rem',background:'color-mix(in oklab,var(--theme-contrast) 70%,transparent)',boxShadow:'0 20px 25px -5px rgb(0 0 0 / .1)',backdropFilter:'blur(40px)','@media (prefers-color-scheme: dark)':{background:'color-mix(in oklab,var(--theme-contrast) 90%,transparent)'},
 '& summary':{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'1.125rem',lineHeight:'1.75rem',fontWeight:500,padding:'.25rem .25rem .25rem .75rem',borderRadius:4,listStyle:'none'},'& summary::-webkit-details-marker':{display:'none'},'& .nav-chevron':{width:'1.25rem',height:'1.25rem',margin:'.125rem',color:'color-mix(in oklab,var(--theme-fg) 40%,transparent)',transition:'transform 150ms ease'},'& details[open] .nav-chevron':{transform:'rotate(180deg)'},'& details':{paddingBlock:'.25rem'},'& details+details':{borderTop:'1px solid color-mix(in oklab,var(--theme-fg) 10%,transparent)'},'& .nav-items li+li':{marginTop:'.25rem'},'& summary:hover,& .nav-item:hover':{background:'color-mix(in oklab,var(--theme-fg) 5%,transparent)'},'& .nav-item':{display:'block',padding:'.5rem .75rem .5rem 1.5rem',borderRadius:4,color:'color-mix(in oklab,var(--theme-fg) 70%,transparent)'},'& [aria-current=page]':{fontWeight:500,color:'var(--theme-primary)'}})
export function Navigation(handle:Handle<{pathname:string;state:NewsletterState;lazy?:boolean}>) {
  return () => <div mix={css({display:'flex',minHeight:'100dvh',justifyContent:'end'})}><div data-overlay-panel data-navigation-panel mix={css({width:'100vw',maxWidth:'28rem'})}>
    <div class="navigation-menu" mix={navStyle}>
      <div mix={css({display:'flex',alignItems:'center',justifyContent:'space-between'})}><Brand/><button type="button" command="request-close" commandFor="site-navigation" aria-label="Close navigation" mix={css({display:'inline-flex',padding:'.25rem',borderRadius:'.375rem',color:'color-mix(in oklab,var(--theme-fg) 40%,transparent)','&:hover':{color:'var(--theme-fg)'}})}><XMarkIcon width={24} height={24}/></button></div>
      <nav aria-label="Main Navigation" mix={css({display:'flex',flex:1,flexDirection:'column',marginTop:'1.5rem'})}>
        {sections.map(section=><details open={section.items.some(item=>handle.props.pathname.startsWith(item.href))}><summary><span>{section.name}</span><ChevronDownIcon class="nav-chevron"/></summary><ul class="nav-items" mix={css({paddingBlock:'.5rem'})}>{section.items.map(item=><li><a class="nav-item" href={item.href} aria-current={handle.props.pathname===item.href?'page':undefined}>{item.name}</a></li>)}</ul></details>)}
        <div mix={css({flexGrow:1,minHeight:'5rem'})}/><NewsletterArea state={handle.props.state} lazy={handle.props.lazy}/><div mix={css({marginBottom:'.5rem'})}><SocialLinks/></div><div mix={css({marginBottom:'1rem'})}><SocialLinks listen/></div>
      </nav>
    </div>
  </div></div>
}
export function NavigationDialog(handle:Handle<{pathname:string}>) {
  return () => <dialog id="site-navigation" data-navigation-dialog class="page-dialog" aria-label="Navigation" mix={css({position:'fixed',inset:0,width:'100vw',maxWidth:'none',height:'100dvh',maxHeight:'none',margin:0,padding:0,background:'transparent',color:'var(--theme-fg)',border:0,overflowY:'auto','&:not([open])':{display:'none'},'&::backdrop':{background:'color-mix(in oklab,var(--theme-bg) 30%,transparent)',backdropFilter:'blur(4px)'}})}>
    <Navigation pathname={handle.props.pathname} state={{ready:false}} lazy/>
  </dialog>
}
export function Footer() {
  return () => <footer mix={css({maxWidth:'80rem',marginInline:'auto',padding:'4rem 1.5rem 2rem'})}>
    <div mix={css({display:'flex',flexDirection:'column',gap:'1.5rem',paddingTop:'1.5rem'})}><Brand footer/>
      <nav aria-label="Site Navigation" mix={css({marginBottom:'2.5rem'})}>
        <div mix={css({display:'flex',flexWrap:'wrap',gap:'2rem 4rem'})}>{[...sections,{name:'Legal',items:[{name:'Imprint',href:'/imprint'},{name:'Privacy',href:'/privacy'}]}].map(section=><div>
          <h3 mix={css({marginBottom:'.5rem',fontSize:'.75rem',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',opacity:.4})}>{section.name}</h3>
          <ul mix={css({display:'flex',flexDirection:'column',gap:'.25rem'})}>{section.items.map(item=><li><a href={item.href} mix={[quietLink,css({fontSize:'.875rem',borderRadius:4})]}>{item.name}</a></li>)}</ul>
        </div>)}</div>
        <div mix={css({display:'flex',flexWrap:'wrap',alignItems:'center',gap:'1rem 2rem',marginTop:'2rem'})}><SocialLinks footer/><SocialLinks footer listen/></div>
      </nav>
    </div>
  </footer>
}
