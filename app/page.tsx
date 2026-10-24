import Link from "next/link"
import { Feed } from "@/components/feed"
import { publicFeed } from "@/lib/server"
export const dynamic = "force-dynamic"
export default async function Home() {
  const initial = await publicFeed()
  return (
    <div className="page-width">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> A SMALL CORNER OF A VERY BIG INTERNET
          </div>
          <h1>
            Big thoughts.
            <br />
            Small thoughts.
            <br />
            <span>Absolutely gibberish.</span>
          </h1>
          <p>
            A home for your rabbit holes, shower thoughts,
            <br className="desktop-break" /> and stories that don’t need a
            point.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="button primary">
              Make yourself at home <span>↗</span>
            </Link>
            <span className="handwritten">
              no niche required. <span>⤴</span>
            </span>
          </div>
        </div>
        <div className="hero-collage" aria-hidden="true">
          <div className="collage-paper">
            <div className="tape" />
            <span className="note-kicker">NOTE TO SELF</span>
            <p>
              You don’t have
              <br />
              to have it all
              <br />
              <em>figured out.</em>
            </p>
            <span className="note-smile">☺</span>
            <small>just write something.</small>
          </div>
          <div className="pink-note">
            less personal brand.
            <br />
            <b>more person.</b>
            <span>♡</span>
          </div>
          <div className="round-sticker">
            100%
            <br />
            <b>HUMAN</b>
            <br />
            0% strategy
          </div>
          <span className="collage-star">✳</span>
          <span className="collage-spark">✧</span>
          <span className="margin-note">
            the internet can
            <br />
            still be a little weird.
          </span>
        </div>
      </section>
      <section className="feed-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FRESH OFF SOMEONE’S BRAIN</span>
            <h2>
              The latest little things <span>↘</span>
            </h2>
          </div>
          <span className="chronological">✳ In order. No algorithm.</span>
        </div>
        <div className="topic-bar">
          <Link className="selected" href="/">
            Everything
          </Link>
          {[
            "life",
            "tiny-stories",
            "art",
            "internet",
            "small-joys",
            "thoughts",
          ].map((t) => (
            <Link key={t} href={`/tags/${t}`}>
              #{t}
            </Link>
          ))}
          <Link href="/search" className="browse-topics">
            Find your rabbit hole ↗
          </Link>
        </div>
        <Feed initial={initial} />
      </section>
      <aside className="join-strip">
        <span className="join-star">✷</span>
        <div>
          <h2>Your half-baked thought belongs here.</h2>
          <p>Bring your curiosity. Leave your personal brand at the door.</p>
        </div>
        <Link href="/dashboard" className="button dark-button">
          Find your little corner ↗
        </Link>
      </aside>
    </div>
  )
}
