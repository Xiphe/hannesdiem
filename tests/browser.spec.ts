import { expect,test,type BrowserContext } from '@playwright/test'
import mediaFiles from '../.generated/media-files.json' with {type:'json'}
import media from '../.generated/media.json' with {type:'json'}

async function mockRemoteMedia(context:BrowserContext){
  const first=Object.values(media)[0]
  if(!first.src.startsWith('https://'))return
  const origin=new URL(first.src).origin
  for(const file of mediaFiles){await context.route(`${origin}/${file.key}`,route=>route.fulfill({path:file.path,contentType:file.contentType}))}
}
test.beforeEach(async({context,page})=>{
  await mockRemoteMedia(context)
  await page.route('**/login',route=>route.request().method()==='GET'
    ? route.fulfill({contentType:'application/json',body:JSON.stringify({ready:true,csrfToken:'test-csrf'})})
    : route.fallback())
})
for(const path of ['/linktree','/one-week-album','/hoffnung','/song/alles-brennt']){
  test(`${path} renders content and styles without JavaScript`,async({browser,baseURL})=>{
    const context=await browser.newContext({javaScriptEnabled:false,baseURL})
    await mockRemoteMedia(context)
    try{
      const page=await context.newPage()
      const response=await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator('main')).not.toBeEmpty()
      expect(await page.locator('style[data-rmx-style]').count()).toBeGreaterThan(0)
      if(path==='/linktree')await expect(page.getByText("Hi I'm Hannes",{exact:false})).toBeVisible()
      if(path==='/hoffnung')await expect(page.locator('h1')).toHaveText('Hoffnung')
      if(path==='/one-week-album')await expect(page.locator('header img')).toBeVisible()
      if(path.startsWith('/song/'))await expect(page.locator('h1')).toHaveText('Alles Brennt')
    }finally{await context.close()}
  })
}
test('menu opens as a native dialog without changing static page DOM',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/one-week-album',{waitUntil:'networkidle'})
  await page.evaluate(()=>{
    const root=document.querySelector('main')!
    Object.assign(window,{staticRoot:root,mutations:0})
    new MutationObserver(records=>{(window as any).mutations+=records.length}).observe(root,{childList:true,subtree:true,attributes:true,characterData:true})
  })
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading',{name:'Let’s stay in touch.'})).toBeVisible()
  await page.getByRole('dialog').getByText('Work',{exact:true}).click()
  await expect(page.getByRole('dialog').getByRole('link',{name:'Hoffnung',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>({same:(window as any).staticRoot===document.querySelector('main'),mutations:(window as any).mutations}))).toEqual({same:true,mutations:0})
  await page.getByRole('button',{name:'Close navigation'}).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(errors).toEqual([])
})

test('menu opens immediately without a route or state request before opening',async({page})=>{
  let requests=0
  let finish!:()=>void
  const ready=new Promise<void>(resolve=>{finish=resolve})
  await page.route('**/login',async route=>{
    requests++
    await ready
    await route.fulfill({contentType:'application/json',body:JSON.stringify({ready:true,csrfToken:'test-csrf'})})
  })
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  expect(requests).toBe(0)
  const historyLength=await page.evaluate(()=>history.length)
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Navigation',exact:true})
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('link',{name:'Hoffnung',exact:true})).toBeVisible()
  await expect(dialog.getByText('Loading newsletter…')).toBeVisible()
  await expect(page).toHaveURL(/\/halbkreis$/)
  expect(await page.evaluate(()=>history.length)).toBe(historyLength)
  await expect.poll(()=>requests).toBe(1)
  finish()
  await expect(dialog.getByRole('textbox',{name:'Email address'})).toBeEnabled()
  expect(requests).toBe(1)
})

test('server-rendered navigation can open without JavaScript',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false,baseURL})
  try{
    const page=await context.newPage()
    await page.goto('/halbkreis')
    await page.getByRole('button',{name:'Open menu',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'Navigation',exact:true})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('link',{name:'Hoffnung',exact:true})).toBeVisible()
    await expect(dialog.getByRole('link',{name:'Sign up or log in'})).toBeVisible()
    await dialog.getByRole('button',{name:'Close navigation'}).click()
    await expect(dialog).not.toBeVisible()
  }finally{await context.close()}
})
test('release lyrics open over the release, close on Escape, and support direct URLs',async({page})=>{
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  const link=page.locator('a[href="/m/song/alles-brennt"]').first()
  await link.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('h1')).toHaveText('Alles Brennt')
  await expect(page.locator('main h1')).toHaveText('Halbkreis')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await page.goto('/m/song/alles-brennt')
  await expect(page).toHaveURL(/\/song\/alles-brennt$/)
  await expect(page.locator('main h1')).toHaveText('Alles Brennt')
})
for(const width of [360,1280]){
  test(`media decodes and pages fit ${width}px viewport`,async({page})=>{
    await page.setViewportSize({width,height:800})
    for(const path of ['/linktree','/one-week-album','/halbkreis','/song/alles-brennt']){
      await page.goto(path,{waitUntil:'networkidle'})
      const image=page.locator('main img').first()
      if(await image.count()){
        const result=await image.evaluate(async(img:HTMLImageElement)=>{await img.decode();return{src:img.currentSrc,width:img.naturalWidth}})
        expect(result.src).toMatch(/\/images\/.*\.webp$/);expect(result.width).toBeGreaterThan(0)
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
  })
}

test('newsletter signup stays in the sidebar with pending and success feedback',async({page})=>{
  let finish!:()=>void
  let submissions=0
  const responseReady=new Promise<void>(resolve=>{finish=resolve})
  await page.route('**/login',async route=>{
    if(route.request().method()==='GET')return route.fallback()
    expect(route.request().method()).toBe('POST')
    submissions++
    await responseReady
    await route.fulfill({contentType:'application/json',body:JSON.stringify({type:'success',message:'Link sent! Please check your email.'})})
  })
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.evaluate(()=>{(window as any).originalContent=document.querySelector('main')})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  const input=dialog.getByRole('textbox',{name:'Email address'})
  const submit=dialog.getByRole('region',{name:'Newsletter',exact:true}).getByRole('button')
  await expect(submit).toBeEnabled()
  await submit.click()
  expect(await input.evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true)
  await expect(input).toBeEnabled()
  await input.fill('listener@example.org')
  await submit.click()
  await expect(input).toBeDisabled()
  await expect(submit).toBeDisabled()
  finish()
  await expect(dialog.getByText('Link sent! Please check your email.')).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(input).toHaveCount(0)
  await expect(dialog.getByText('Receive updates about new releases')).toHaveCount(0)
  await expect(page).toHaveURL(/\/halbkreis$/)
  expect(await page.evaluate(()=>(window as any).originalContent===document.querySelector('main'))).toBe(true)
  expect(submissions).toBe(1)
})

test('newsletter cooldown and failures preserve the email and allow retry without closing the sidebar',async({page})=>{
  let attempts=0
  await page.route('**/login',async route=>{
    if(route.request().method()==='GET')return route.fallback()
    attempts++
    if(attempts===1)return route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({type:'spam_protection',message:'Please wait before requesting another login token',remainingSeconds:2})})
    if(attempts===2)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({type:'error',message:'Something went wrong. Please try again.'})})
    if(attempts===3)return route.abort('failed')
    return route.fulfill({contentType:'application/json',body:JSON.stringify({type:'success',message:'Link sent! Please check your email.'})})
  })
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  const input=dialog.getByRole('textbox',{name:'Email address'})
  const submit=dialog.getByRole('region',{name:'Newsletter',exact:true}).getByRole('button')
  await expect(input).toBeEnabled()
  await input.fill('listener@example.org')
  await submit.click()
  await expect(input).toBeDisabled()
  await expect(dialog.getByText(/Please wait/)).toBeVisible()
  await expect(submit).toBeEnabled()
  await expect(input).toHaveValue('listener@example.org')
  await submit.click()
  await expect(dialog.getByText('Something went wrong. Please try again.')).toBeVisible()
  await expect(input).toHaveValue('listener@example.org')
  await submit.click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(input).toHaveValue('listener@example.org')
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(dialog.getByText('Link sent! Please check your email.')).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('newsletter logout stays inline and refreshes the anonymous signup session',async({page})=>{
  let authenticated=true
  await page.route('**/logout',route=>{authenticated=false;return route.fulfill({contentType:'application/json',body:JSON.stringify({type:'success',message:'Logged out successfully'})})})
  await page.route('**/login',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(authenticated?{ready:true,email:'listener@example.org',csrfToken:'test-csrf'}:{ready:true,csrfToken:'fresh-csrf'})}))
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await dialog.getByRole('button',{name:'Logout'}).click()
  await expect(dialog.getByText('Logged out successfully')).toBeVisible()
  await expect(dialog.getByRole('textbox',{name:'Email address'})).toBeEnabled()
  await expect(dialog.locator('input[name="_csrf"]')).toHaveValue('fresh-csrf')
  await expect(dialog).toBeVisible()
})

test('email confirmation shows a welcome notice once after the home redirect',async({page})=>{
  await page.goto('/?login_success=true')
  await expect(page.getByRole('status')).toHaveText('Welcome! You are now logged in.')
  await expect(page).toHaveURL(/\/linktree$/)
  await page.reload()
  await expect(page.getByText('Welcome! You are now logged in.')).toHaveCount(0)
})
test('navigation follows content links, renders 404, and serves app assets',async({page,request})=>{
  await page.goto('/linktree',{waitUntil:'networkidle'})
  const mark=await page.locator('link[rel=icon]').getAttribute('href')
  const asset=await request.get(mark!);expect(asset.status()).toBe(200);expect(asset.headers()['content-type']).toMatch(/image\/svg/)
  await page.getByRole('link',{name:'Hoffnung',exact:true}).click()
  await expect(page.locator('main h1')).toHaveText('Hoffnung')
  const response=await page.goto('/missing-migrated-route')
  expect(response?.status()).toBe(404);expect(response?.headers()['cache-control']).toBe('no-store')
  await expect(page.locator('h1')).toHaveText('404 - Page Not Found')
})

test('Amazon Music logos preserve the open letter shapes with sizing styles',async({page})=>{
  for(const path of ['/linktree','/halbkreis']){
    await page.goto(path)
    const logo=page.locator('main svg[aria-label="Amazon Music"]')
    await expect(logo).toBeVisible()
    const filled=await logo.locator('path').nth(5).evaluate((letter:SVGPathElement)=>letter.isPointInFill(new DOMPoint(12,32)))
    expect(filled,`The hole in Amazon’s first “a” must remain open on ${path}`).toBe(false)
  }
})

for(const width of [360,1280]){
  test(`lower sidebar retains the newsletter card and compact logo rows at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000})
    await page.goto('/halbkreis',{waitUntil:'networkidle'})
    await page.getByRole('button',{name:'Open menu',exact:true}).click()
    const dialog=page.getByRole('dialog')
    const newsletter=dialog.getByRole('region',{name:'Newsletter',exact:true})
    await expect(newsletter).toBeVisible()
    const card=await newsletter.evaluate(el=>({border:parseFloat(getComputedStyle(el).borderTopWidth),radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),icons:el.querySelectorAll('li svg').length}))
    expect(card.border).toBeGreaterThanOrEqual(1)
    expect(card.radius).toBe(12)
    expect(card.icons).toBe(2)
    await expect(newsletter.getByRole('textbox',{name:'Email address'})).toBeEnabled()
    const gap=await newsletter.evaluate(el=>{
      const input=el.querySelector('input[type=email]')!.getBoundingClientRect()
      const button=el.querySelector('button[type=submit]')!.getBoundingClientRect()
      return button.left-input.right
    })
    expect(Math.abs(gap)).toBeLessThanOrEqual(1)
    const music=dialog.getByRole('list',{name:'Find my music'})
    expect(await music.evaluate(el=>getComputedStyle(el).rowGap)).toBe('0px')
    const spotify=await music.getByRole('link',{name:'Spotify',exact:true}).boundingBox()
    const amazon=await music.getByRole('link',{name:'Amazon Music',exact:true}).boundingBox()
    expect(amazon!.y-spotify!.y).toBeLessThanOrEqual(48)
  })
}

for(const width of [360,1280,2732]){
  test(`OWA portraits overlap their biography headlines at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900})
    await page.goto('/one-week-album')
    const about=page.locator('section').filter({has:page.getByRole('heading',{name:'About us',exact:true})})
    for(const [index,name] of ['Hannes','Roxanna'].entries()){
      const portrait=about.locator('img').nth(index)
      await portrait.scrollIntoViewIfNeeded()
      await portrait.evaluate((img:HTMLImageElement)=>img.decode())
      const image=await portrait.boundingBox()
      const headline=about.getByRole('heading',{name,exact:true})
      const heading=await headline.boundingBox()
      const card=await headline.locator('..').boundingBox()
      expect(image!.width).toBeGreaterThan(250)
      const overlap=image!.y+image!.height-heading!.y
      expect(overlap).toBeGreaterThanOrEqual(20)
      expect(overlap).toBeLessThanOrEqual(28)
      expect(Math.abs(image!.x+image!.width/2-card!.x-card!.width/2)).toBeLessThan(2)
    }
  })
}

test('outside clicks close overlays and local menu navigation adds no menu history entry',async({page})=>{
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(20,400)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('link',{name:'Hoffnung',exact:true}).click()
  await expect(page.locator('main h1')).toHaveText('Hoffnung')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await expect(page.locator('main h1')).toHaveText('Halbkreis')
  expect((await page.goto('/nav'))?.status()).toBe(404)
})

test('sidebar keeps the original header and menu item spacing with SVG controls',async({page})=>{
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  const close=dialog.getByRole('button',{name:'Close navigation'})
  await expect(close.locator('svg')).toBeVisible()
  expect((await close.locator('..').boundingBox())!.height).toBe(32)
  const work=dialog.locator('summary').filter({hasText:'Work'})
  await expect(work.locator('svg')).toBeVisible()
  const first=await dialog.getByRole('link',{name:'Hoffnung',exact:true}).boundingBox()
  const second=await dialog.getByRole('link',{name:'Resolve Yourself',exact:true}).boundingBox()
  expect(second!.y-first!.y-first!.height).toBe(4)
})

test('sidebar slides and sections animate open and closed',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  const panel=dialog.locator('[data-navigation-panel]')
  await expect(panel).toBeVisible()
  expect(await panel.evaluate(el=>el.getAnimations().some(animation=>animation.effect?.getTiming().duration===300))).toBe(true)
  await expect.poll(()=>panel.evaluate(el=>el.getAnimations().length)).toBe(0)
  const work=dialog.locator('details').filter({hasText:'Halbkreis'})
  const expanded=(await work.boundingBox())!.height
  await work.locator('summary').click()
  await expect.poll(async()=>{const height=(await work.boundingBox())!.height;return height>50&&height<expanded-1}).toBe(true)
  await expect.poll(async()=>(await work.boundingBox())!.height).toBeLessThan(expanded)
  await expect(dialog.getByRole('link',{name:'Halbkreis',exact:true})).not.toBeVisible()
  await work.locator('summary').click()
  await expect.poll(async()=>{const height=(await work.boundingBox())!.height;return height>50&&height<expanded-1}).toBe(true)
  await expect(dialog.getByRole('link',{name:'Halbkreis',exact:true})).toBeVisible()
  await dialog.getByRole('button',{name:'Close navigation'}).click()
  await expect(dialog).not.toBeVisible()
})

test('sidebar respects reduced motion and keyboard disclosure controls',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  const panel=dialog.locator('[data-navigation-panel]')
  await expect(panel).toBeVisible()
  expect(await panel.evaluate(el=>el.getAnimations().length)).toBe(0)
  const summary=dialog.locator('summary').filter({hasText:'Work'})
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('link',{name:'Halbkreis',exact:true})).not.toBeVisible()
  await page.keyboard.press('Space')
  await expect(dialog.getByRole('link',{name:'Halbkreis',exact:true})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

for(const colorScheme of ['light','dark'] as const){
  test(`sidebar keyboard focus uses the original visible outline in ${colorScheme} mode`,async({page})=>{
    await page.emulateMedia({colorScheme,reducedMotion:'reduce'})
    await page.goto('/halbkreis',{waitUntil:'networkidle'})
    await page.getByRole('button',{name:'Open menu',exact:true}).click()
    const dialog=page.getByRole('dialog')
    const themeColor=await page.locator('body').evaluate(el=>getComputedStyle(el).color)
    await expect(dialog.getByRole('textbox',{name:'Email address'})).toBeEnabled()
    await page.keyboard.press('Tab')
    for(const control of [
      dialog.getByRole('button',{name:'Close navigation'}),
      dialog.locator('summary').filter({hasText:'Work'}),
      dialog.getByRole('link',{name:'Hoffnung',exact:true}),
      dialog.getByRole('textbox',{name:'Email address'}),
      dialog.getByRole('button',{name:'Signup'}),
      dialog.getByRole('link',{name:'Twitch',exact:true}),
      dialog.getByRole('link',{name:'Spotify',exact:true}),
    ]){
      await control.focus()
      await expect.poll(()=>control.evaluate(el=>{
        const style=getComputedStyle(el)
        return{visible:el.matches(':focus-visible'),width:style.outlineWidth,offset:style.outlineOffset,color:style.outlineColor}
      })).toEqual({visible:true,width:'4px',offset:'4px',color:themeColor})
    }
    expect(await dialog.locator('details[open]').evaluate(el=>getComputedStyle(el,'::details-content').overflow)).toBe('visible')
  })
}
