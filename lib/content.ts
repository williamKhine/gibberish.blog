import { ConvexError } from "convex/values"
export type RichNode = {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: RichNode[]
}
export const EMPTY_BODY = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
})
const nodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "image",
])
export function safeUrl(value: unknown) {
  return typeof value === "string" && /^https?:\/\//i.test(value)
    ? value
    : undefined
}
export function parseBody(body: string): RichNode {
  if (body.length > 200_000)
    throw new ConvexError("Post is too long (200 KB maximum).")
  const root = JSON.parse(body) as RichNode
  let count = 0
  function check(node: RichNode, depth: number) {
    if (!node || !nodes.has(node.type) || depth > 20 || ++count > 10000)
      throw new ConvexError("Unsupported post content.")
    if (node.text !== undefined && typeof node.text !== "string")
      throw new ConvexError("Invalid text.")
    if (
      node.type === "image" &&
      (typeof node.attrs?.mediaId !== "string" || node.attrs?.src)
    )
      throw new ConvexError("Images must use an uploaded media ID.")
    for (const mark of node.marks ?? []) {
      if (
        !["bold", "italic", "strike", "code", "link", "underline"].includes(
          mark.type
        )
      )
        throw new ConvexError("Unsupported text style.")
      if (mark.type === "link" && !safeUrl(mark.attrs?.href))
        throw new ConvexError("Links must start with https:// or http://.")
    }
    for (const child of node.content ?? []) check(child, depth + 1)
  }
  check(root, 0)
  if (root.type !== "doc") throw new ConvexError("Invalid document.")
  return root
}
export function plainText(node: RichNode): string {
  return node.text ?? (node.content ?? []).map(plainText).join(" ")
}
export function mediaIds(node: RichNode): string[] {
  return [
    ...(node.type === "image" ? [String(node.attrs?.mediaId)] : []),
    ...(node.content ?? []).flatMap(mediaIds),
  ]
}
export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "untitled"
  )
}
export function sniffImage(bytes: Uint8Array): string | null {
  const s = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b))
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg"
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "image/png"
  if (["GIF87a", "GIF89a"].includes(s(0, 6))) return "image/gif"
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "image/webp"
  return null
}
