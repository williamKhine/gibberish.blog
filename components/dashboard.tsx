"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "./ui/button"
import { Upload } from "./upload"
import { MediaImage } from "./post-card"
export function Dashboard() {
  const user = useQuery(api.community.me)
  const drafts = useQuery(api.community.drafts, {})
  const apply = useMutation(api.community.apply)
  const create = useMutation(api.community.createDraft)
  const saveProfile = useMutation(api.community.saveProfile)
  const router = useRouter()
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [avatar, setAvatar] = useState<string>()
  const [cover, setCover] = useState<string>()
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }
  if (!user) return null
  return (
    <div className="page-width narrow inner-page">
      <div className="row-between">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h1 className="page-title">
            Hello, {user.approved ? user.name : "future scribbler"}.
          </h1>
        </div>
      </div>
      <p className="intro">
        A safe place for your works in progress. Perfectly unfinished is fine.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {!user.approved && (
        <section className="panel">
          <h2>A little introduction goes a long way.</h2>
          {user.application && (
            <p className="success">
              Application: <b>{user.application.status}</b>
              {user.application.reason && ` — ${user.application.reason}`}
            </p>
          )}
          {user.application?.status !== "pending" && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                void run(() =>
                  apply({
                    introduction: String(data.get("introduction")),
                    sample: String(data.get("sample")),
                    accepted: data.get("accepted") === "on",
                  })
                )
              }}
            >
              <p>
                Tell us who you are and share a small sample. Approval unlocks
                public posts, comments, uploads, and your profile.
              </p>
              <label className="field">
                <span>A little about you</span>
                <textarea
                  name="introduction"
                  minLength={20}
                  maxLength={2000}
                  required
                  defaultValue={user.application?.introduction}
                />
              </label>
              <label className="field">
                <span>A sample of your writing (just words, for now)</span>
                <textarea
                  name="sample"
                  minLength={50}
                  maxLength={10000}
                  required
                  defaultValue={user.application?.sample}
                />
              </label>
              <label className="row">
                <input name="accepted" type="checkbox" required />
                <span>
                  I agree to the{" "}
                  <Link href="/rules" className="subtle-link">
                    house rules
                  </Link>
                  .
                </span>
              </label>
              <Button size="lg" className="mt-5" disabled={busy} type="submit">
                Send my introduction ↗
              </Button>
            </form>
          )}
        </section>
      )}
      <section className="panel">
        <div className="row-between">
          <h2>Your words, in progress</h2>
          <Button
            size="lg"
            disabled={busy}
            onClick={() =>
              void run(async () => router.push(`/write/${await create({})}`))
            }
          >
            + Start something
          </Button>
        </div>
        {drafts?.length === 0 && (
          <p className="muted">
            No drafts yet. The blank page is rooting for you.
          </p>
        )}
        {drafts?.map((p) => (
          <div className="draft-row" key={p._id}>
            <div>
              <Link href={`/write/${p._id}`}>
                <h3>{p.working.title || "A beautifully blank page"}</h3>
              </Link>
              <span className="badge">
                {p.removed
                  ? "Removed by moderator"
                  : p.published
                    ? "Published"
                    : "Private draft"}
              </span>
            </div>
            <Link className="subtle-link" href={`/write/${p._id}`}>
              Keep writing ↗
            </Link>
          </div>
        ))}
      </section>
      {user.approved && (
        <section className="panel">
          <h2>Make yourself at home</h2>
          <form
            key={user._id}
            onSubmit={(e) => {
              e.preventDefault()
              const d = new FormData(e.currentTarget)
              void run(async () => {
                await saveProfile({
                  handle: String(d.get("handle")),
                  name: String(d.get("name")),
                  bio: String(d.get("bio")),
                  accent: String(d.get("accent")),
                  sticker: String(d.get("sticker")),
                  avatar: (avatar ?? user.avatar) as Id<"media"> | undefined,
                  cover: (cover ?? user.cover) as Id<"media"> | undefined,
                })
                setNotice("Your corner is looking good.")
              })
            }}
          >
            <label className="field">
              <span>Handle</span>
              <input
                name="handle"
                pattern="[a-z0-9][a-z0-9-]{2,29}"
                defaultValue={user.handle}
                required
              />
            </label>
            <label className="field">
              <span>Display name</span>
              <input
                name="name"
                maxLength={60}
                defaultValue={user.name}
                required
              />
            </label>
            <label className="field">
              <span>A few words about you</span>
              <textarea name="bio" maxLength={400} defaultValue={user.bio} />
            </label>
            <div className="row">
              <label className="field">
                <span>Your color</span>
                <select name="accent" defaultValue={user.accent}>
                  {["yellow", "pink", "blue", "green"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Your sticker</span>
                <select name="sticker" defaultValue={user.sticker}>
                  {["✳", "✿", "★", "☻", "↗"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <Upload
              label="Avatar · JPEG, PNG, WebP, GIF · up to 10 MB"
              onUpload={setAvatar}
            />
            {(avatar || user.avatar) && (
              <MediaImage
                className="avatar"
                id={avatar ?? user.avatar!}
                profile={user._id}
                alt="Your avatar"
              />
            )}
            <Upload label="Profile cover · up to 10 MB" onUpload={setCover} />
            {(cover || user.cover) && (
              <MediaImage
                className="profile-cover"
                id={cover ?? user.cover!}
                profile={user._id}
                alt="Your cover"
              />
            )}
            <div className="row">
              <Button type="submit" size="lg" disabled={busy}>
                Save my corner
              </Button>
              <Link href={`/u/${user.handle}`} className="subtle-link">
                Visit my profile ↗
              </Link>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
