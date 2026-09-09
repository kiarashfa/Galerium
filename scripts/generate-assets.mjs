/**
 * Renders every shipped icon and social image from the one vector master,
 * src/assets/brand/galerium-mark.svg, so the whole set stays in sync with it.
 *
 * Writes:
 *   public/favicon.svg            copy of the master
 *   public/favicon.ico            16 / 32 / 48 embedded
 *   public/apple-touch-icon.png   180x180, solid background, ~10% padding
 *   public/icon-192.png           ~6% padding
 *   public/icon-512.png           ~6% padding
 *   public/og/og-galerium.png     1200x630 link preview
 *   public/og/og-github.png       1280x640 GitHub repo social preview
 *
 * Usage: npm run generate-assets   (needs the playwright chromium browser)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { SITE_NAME, THEME_COLOR } from '../site.config.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const INK = THEME_COLOR
const GOLD = '#c8a24b'
const PAPER = '#e8e2d2'
const MUTED = '#9aa0b4'

const markSource = await readFile(
  path.join(ROOT, 'src', 'assets', 'brand', 'galerium-mark.svg'),
  'utf8',
)

/** Embed the master mark as a nested <svg> at a given box, scaled to fit. */
function mark(x, y, size) {
  return markSource
    .replace(/^[\s\S]*?<svg /, '<svg ')
    .replace(
      /width="32" height="32"/,
      `x="${x}" y="${y}" width="${size}" height="${size}"`,
    )
}

const fontFace = (family, file, weight) => `
  @font-face {
    font-family: '${family}';
    font-weight: ${weight};
    font-style: normal;
    src: url('${path.join(ROOT, 'src', 'assets', 'fonts', file).replace(/\\/g, '/')}') format('woff2');
  }`

const FONTS = [
  fontFace('Cormorant Garamond', 'CormorantGaramond-600.woff2', 600),
  fontFace('Cormorant Garamond', 'CormorantGaramond-500.woff2', 500),
  fontFace('Inter', 'Inter-400.woff2', 400),
  fontFace('Inter', 'Inter-500.woff2', 500),
].join('\n')

/** A square icon: solid background (iOS renders transparency as black) + padded mark. */
function iconPage(size, paddingRatio) {
  const pad = Math.round(size * paddingRatio)
  const inner = size - pad * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${INK}"/>
    ${mark(pad, pad, inner)}
  </svg>`
}

/**
 * Social banner. Recomposed per aspect ratio rather than rescaled: `safe` is the
 * minimum distance any ink may come to an edge, verified after render.
 */
function bannerPage(width, height, safe, markSize, titleSize, subSize) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FONTS}
    * { margin: 0; box-sizing: border-box; }
    body { width: ${width}px; height: ${height}px; overflow: hidden; }
    .stage {
      width: ${width}px; height: ${height}px; position: relative;
      background: radial-gradient(${Math.round(width * 0.9)}px ${Math.round(height * 1.1)}px at 50% 38%, #161d30, ${INK});
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .rule-frame {
      position: absolute; inset: ${safe}px;
      border: 1px solid rgba(200, 162, 75, 0.28);
    }
    .mark { display: block; }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 600; font-size: ${titleSize}px; line-height: 1;
      letter-spacing: ${Math.round(titleSize * 0.11)}px;
      text-indent: ${Math.round(titleSize * 0.11)}px;
      color: ${PAPER}; margin-top: ${Math.round(markSize * 0.26)}px;
    }
    .sub {
      font-family: 'Inter', system-ui, sans-serif; font-weight: 400;
      font-size: ${subSize}px; letter-spacing: ${(subSize * 0.14).toFixed(1)}px;
      text-transform: uppercase; color: ${GOLD};
      margin-top: ${Math.round(subSize * 0.9)}px;
    }
    .foot {
      font-family: 'Inter', system-ui, sans-serif; font-weight: 400;
      font-size: ${Math.round(subSize * 0.78)}px; color: ${MUTED};
      margin-top: ${Math.round(subSize * 1.5)}px;
    }
  </style></head><body><div class="stage">
    <div class="rule-frame"></div>
    <svg class="mark" xmlns="http://www.w3.org/2000/svg" width="${markSize}" height="${markSize}" viewBox="0 0 ${markSize} ${markSize}">
      ${mark(0, 0, markSize)}
    </svg>
    <h1 id="ink-title">${SITE_NAME}</h1>
    <div class="sub" id="ink-sub">A Museum of Art History</div>
    <div class="foot" id="ink-foot">Fifteen periods &middot; Seventy artists &middot; Walkable 3D galleries</div>
  </div></body></html>`
}

/** Real ink bounds of the laid-out content, not an eyeball check. */
async function inkInset(page, width, height) {
  return page.evaluate(
    ([w, h]) => {
      const nodes = [
        document.querySelector('.mark'),
        document.getElementById('ink-title'),
        document.getElementById('ink-sub'),
        document.getElementById('ink-foot'),
      ]
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
      for (const n of nodes) {
        // range bounds hug the glyphs; element bounds include line-height slack
        let r
        if (n.tagName === 'svg') {
          r = n.getBoundingClientRect()
        } else {
          const range = document.createRange()
          range.selectNodeContents(n)
          r = range.getBoundingClientRect()
        }
        left = Math.min(left, r.left); top = Math.min(top, r.top)
        right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
      }
      return { left, top, right: w - right, bottom: h - bottom }
    },
    [width, height],
  )
}

/** ICO container with PNG payloads (supported by every current browser and Windows). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const entries = []
  let offset = 6 + images.length * 16
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += data.length
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

async function shotSvg(svg, width, height) {
  await page.setViewportSize({ width, height })
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg}</body></html>`,
    { waitUntil: 'load' },
  )
  return page.screenshot({ omitBackground: false })
}

await mkdir(path.join(PUBLIC, 'og'), { recursive: true })

// --- favicon.svg (the master, shipped as-is) -------------------------------
await writeFile(path.join(PUBLIC, 'favicon.svg'), markSource)
console.log('favicon.svg        vector master')

// --- favicon.ico (16 / 32 / 48, rounded tile on transparent) ---------------
const icoImages = []
for (const size of [16, 32, 48]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">
       <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
         ${mark(0, 0, size)}
       </svg></body></html>`,
    { waitUntil: 'load' },
  )
  icoImages.push({ size, data: await page.screenshot({ omitBackground: true }) })
}
await writeFile(path.join(PUBLIC, 'favicon.ico'), buildIco(icoImages))
console.log('favicon.ico        16/32/48')

// --- app icons -------------------------------------------------------------
for (const [file, size, pad] of [
  ['apple-touch-icon.png', 180, 0.1],
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
]) {
  await writeFile(path.join(PUBLIC, file), await shotSvg(iconPage(size, pad), size, size))
  console.log(`${file.padEnd(19)}${size}x${size}, ${Math.round(pad * 100)}% padding`)
}

// --- social images ---------------------------------------------------------
for (const [file, width, height, safe, markSize, titleSize, subSize] of [
  ['og/og-galerium.png', 1200, 630, 48, 176, 104, 26],
  ['og/og-github.png', 1280, 640, 60, 168, 100, 25],
]) {
  await page.setViewportSize({ width, height })
  await page.setContent(bannerPage(width, height, safe, markSize, titleSize, subSize), {
    waitUntil: 'load',
  })
  await page.evaluate(() => document.fonts.ready)

  const inset = await inkInset(page, width, height)
  const worst = Math.min(inset.left, inset.top, inset.right, inset.bottom)
  const required = file.includes('github') ? 40 : 24
  if (worst < required) {
    throw new Error(
      `${file}: ink comes within ${worst.toFixed(1)}px of an edge, needs >= ${required}px ` +
        `(l ${inset.left.toFixed(1)} t ${inset.top.toFixed(1)} r ${inset.right.toFixed(1)} b ${inset.bottom.toFixed(1)})`,
    )
  }

  await writeFile(path.join(PUBLIC, file), await page.screenshot())
  console.log(
    `${file.padEnd(19)}${width}x${height}, ink inset ${worst.toFixed(1)}px (min ${required})`,
  )
}

await browser.close()
