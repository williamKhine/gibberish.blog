import { allPublicPosts } from "@/lib/server"
import { siteUrl } from "@/lib/config"
export const dynamic = "force-dynamic"
function xml(s: string) {
  return s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!
  )
}
export async function GET() {
  const posts = (await allPublicPosts()).slice(0, 50)
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Gibberish</title><link>${xml(siteUrl)}</link><description>Little things from a little corner of the internet.</description>${posts.map((p) => `<item><title>${xml(p.title)}</title><link>${xml(`${siteUrl}/p/${p._id}/${p.slug}`)}</link><guid isPermaLink="false">${xml(p._id)}</guid><description>${xml(p.excerpt)}</description><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  )
}
