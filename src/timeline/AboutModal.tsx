import { useEffect } from 'react'
import { useMuseum } from '../store'
import { RESTRICTED_LICENSE } from '../types'
import { COPYRIGHT_START_YEAR, COPYRIGHT_HOLDER, SITE_NAME } from '../../site.config'

/** About and credits, in the same placard language as the artist cards. */
export default function AboutModal() {
  const data = useMuseum((s) => s.data)!
  const aboutOpen = useMuseum((s) => s.aboutOpen)
  const setAbout = useMuseum((s) => s.setAbout)

  useEffect(() => {
    if (!aboutOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbout(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aboutOpen, setAbout])

  if (!aboutOpen) return null

  const restricted = data.paintings.filter((p) => p.license === RESTRICTED_LICENSE).length

  const thisYear = new Date().getFullYear()
  const copyrightYears =
    thisYear > COPYRIGHT_START_YEAR ? `${COPYRIGHT_START_YEAR}-${thisYear}` : `${COPYRIGHT_START_YEAR}`

  return (
    <div className="card-scrim" onClick={() => setAbout(false)}>
      <article className="placard about-placard" onClick={(e) => e.stopPropagation()}>
        <button className="placard-close" onClick={() => setAbout(false)} aria-label="Close">
          ×
        </button>

        <div className="placard-period" style={{ color: 'var(--gold-2)' }}>
          About this museum
        </div>
        <h2 className="placard-name about-title">{SITE_NAME}</h2>
        <div className="placard-rule" />

        <div className="about-body">
          <p>
            An interactive museum of Western painting: a zoomable timeline running from{' '}
            {data.periods[0].name} to {data.periods[data.periods.length - 1].name}, covering{' '}
            {data.periods.length} periods, {data.artists.length} artists and{' '}
            {data.paintings.length} works, each hung in a walkable 3D gallery. The whole museum
            runs as a static web app from local files.
          </p>
          <p>
            Every biography, painting story, date, and image comes from{' '}
            <a href="https://en.wikipedia.org" target="_blank" rel="noreferrer">
              Wikipedia
            </a>{' '}
            and{' '}
            <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
              Wikimedia Commons
            </a>
            , fetched from their public APIs. Nearly all works shown are in the public domain.
          </p>
          <p>
            A small number of modern works ({restricted} of {data.paintings.length}) remain under
            copyright. Those are shown at the low resolution Wikipedia publishes under fair use, and
            they carry a red <span className="about-badge">© In copyright</span> badge wherever they
            appear.
          </p>
        </div>

        <div className="placard-meta about-meta">
          <a href="https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License" target="_blank" rel="noreferrer">
            Wikipedia text: CC BY-SA ↗
          </a>
          <a href="https://commons.wikimedia.org/wiki/Commons:Licensing" target="_blank" rel="noreferrer">
            Commons licensing ↗
          </a>
        </div>

        <div className="about-copyright">
          © {copyrightYears} {COPYRIGHT_HOLDER}
        </div>
      </article>
    </div>
  )
}
