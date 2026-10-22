import Link from "next/link"
export const metadata = { title: "House rules" }
export default function Page() {
  return (
    <div className="page-width narrow inner-page">
      <span className="eyebrow">UNSERIOUS WORDS. REAL PEOPLE.</span>
      <h1>Make a little room for each other.</h1>
      <p className="intro">
        Gibberish is a place for curiosity, odd observations, and being a
        person. A few things help keep it that way.
      </p>
      <div className="rich-body">
        <h2>Be kind. Be yourself.</h2>
        <p>
          Disagree with ideas without harassing people. No threats, hateful
          attacks, impersonation, doxxing, or unwanted sexual content. Don’t
          post someone else’s private information.
        </p>
        <h2>Only share what you have the right to share.</h2>
        <p>
          No illegal material, sexual exploitation, scams, or instructions to
          harm people. Don’t upload intimate images without consent. Credit
          other people’s work and respect their rights. No spam or deceptive
          links.
        </p>
        <h2>A small introduction before the microphone.</h2>
        <p>
          Anyone can register to follow, bookmark, and react. We review writer
          applications before enabling public posts, comments, uploads, and
          custom profiles. Approval is permission to participate, not a promise
          that every contribution is suitable.
        </p>
        <h2>See something wrong? Tell us.</h2>
        <p>
          Use the Report button on a post, comment, or profile and explain what
          needs attention. Please don’t repeat harmful material in the report.
          Administrators can remove content, hide profiles, and suspend
          accounts. Reports are reviewed manually; this beta does not offer
          round-the-clock monitoring.
        </p>
        <h2>Your drafts stay yours.</h2>
        <p>
          Drafts and bookmarks are private. Administrators can read the sample
          you submit with your writer application, but cannot browse your
          private drafts. Public content can be removed when it breaks these
          rules.
        </p>
      </div>
      <Link href="/dashboard" className="button primary mt-7">
        Sounds like my kind of place ↗
      </Link>
    </div>
  )
}
