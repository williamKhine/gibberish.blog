export const configured = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
)
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
export const convexSite = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || ""
