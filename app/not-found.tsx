import Link from "next/link"
export default function NotFound() {
  return (
    <div className="page-width narrow inner-page">
      <span className="eyebrow">A SMALL WRONG TURN</span>
      <h1>This corner is empty.</h1>
      <p className="intro">
        That page may have moved, been unpublished, or wandered off.
      </p>
      <Link className="button primary" href="/">
        Back to the good stuff ↗
      </Link>
    </div>
  )
}
