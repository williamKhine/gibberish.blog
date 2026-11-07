import { siteUrl, configured } from "@/lib/config"
export default function robots() {
  return {
    rules: configured
      ? {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/dashboard",
            "/write/",
            "/admin",
            "/setup",
            "/api/",
            "/following",
            "/bookmarks",
            "/sign-in",
            "/sign-up",
          ],
        }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
