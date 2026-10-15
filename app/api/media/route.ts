import { auth } from "@clerk/nextjs/server"
import { configured, convexSite } from "@/lib/config"
export async function GET(request: Request) {
  if (!configured || !convexSite)
    return new Response("Not found", { status: 404 })
  const { getToken } = await auth()
  const token = await getToken({ template: "convex" })
  const input = new URL(request.url)
  const url = new URL("/media", convexSite)
  for (const key of ["id", "post", "profile"]) {
    const value = input.searchParams.get(key)
    if (value) url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
    redirect: "error",
  })
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}
