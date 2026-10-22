import { Fragment, type ReactNode } from "react"
import { parseBody, safeUrl, type RichNode } from "@/lib/content"
import { MediaImage } from "./post-card"
export function RichBody({ body, post }: { body: string; post?: string }) {
  let root: RichNode
  try {
    root = parseBody(body)
  } catch {
    return <p>Content could not be displayed.</p>
  }
  function render(node: RichNode, index: number): ReactNode {
    const children = node.content?.map(render)
    if (node.type === "text") {
      let text: ReactNode = node.text
      for (const m of node.marks ?? []) {
        if (m.type === "bold") text = <strong>{text}</strong>
        if (m.type === "italic") text = <em>{text}</em>
        if (m.type === "strike") text = <s>{text}</s>
        if (m.type === "underline") text = <u>{text}</u>
        if (m.type === "code") text = <code>{text}</code>
        if (m.type === "link")
          text = (
            <a
              href={safeUrl(m.attrs?.href)}
              rel="ugc nofollow noopener noreferrer"
            >
              {text}
            </a>
          )
      }
      return <Fragment key={index}>{text}</Fragment>
    }
    switch (node.type) {
      case "doc":
        return <Fragment key={index}>{children}</Fragment>
      case "paragraph":
        return <p key={index}>{children}</p>
      case "heading":
        return node.attrs?.level === 3 ? (
          <h3 key={index}>{children}</h3>
        ) : (
          <h2 key={index}>{children}</h2>
        )
      case "bulletList":
        return <ul key={index}>{children}</ul>
      case "orderedList":
        return <ol key={index}>{children}</ol>
      case "listItem":
        return <li key={index}>{children}</li>
      case "blockquote":
        return <blockquote key={index}>{children}</blockquote>
      case "codeBlock":
        return (
          <pre key={index}>
            <code>{children}</code>
          </pre>
        )
      case "hardBreak":
        return <br key={index} />
      case "horizontalRule":
        return <hr key={index} />
      case "image":
        return (
          <MediaImage
            key={index}
            id={String(node.attrs?.mediaId)}
            post={post}
            alt={String(node.attrs?.alt ?? "")}
          />
        )
      default:
        return null
    }
  }
  return <div className="rich-body">{render(root, 0)}</div>
}
