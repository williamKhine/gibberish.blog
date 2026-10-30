import { notFound } from "next/navigation"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { configured } from "@/lib/config"
import { demoPosts } from "@/lib/demo"
import { Feed } from "@/components/feed"
import { MediaImage } from "@/components/post-card"
import { FollowButton } from "@/components/social"
export const dynamic = "force-dynamic"
async function get(handle: string) {
  return configured
    ? fetchQuery(api.community.getProfile, { handle })
    : demoPosts.find((p) => p.author.handle === handle)?.author
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const p = await get((await params).handle)
  return { title: p?.name ?? "Writer not found", description: p?.bio }
}
export default async function Page({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const p = await get(handle)
  if (!p) notFound()
  const initial = configured
    ? (
        await fetchQuery(api.community.feed, {
          handle,
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page
    : undefined
  return (
    <div className="page-width inner-page">
      <section className="profile-header">
        {p.cover && (
          <MediaImage
            className="profile-cover"
            id={p.cover}
            profile={p._id}
            alt="Profile cover"
          />
        )}
        <div className={`avatar accent-${p.accent}`}>
          {p.avatar ? (
            <MediaImage id={p.avatar} profile={p._id} alt="" />
          ) : (
            p.sticker
          )}
        </div>
        <h1>{p.name}</h1>
        <span className="muted">@{p.handle}</span>
        <p>{p.bio}</p>
        <div className="row">
          <FollowButton target={p._id} />
        </div>
      </section>
      <h2 className="mb-6 text-2xl">Things left in this corner</h2>
      <Feed handle={handle} initial={initial} />
    </div>
  )
}
