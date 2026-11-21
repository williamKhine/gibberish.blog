export function authDestination(next: string | string[] | undefined) {
  if (typeof next !== "string" || !next.startsWith("/")) return "/dashboard"

  const origin = "https://gibberish.invalid"
  const url = URL.parse(next, origin)
  if (
    !url ||
    url.origin !== origin ||
    url.pathname.startsWith("//") ||
    /^\/sign-(in|up)(\/|$)/.test(url.pathname)
  )
    return "/dashboard"

  return url.pathname + url.search
}
