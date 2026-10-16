/**
 * Single source of truth for everything about the deployed site that more than
 * one file would otherwise repeat: the public URL, the analytics ID, the brand
 * strings and the theme colour.
 *
 * `vite.config.ts` reads this to fill the `%TOKEN%` placeholders in index.html
 * and to emit robots.txt and sitemap.xml at build time, so changing a value
 * here changes it everywhere with no other edit.
 */

/** Public origin + base path of the deployed site. Keep the trailing slash. */
export const SITE_URL = 'https://kiarashfa.github.io/Galerium/'

/** GA4 Measurement ID. Public by design: it is visible in the page source. */
export const GA_MEASUREMENT_ID = 'G-RW1V65JMNV'

export const SITE_NAME = 'Galerium'
export const SITE_TITLE = 'Galerium: A Museum of Art History'
export const SITE_DESCRIPTION =
  'A museum of art history you can walk through in your browser. Explore a museum ' +
  'building with a floor for each of fifteen periods, pick an artist, and step into their own ' +
  '3D gallery hung with their real paintings. Every fact and image comes from Wikipedia.'

/** From the site design tokens in src/styles.css (--ink). */
export const THEME_COLOR = '#0b0e14'
export const BACKGROUND_COLOR = '#0b0e14'

/** Year of the first commit. Immutable, so it is pinned rather than queried:
 *  CI checkouts are shallow and would resolve the newest commit instead. */
export const COPYRIGHT_START_YEAR = 2026

export const COPYRIGHT_HOLDER = 'Kiarash Farajzadehahary'
