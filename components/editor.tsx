"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DraftSaver } from "@/lib/autosave"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Button } from "./ui/button"
import { RichBody } from "./rich-body"
import { Upload } from "./upload"
import { MediaImage } from "./post-card"
const PrivateImage = Image.extend({
  addAttributes() {
    return { mediaId: { default: null }, alt: { default: "" } }
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      {
        src: `/api/media?id=${encodeURIComponent(HTMLAttributes.mediaId)}`,
        alt: HTMLAttributes.alt,
      },
    ]
  },
})
type Content = Doc<"posts">["working"]
export function Writer({ id }: { id: string }) {
  const doc = useQuery(api.community.draft, { id: id as Id<"posts"> })
  const user = useQuery(api.community.me)
  return doc && user ? (
    <EditorForm key={doc._id} doc={doc} approved={user.approved} />
  ) : (
    <p className="empty-state">Opening your notebook…</p>
  )
}
function EditorForm({
  doc,
  approved,
}: {
  doc: Doc<"posts">
  approved: boolean
}) {
  const save = useMutation(api.community.saveDraft)
  const action = useMutation(api.community.postAction)
  const router = useRouter()
  const [value, setValue] = useState<Content>(doc.working)
  const current = useRef(value)
  const [initialDraft] = useState(() => ({
    content: doc.working,
    revision: doc.revision,
  }))
  const saver = useRef<DraftSaver<Content> | null>(null)
  const [status, setStatus] = useState("All changes saved")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [recovery, setRecovery] = useState<Content | null | undefined>(
    undefined
  )
  const key = `gibberish:draft:${doc.author}:${doc._id}`
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
      PrivateImage,
    ],
    content: JSON.parse(doc.working.body),
    immediatelyRender: false,
    onUpdate: ({ editor }) =>
      change({ ...current.current, body: JSON.stringify(editor.getJSON()) }),
  })
  function change(next: Content) {
    current.current = next
    setValue(next)
    setStatus("Unsaved changes")
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          content: next,
          revision: saver.current?.revision ?? doc.revision,
        })
      )
    } catch {
      setStatus("Unsaved changes · local recovery unavailable")
    }
  }
  useEffect(() => {
    if (saver.current) return
    saver.current = new DraftSaver(
      initialDraft.revision,
      initialDraft.content,
      () => current.current,
      (content, revision) => save({ id: doc._id, revision, content }),
      (state) => {
        if (state === "saved") {
          setStatus("All changes saved")
          try {
            localStorage.removeItem(key)
          } catch {}
        } else setStatus(state === "saving" ? "Saving…" : "Not saved")
      }
    )
  }, [doc._id, initialDraft, key, save])

  const flush = useCallback(async () => {
    try {
      const draftSaver = saver.current
      if (!draftSaver) throw new Error("Draft saving is still starting.")
      await draftSaver.flush()
      setError("")
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save failed. Your writing is still here."
      )
      throw e
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const { content } = JSON.parse(raw)
          if (
            content &&
            JSON.stringify(content) !== JSON.stringify(initialDraft.content)
          ) {
            setRecovery(content)
            return
          }
        }
      } catch {}
      setRecovery(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialDraft, key])
  useEffect(() => {
    if (!saver.current?.dirty) return
    const timer = setTimeout(() => void flush().catch(() => {}), 900)
    return () => clearTimeout(timer)
  }, [flush, value])
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saver.current?.dirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [])
  async function perform(
    kind: "publish" | "unpublish" | "delete" | "comments"
  ) {
    if (
      kind === "delete" &&
      !confirm("Delete this post and its comments permanently?")
    )
      return
    setBusy(true)
    setError("")
    try {
      await flush()
      await action({ id: doc._id, action: kind })
      if (kind === "delete") {
        localStorage.removeItem(key)
        router.push("/dashboard")
      } else if (kind === "publish") {
        setStatus("Published. Your words are out in the world.")
        router.push(
          `/p/${doc._id}/${doc.working.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "untitled"}`
        )
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete that action."
      )
    } finally {
      setBusy(false)
    }
  }
  if (!editor || recovery === undefined)
    return <p className="empty-state">Sharpening the pencils…</p>
  return (
    <div className="page-width narrow inner-page">
      <div className="row-between">
        <Link href="/dashboard" className="subtle-link">
          ← Your drafts
        </Link>
        <span className="muted" role="status">
          {status}
        </span>
      </div>
      {recovery && (
        <div className="panel">
          <p>
            There’s unsaved writing from your last visit. Restore it before
            making new changes.
          </p>
          <div className="row">
            <Button
              onClick={() => {
                change(recovery)
                editor.commands.setContent(JSON.parse(recovery.body))
                setRecovery(null)
              }}
            >
              Restore writing
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem(key)
                setRecovery(null)
              }}
            >
              Discard recovery
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
          <Button
            className="ml-3"
            variant="outline"
            onClick={() => void flush().catch(() => {})}
          >
            Retry save
          </Button>
        </div>
      )}
      <label className="sr-only" htmlFor="post-title">
        Post title
      </label>
      <input
        id="post-title"
        className="editor-title"
        maxLength={180}
        placeholder="A title, if you please…"
        value={value.title}
        onChange={(e) => change({ ...value, title: e.target.value })}
      />
      <div className="row-between mb-5">
        <span className="muted">
          {doc.published
            ? "Published version stays unchanged until you publish changes."
            : "Just you and the page. This draft is private."}
        </span>
        <Button variant="outline" onClick={() => setPreview(!preview)}>
          {preview ? "Keep writing" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <RichBody body={value.body} />
      ) : (
        <>
          <div className="toolbar" aria-label="Formatting tools">
            {[
              ["Bold", () => editor.chain().focus().toggleBold().run()],
              ["Italic", () => editor.chain().focus().toggleItalic().run()],
              [
                "Heading",
                () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              ],
              ["List", () => editor.chain().focus().toggleBulletList().run()],
              [
                "Numbered list",
                () => editor.chain().focus().toggleOrderedList().run(),
              ],
              ["Quote", () => editor.chain().focus().toggleBlockquote().run()],
              ["Code", () => editor.chain().focus().toggleCodeBlock().run()],
              [
                "Link",
                () => {
                  const url = prompt("Link URL (https://…)")
                  if (url === null) return
                  if (url === "") editor.chain().focus().unsetLink().run()
                  else if (/^https?:\/\//i.test(url))
                    editor.chain().focus().setLink({ href: url }).run()
                  else setError("Use a link starting with https:// or http://.")
                },
              ],
              ["Undo", () => editor.chain().focus().undo().run()],
              ["Redo", () => editor.chain().focus().redo().run()],
            ].map(([label, fn]) => (
              <Button
                key={String(label)}
                variant="ghost"
                onClick={fn as () => void}
              >
                {String(label)}
              </Button>
            ))}
          </div>
          <EditorContent editor={editor} className="editor-surface rich-body" />
        </>
      )}
      {approved && (
        <Upload
          onUpload={(id) => {
            const alt =
              prompt("Describe the image for readers using a screen reader:") ??
              ""
            editor
              .chain()
              .focus()
              .insertContent({ type: "image", attrs: { mediaId: id, alt } })
              .run()
          }}
        />
      )}
      <label className="field">
        <span>A tiny introduction (shown in the feed)</span>
        <textarea
          maxLength={300}
          value={value.excerpt}
          onChange={(e) => change({ ...value, excerpt: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Tags · up to five, separated by commas</span>
        <input
          defaultValue={value.tags.join(", ")}
          onBlur={(e) =>
            change({
              ...current.current,
              tags: [
                ...new Set(
                  e.target.value
                    .split(",")
                    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
                    .filter(Boolean)
                ),
              ],
            })
          }
        />
      </label>
      {approved && (
        <Upload
          label="Optional cover image"
          onUpload={(id) =>
            change({ ...current.current, cover: id as Id<"media"> })
          }
        />
      )}
      {value.cover && (
        <>
          <MediaImage
            id={value.cover}
            alt="Post cover"
            className="article-cover"
          />
          <Button
            variant="outline"
            onClick={() => change({ ...value, cover: undefined })}
          >
            Remove cover
          </Button>
        </>
      )}
      <div className="row mt-7">
        <Button
          size="lg"
          disabled={busy || !approved || doc.removed || !!recovery}
          onClick={() => void perform("publish")}
        >
          {doc.published ? "Publish changes ↗" : "Send it into the world ↗"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => void flush().catch(() => {})}
        >
          Save draft
        </Button>
        {doc.published && (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void perform("unpublish")}
            >
              Unpublish
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void perform("comments")}
            >
              {doc.commentsClosed ? "Open comments" : "Close comments"}
            </Button>
          </>
        )}
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => void perform("delete")}
        >
          Delete
        </Button>
      </div>
      {!approved && (
        <p className="muted mt-5">
          Keep drafting. Writer approval unlocks publishing and images.
        </p>
      )}
    </div>
  )
}
