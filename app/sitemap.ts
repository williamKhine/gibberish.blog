import type { MetadataRoute } from "next"
import { allPublicPosts } from "@/lib/server"
import { siteUrl, configured } from "@/lib/config"
export const dynamic = "force-dynamic"
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!configured) return []
  const posts = await allPublicPosts()
  const profiles = [...new Set(posts.map((p) => p.author.handle))]
  return [
    { url: siteUrl },
    ...posts.map((p) => ({
      url: `${siteUrl}/p/${p._id}/${p.slug}`,
      lastModified: new Date(p.publishedAt),
    })),
    ...profiles.map((h) => ({ url: `${siteUrl}/u/${h}` })),
  ]
}
