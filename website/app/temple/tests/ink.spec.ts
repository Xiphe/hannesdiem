import assert from 'node:assert/strict'
import { test, type Page } from '@playwright/test'
import { build } from 'esbuild'
import { checkInkBaselines, inkViewport } from '../debug/ink.ts'

const fixtureUrl = 'https://ink.test/'
const fixture = await build({
  stdin: {
    contents: `
      import { colourCopy } from './copy-colour.ts'
      const root = document.querySelector('.temple-artwork')
      const copy = colourCopy(root, new AbortController().signal, () => {})
      copy.resize()
      copy.draw(0, true)
      if (document.body.dataset.mode !== 'unchanged') {
        root.querySelector('.block-row-ink').style.top = '8px'
        if (document.body.dataset.mode === 'refit') {
          copy.resize()
          copy.draw(1, true)
        }
      }
    `,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true,
  format: 'iife',
  write: false,
})

async function equalMasks(page: Page, mode: 'unchanged' | 'refit' | 'displaced') {
  await page.route(fixtureUrl, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><style>
        .poem-pairs, .verse-copy { width: 200px }
        .phrase-entry { display: block; position: relative; width: 200px; height: 80px }
        .block-row-ink { position: absolute; left: 0; font: 20px Arial }
        .block-baseline { display: inline-block; width: 0; height: 0; vertical-align: baseline }
        .copy-cloud-canvas { position: absolute; left: 0; top: 0 }
      </style><body data-mode="${mode}">
        <div class="temple-artwork" data-state="ready"><div class="poem-pairs">
          <div class="verse-copy"><p>${[0, 12]
            .map(
              (offset) =>
                `<span class="phrase-entry">${[2, 8]
                  .map(
                    (top) =>
                      `<span class="block-row-ink" style="top:${top + offset}px">Repeat<span class="block-baseline"></span></span>`,
                  )
                  .join('')}</span>`,
            )
            .join('')}</p></div>
        </div></div><script>${fixture.outputFiles[0].text}</script>`,
    }),
  )
}

test.use(inkViewport)

test('cached glyph baselines agree with settled native text', async ({ page, baseURL }) => {
  await checkInkBaselines(page, new URL('/temple-of-sound', baseURL).href)
})

test('equal masks and repeated rows retain their actual canvas association', async ({ page }) => {
  await equalMasks(page, 'unchanged')
  const result = await checkInkBaselines(page, fixtureUrl)
  assert.equal(result.rows, 4)
  assert.equal(result.maximumBaselineDrift, 0)
})

test('a refitted mask replaces samples from its previous layout', async ({ page }) => {
  await equalMasks(page, 'refit')
  assert.equal((await checkInkBaselines(page, fixtureUrl)).maximumBaselineDrift, 0)
})

test('another row at the expected y cannot conceal a displaced mask', async ({ page }) => {
  await equalMasks(page, 'displaced')
  await assert.rejects(checkInkBaselines(page, fixtureUrl), /Cached\/native baseline drift: 6px/)
})

test('reduced-motion transition duration cannot defer fitted copy geometry', async ({
  page,
  baseURL,
}) => {
  await page.route('**/*.css', async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
        @media (prefers-reduced-motion: reduce) {
          .verse-copy, .verse-copy * {
            transition-duration: 100ms !important;
            transition-timing-function: steps(1, end) !important;
          }
        }
      `,
    })
  })
  await checkInkBaselines(page, new URL('/temple-of-sound', baseURL).href)
})
