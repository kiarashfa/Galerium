import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  THEME_COLOR,
  BACKGROUND_COLOR,
  GA_MEASUREMENT_ID,
} from './site.config'

/**
 * Web app manifest. Every path inside is relative to the manifest's own URL, so
 * it stays correct in local dev and under the GitHub Pages base path alike,
 * without a hardcoded origin.
 */
const webManifest = JSON.stringify(
  {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: './icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: './favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  },
  null,
  2,
)

/**
 * Fans site.config.ts out to every place that needs it:
 *   - fills the %TOKEN% placeholders in index.html and public/404.html
 *   - emits robots.txt and sitemap-index.xml with the real deployed URL
 * so the site URL and the analytics ID each live in exactly one file.
 */
function siteMetadata(): Plugin {
  const tokens: Record<string, string> = {
    SITE_URL,
    SITE_NAME,
    SITE_TITLE,
    SITE_DESCRIPTION,
    THEME_COLOR,
    GA_MEASUREMENT_ID,
  }

  const fill = (html: string) =>
    html.replace(/%([A-Z_]+)%/g, (match, key: string) =>
      key in tokens ? tokens[key] : match,
    )

  return {
    name: 'galerium-site-metadata',
    transformIndexHtml: { order: 'pre', handler: fill },
    // The manifest is generated, so serve it in dev from the same source.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/site.webmanifest') return next()
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(webManifest)
      })
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)

      this.emitFile({ type: 'asset', fileName: 'site.webmanifest', source: webManifest })

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          '',
          `Sitemap: ${SITE_URL}sitemap-index.xml`,
          '',
        ].join('\n'),
      })

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap-index.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          `    <loc>${SITE_URL}</loc>`,
          `    <lastmod>${today}</lastmod>`,
          '    <changefreq>monthly</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n'),
      })
    },
    // public/404.html is copied verbatim by Vite, so fill its tokens on the way out.
    writeBundle: {
      sequential: true,
      async handler(options) {
        const { readFile, writeFile } = await import('node:fs/promises')
        const { existsSync } = await import('node:fs')
        const path = await import('node:path')
        const out = path.join(options.dir ?? 'dist', '404.html')
        if (!existsSync(out)) return
        await writeFile(out, fill(await readFile(out, 'utf8')))
      },
    },
  }
}

// base: './' makes every asset URL relative, so the built site works from
// any subpath (e.g. GitHub Pages project sites) without config changes.
export default defineConfig({
  base: './',
  plugins: [react(), siteMetadata()],
})
