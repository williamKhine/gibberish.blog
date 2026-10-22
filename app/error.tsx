"use client"
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-width narrow inner-page">
      <h1>A little hiccup.</h1>
      <p className="intro">
        We couldn’t load this corner. Check your connection and try again.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  )
}
