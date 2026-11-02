"use client"
import Link from "next/link"
import { useState } from "react"
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { configured } from "@/lib/config"
import { Button } from "./ui/button"
export function ReportButton({
  kind,
  target,
}: {
  kind: "post" | "comment" | "profile"
  target: string
}) {
  return configured ? <ConnectedReport kind={kind} target={target} /> : null
}
function ConnectedReport({
  kind,
  target,
}: {
  kind: "post" | "comment" | "profile"
  target: string
}) {
  const { isAuthenticated } = useConvexAuth()
  const report = useMutation(api.community.report)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(!open)}>
        Report
      </Button>
      {open && (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              await report({ kind, target, reason })
              setSent(true)
              setError("")
            } catch (e) {
              setError(e instanceof Error ? e.message : "Report failed.")
            } finally {
              setBusy(false)
            }
          }}
        >
          {!isAuthenticated ? (
            <Link href="/sign-in">Sign in to report this content.</Link>
          ) : sent ? (
            <p role="status">Thanks. Your report is with the community desk.</p>
          ) : (
            <>
              <label className="field">
                <span>What should we look at?</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <Button disabled={busy} type="submit">
                Send report
              </Button>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </>
  )
}
export function Social({ post, closed }: { post: string; closed: boolean }) {
  return configured ? (
    <LiveSocial post={post as Id<"posts">} closed={closed} />
  ) : (
    <div className="panel">
      <h2>A conversation starts here.</h2>
      <p>
        This is a sample post.{" "}
        <Link className="subtle-link" href="/setup">
          Connect your community
        </Link>{" "}
        to react, follow writers, and join in.
      </p>
    </div>
  )
}
function LiveSocial({ post, closed }: { post: Id<"posts">; closed: boolean }) {
  const { isAuthenticated } = useConvexAuth()
  const user = useQuery(api.community.me, isAuthenticated ? {} : "skip")
  const social = useQuery(api.community.social, { post })
  const interact = useMutation(api.community.interact)
  const comment = useMutation(api.community.comment)
  const { results, status, loadMore } = usePaginatedQuery(
    api.community.comments,
    { post },
    { initialNumItems: 30 }
  )
  const [error, setError] = useState("")
  const [text, setText] = useState("")
  const [parent, setParent] = useState<Id<"comments">>()
  const [editing, setEditing] = useState<Id<"comments">>()
  const [busy, setBusy] = useState(false)
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError("")
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="social-bar row">
        {["💛", "😂", "🤯", "✨"].map((emoji) => (
          <Button
            key={emoji}
            variant={social?.mine === emoji ? "default" : "outline"}
            disabled={busy || !user}
            aria-label={`React ${emoji}`}
            aria-pressed={social?.mine === emoji}
            onClick={() =>
              void run(() => interact({ post, action: "reaction", emoji }))
            }
          >
            {emoji} {social?.counts.find((r) => r.emoji === emoji)?.count ?? 0}
          </Button>
        ))}
        <Button
          variant="outline"
          disabled={busy || !user}
          onClick={() => void run(() => interact({ post, action: "bookmark" }))}
        >
          {social?.bookmarked ? "✓ Saved" : "Bookmark"}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !user}
          onClick={() => void run(() => interact({ post, action: "follow" }))}
        >
          {social?.following ? "✓ Following" : "Follow writer"}
        </Button>
        <ReportButton kind="post" target={post} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">A few words back</h2>
        {!user ? (
          <p className="muted mt-4">
            <Link className="subtle-link" href="/dashboard">
              Sign in and join the community
            </Link>{" "}
            to save posts and react.
          </p>
        ) : !user.approved ? (
          <p className="muted mt-4">
            <Link className="subtle-link" href="/dashboard">
              Writer approval
            </Link>{" "}
            unlocks comments.
          </p>
        ) : closed ? (
          <p className="muted mt-4">
            The writer has closed comments on this post.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                await comment({ post, text, parent, id: editing })
                setText("")
                setParent(undefined)
                setEditing(undefined)
              })
            }}
          >
            <label className="field">
              <span>
                {editing
                  ? "Edit your comment"
                  : parent
                    ? "Reply to this thought"
                    : "Add a little thought"}
              </span>
              <textarea
                required
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className="row">
              <Button type="submit" disabled={busy}>
                {editing ? "Save changes" : "Leave a comment"}
              </Button>
              {(parent || editing) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setParent(undefined)
                    setEditing(undefined)
                    setText("")
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
        {results.length === 0 && status === "Exhausted" && (
          <p className="muted mt-7">Quiet in here. Room for a kind thought.</p>
        )}
        {[
          ...results
            .filter((c) => !c.parent)
            .flatMap((root) => [
              root,
              ...results.filter((c) => c.parent === root._id),
            ]),
          ...results.filter(
            (c) => c.parent && !results.some((p) => p._id === c.parent)
          ),
        ].map((c) => (
          <div
            id={`comment-${c._id}`}
            key={c._id}
            className={`comment-row ${c.parent ? "reply" : ""}`}
          >
            <Link href={`/u/${c.author.handle}`}>
              <b>{c.author.name}</b>
            </Link>
            {c.parent && <span className="muted"> · reply</span>}
            <p>{c.text}</p>
            <div className="row">
              {user?.approved && !closed && !c.parent && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setParent(c._id)
                    setEditing(undefined)
                    setText("")
                  }}
                >
                  Reply
                </Button>
              )}
              {user?._id === c.author._id && (
                <>
                  <Button
                    variant="ghost"
                    disabled={busy || closed}
                    onClick={() => {
                      setEditing(c._id)
                      setText(c.text)
                      setParent(undefined)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Delete your comment?"))
                        void run(() =>
                          comment({ post, text: "", id: c._id, remove: true })
                        )
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
              <ReportButton kind="comment" target={c._id} />
            </div>
          </div>
        ))}
        {status === "CanLoadMore" && (
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => loadMore(30)}
          >
            More comments ↓
          </Button>
        )}
      </section>
    </>
  )
}
export function FollowButton({ target }: { target: string }) {
  return configured ? <LiveFollow target={target as Id<"members">} /> : null
}
function LiveFollow({ target }: { target: Id<"members"> }) {
  const user = useQuery(api.community.me)
  const following = useQuery(api.community.following, { target })
  const toggle = useMutation(api.community.toggleFollow)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  if (!user)
    return (
      <Link href="/dashboard" className="subtle-link">
        Join to follow this writer
      </Link>
    )
  if (user._id === target) return null
  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await toggle({ target })
            setError("")
          } catch (e) {
            setError(e instanceof Error ? e.message : "Please try again.")
          } finally {
            setBusy(false)
          }
        }}
      >
        {following ? "✓ Following" : "Follow this writer"}
      </Button>
      {error && <p className="error">{error}</p>}
    </>
  )
}
