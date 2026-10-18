import { expect,test,type BrowserContext } from '@playwright/test'
import mediaFiles from '../.generated/media-files.json' with {type:'json'}
import media from '../.generated/media.json' with {type:'json'}

async function mockRemoteMedia(context:BrowserContext){
  const first=Object.values(media)[0]
  if(!first.src.startsWith('https://'))return
  const origin=new URL(first.src).origin
  for(const file of mediaFiles){await context.route(`${origin}/${file.key}`,route=>route.fulfill({path:file.path,contentType:file.contentType}))}
}
test.beforeEach(async({context})=>{await mockRemoteMedia(context)})
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
  await page.getByRole('link',{name:'Open menu',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading',{name:'Let’s stay in touch.'})).toBeVisible()
  await page.getByRole('dialog').getByText('Work',{exact:true}).click()
  await expect(page.getByRole('dialog').getByRole('link',{name:'Hoffnung',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>({same:(window as any).staticRoot===document.querySelector('main'),mutations:(window as any).mutations}))).toEqual({same:true,mutations:0})
  await page.getByRole('link',{name:'Close navigation'}).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(errors).toEqual([])
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

test('outside clicks close overlays and menu selections replace the overlay history entry',async({page})=>{
  await page.goto('/halbkreis',{waitUntil:'networkidle'})
  await page.getByRole('link',{name:'Open menu',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(20,400)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await page.getByRole('link',{name:'Open menu',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('link',{name:'Hoffnung',exact:true}).click()
  await expect(page.locator('main h1')).toHaveText('Hoffnung')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await expect(page.locator('main h1')).toHaveText('Halbkreis')
  await page.goto('/nav',{waitUntil:'networkidle'})
  await expect(page.getByRole('link',{name:'Open menu',exact:true})).toHaveCount(0)
})
