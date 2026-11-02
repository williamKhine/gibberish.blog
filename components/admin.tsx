"use client"
import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "./ui/button"
import type { FunctionArgs } from "convex/server"
type Action = FunctionArgs<typeof api.community.moderate>["action"]
export function Admin() {
  const data = useQuery(api.community.adminQueue, {})
  const moderate = useMutation(api.community.moderate)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  async function act(action: Action, target: string) {
    const reason = prompt(
      "Reason for this moderation action (recorded in the audit trail):"
    )
    if (!reason) return
    setBusy(true)
    setError("")
    try {
      await moderate({ action, target, reason })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }
  if (!data) return <p className="empty-state">Opening the community desk…</p>
  return (
    <div className="page-width inner-page">
      <span className="eyebrow">THE COMMUNITY DESK</span>
      <h1>A little care goes a long way.</h1>
      <p className="intro">
        Review introductions, listen to reports, and keep this corner welcoming.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="admin-grid">
        <section>
          <h2 className="text-2xl">
            Writer applications ({data.applications.length})
          </h2>
          {!data.applications.length && (
            <p className="empty-state">All caught up.</p>
          )}
          {data.applications.map((a) => (
            <div className="panel" key={a._id}>
              <h3 className="mb-3 text-lg">
                {data.members.find((m) => m._id === a.member)?.name ?? a.member}
              </h3>
              <p>{a.introduction}</p>
              <h4 className="mt-5 mb-2">Writing sample</h4>
              <pre>{a.sample}</pre>
              <div className="row mt-5">
                <Button
                  disabled={busy}
                  onClick={() => void act("approve", a._id)}
                >
                  Approve writer
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => void act("reject", a._id)}
                >
                  Request a new application
                </Button>
              </div>
            </div>
          ))}
        </section>
        <section>
          <h2 className="text-2xl">Open reports ({data.reports.length})</h2>
          {!data.reports.length && (
            <p className="empty-state">Nothing waiting for review.</p>
          )}
          {data.reports.map((r) => (
            <div className="panel" key={r._id}>
              <span className="badge">{r.kind}</span>
              <p className="my-4">{r.reason}</p>
              <p className="muted break-all">Target: {r.target}</p>
              <pre className="my-4">{r.text}</pre>
              {r.href && (
                <Link className="subtle-link" href={r.href}>
                  Open reported content ↗
                </Link>
              )}
              <div className="row mt-4">
                <Button
                  disabled={busy}
                  variant="destructive"
                  onClick={() =>
                    void act(
                      r.kind === "post"
                        ? "remove-post"
                        : r.kind === "comment"
                          ? "remove-comment"
                          : "hide-profile",
                      r.target
                    )
                  }
                >
                  Remove public content
                </Button>
                {r.author && (
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => void act("suspend", r.author!)}
                  >
                    Suspend author
                  </Button>
                )}
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => void act("resolve", r._id)}
                >
                  Resolve report
                </Button>
              </div>
            </div>
          ))}
        </section>
      </div>
      <section className="panel">
        <h2>Members · most recent 100</h2>
        {data.members.map((m) => (
          <div className="draft-row" key={m._id}>
            <div>
              <b>{m.name}</b>
              <p className="muted">
                @{m.handle} ·{" "}
                {m.suspended ? "suspended" : m.approved ? "writer" : "reader"}
                {m.hidden ? " · profile hidden" : ""}
              </p>
            </div>
            <div className="row">
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  void act(m.suspended ? "reinstate" : "suspend", m._id)
                }
              >
                {m.suspended ? "Reinstate" : "Suspend"}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  void act(m.hidden ? "show-profile" : "hide-profile", m._id)
                }
              >
                {m.hidden ? "Show profile" : "Hide profile"}
              </Button>
            </div>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Audit trail · last 50 actions</h2>
        {data.audit.map((a) => (
          <div className="draft-row" key={a._id}>
            <div>
              <b>{a.action}</b>
              <p>{a.reason}</p>
              <p className="muted break-all">
                {a.actor} → {a.target}
              </p>
            </div>
            <time className="muted">
              {new Date(a._creationTime).toLocaleString()}
            </time>
          </div>
        ))}
      </section>
    </div>
  )
}
