// Local review server. No Worker/router/publication entry.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { build } from 'esbuild'
import sharp from 'sharp'
import { renderToString } from 'remix/component/server'
import { Review } from './studies.tsx'

// Use the current accepted portrait/theme opener without merging unrelated CMS work.
const accepted = '3b839491bf4743f05bce54b9f8a00c64de29ad08'
const gitFile = (path: string) =>
  execFileSync('git', ['show', `${accepted}:${path}`], { maxBuffer: 8 * 1024 * 1024 })
const root = new URL('./', import.meta.url)
const openingCss = gitFile('website/app/temple/style.css')
  .toString()
  .replaceAll("url('./assets/", "url('/fonts/")
const templeMark = readFileSync(new URL('../assets/mark.svg', root))
const fontNames = ['bricolage.ttf', 'germaniaone.ttf', 'cinzeldecorative-bold.ttf', 'unbounded.ttf']
const fonts = new Map(
  fontNames.map((name) => [`/fonts/${name}`, gitFile(`website/app/temple/assets/${name}`)]),
)
// Same photograph and 1920px preparation as the approved scene; no CDN dependency.
const forest = await sharp(fileURLToPath(new URL('../../../../content/media/IMG_6257.JPG', root)))
  .rotate()
  .resize({ width: 1920, withoutEnlargement: true })
  .webp({ quality: 80 })
  .toBuffer()
const scene = await build({
  entryPoints: [fileURLToPath(new URL('context.ts', root))],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  plugins: [
    {
      name: 'accepted-opener',
      setup(build) {
        build.onLoad({ filter: /[/\\]temple[/\\](?:scene|forest)\.ts$/ }, (args) => ({
          // The backdrop now outlives the opener's document box: observe its actual
          // visible stage rather than the departed root, preserving ambient motion.
          contents: gitFile(`website/app/temple/${args.path.split(/[/\\]/).pop()}`)
            .toString()
            .replace('observer.observe(root)', 'observer.observe(stage)')
            // Local black-ground study: keep the forest inside type, including after title exit.
            .replace('veilContext.globalAlpha = 1 - s.reveal', 'veilContext.globalAlpha = 1')
            .replaceAll("'#030503'", "'#000000'")
            // Final face exits at the same 1px-per-scroll-pixel rate as the next headline.
            .replace(
              'const y = clamp((progress - 1.05) / 0.95) * height',
              'const y = Math.max(0, scroll - height * 0.1575)',
            )
            .replace('const overlayOpacity = 0.11', 'const overlayOpacity = 0')
            .replace('particle.brightness * fade', 'particle.brightness * 1.25 * fade')
            .replace(
              'export function createForest',
              "import { setGlimmerSprite, trackGlimmer } from './text.prototype/escapes.ts';\nexport function createForest",
            )
            .replace(
              'Array.from({ length: 980 }, () => {',
              'Array.from({ length: 980 }, (_, id) => {',
            )
            .replace('angle: angle +', 'id, angle: angle +')
            .replace(
              'brush.fillRect(0, 0, 48, 48)',
              'brush.fillRect(0, 0, 48, 48); setGlimmerSprite(sprite)',
            )
            .replace(
              'const size = particle.size * 8',
              'const size = particle.size * 8; trackGlimmer(particle.id, px, py, context.globalAlpha, size, seconds)',
            )
            .replace('  resize()\n}', '  setForestInvalidation(requestDraw)\n  resize()\n}')
            .replace(
              'import { createForest }',
              "import { drawTypeFrame, setForestInvalidation, roughBand as sharedBand, drawDisturbance } from './text.prototype/typography.ts';\nimport { paintEdgeMist } from './text.prototype/atmosphere.ts';\nimport { beginPortals, cachePortal, addPortal, drawEscapes } from './text.prototype/escapes.ts';\nimport { createForest }",
            )
            .replace(
              'paintForest(context, width, height, elapsed)',
              'paintForest(context, width, height, elapsed); paintEdgeMist(context, width, height, elapsed)',
            )
            .replace(
              'compose(s, now)',
              `compose(s, now); beginPortals();
              for (const phase of s.rows) if (phase.blend <= 0.08 || phase.blend >= 0.92) {
                const row = layers[s.rowFaces[phase.row]].rows[phase.row];
                addPortal(row.surface, row.x, row.y - s.y, row.width, row.height);
              }
              const typeActive = drawTypeFrame(maskContext, canvas, now)`,
            )
            .replace(
              'layers = faces.map(makeLayer)',
              'layers = faces.map(makeLayer); for (const layer of layers) for (const row of layer.rows) cachePortal(row.surface)',
            )
            .replace(
              "if (!root.hasAttribute('data-ready')) root.dataset.ready = 'true'",
              `drawEscapes(context, elapsed, reduced.matches);
              if (!root.hasAttribute('data-ready')) {
                root.dataset.ready = 'true';
                document.body.dataset.sceneReady = 'true';
              }`,
            )
            .replace(
              '!reduced.matches || disturbances.size',
              '!reduced.matches || disturbances.size || typeActive',
            )
            .replace(
              /  function roughBand\([\s\S]*?\n  function compose\(/,
              `  function roughBand(ink, y, h, seed, offset = 0) { sharedBand(ink, width, y, h, seed, offset) }\n  function compose(`,
            )
            .replace(
              /  function disturb\([\s\S]*?\n  function requestDraw\(/,
              `  function disturb(event, s, now) {
              const age = now - event.start
              const duration = event.idle ? event.duration : reduced.matches ? 220 : 680
              if (age >= duration) return false
              const letter = layers[event.layer].glyphs[event.glyph]
              const alt = layers[(event.layer + 1 + (event.glyph % 2)) % 4].glyphs[event.glyph]
              drawDisturbance(maskContext, width, ratio, letter, alt, { ...event, age, duration, y: s.y }, reduced.matches)
              return true
            }\n  function requestDraw(`,
            ),
          loader: 'ts',
          resolveDir: dirname(args.path),
        }))
      },
    },
  ],
})
createServer(async (request, response) => {
  const url = new URL(request.url!, 'http://localhost')
  response.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/context.js') {
    response.setHeader('Content-Type', 'text/javascript')
    response.end(scene.outputFiles[0].contents)
  } else if (url.pathname === '/temple-mark.svg') {
    response.setHeader('Content-Type', 'image/svg+xml')
    response.end(templeMark)
  } else if (url.pathname === '/opening.css' || url.pathname === '/style.css') {
    response.setHeader('Content-Type', 'text/css')
    response.end(
      url.pathname === '/opening.css' ? openingCss : readFileSync(new URL('style.css', root)),
    )
  } else if (fonts.has(url.pathname)) {
    response.setHeader('Content-Type', 'font/ttf')
    response.end(fonts.get(url.pathname))
  } else if (url.pathname === '/forest.webp') {
    response.setHeader('Content-Type', 'image/webp')
    response.end(forest)
  } else if (url.pathname === '/' || url.pathname === '/temple-of-sound') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<!doctype html>' + (await renderToString(<Review />)))
  } else {
    response.writeHead(404)
    response.end()
  }
}).listen(8790, '0.0.0.0', () =>
  console.log('Contextual Temple workbench: http://localhost:8790/temple-of-sound'),
)
