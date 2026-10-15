import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { sniffImage } from "../lib/content"
const http = httpRouter()
function cors(request: Request) {
  const origin = request.headers.get("origin") ?? ""
  const allowed = (process.env.SITE_URL ?? "http://localhost:3000")
    .split(",")
    .map((x) => x.trim())
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  }
}
http.route({
  path: "/upload",
  method: "OPTIONS",
  handler: httpAction(
    async (_, req) => new Response(null, { status: 204, headers: cors(req) })
  ),
})
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const headers = { ...cors(req), "Cache-Control": "no-store" }
    try {
      await ctx.runMutation(internal.media.reserve, {})
      if (Number(req.headers.get("content-length")) > 10 * 1024 * 1024)
        return new Response("File exceeds 10 MB.", { status: 413, headers })
      const reader = req.body?.getReader()
      if (!reader) throw new Error("Missing file.")
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const next = await reader.read()
        if (next.done) break
        size += next.value.length
        if (size > 10 * 1024 * 1024) {
          await reader.cancel()
          return new Response("File exceeds 10 MB.", { status: 413, headers })
        }
        chunks.push(next.value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      const mime = sniffImage(bytes)
      if (!mime || size < 16)
        return new Response("Use a valid JPEG, PNG, WebP, or GIF.", {
          status: 415,
          headers,
        })
      const storage = await ctx.storage.store(new Blob([bytes], { type: mime }))
      try {
        const id = await ctx.runMutation(internal.media.register, {
          storage,
          mime,
          size,
        })
        return Response.json({ id }, { headers })
      } catch (error) {
        await ctx.storage.delete(storage)
        throw error
      }
    } catch {
      return new Response("Upload denied. Check approval and upload limits.", {
        status: 403,
        headers,
      })
    }
  }),
})
http.route({
  path: "/media",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url)
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    }
    const file = await ctx.runQuery(internal.media.accessible, {
      id: url.searchParams.get("id") ?? "",
      post: url.searchParams.get("post") ?? undefined,
      profile: url.searchParams.get("profile") ?? undefined,
    })
    const blob = file ? await ctx.storage.get(file.storage) : null
    return blob && file
      ? new Response(blob, {
          headers: { ...headers, "Content-Type": file.mime },
        })
      : new Response("Not found", { status: 404, headers })
  }),
})
export default http
