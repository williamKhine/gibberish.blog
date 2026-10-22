import { Feed } from "@/components/feed"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return (
    <div className="page-width inner-page">
      <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
      <h1>Find your rabbit hole.</h1>
      <form className="search-form" action="/search">
        <label className="sr-only" htmlFor="query">
          Search posts
        </label>
        <input
          id="query"
          type="search"
          name="q"
          maxLength={200}
          defaultValue={q}
          placeholder="Plants, weird thoughts, exceptionally good toast…"
        />
        <button className="button primary">Search ↗</button>
      </form>
      <Feed search={q} />
    </div>
  )
}
