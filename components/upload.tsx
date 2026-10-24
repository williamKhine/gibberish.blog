"use client"
import { useAuth } from "@clerk/nextjs"
import { useState } from "react"
import { convexSite } from "@/lib/config"
export function Upload({
  onUpload,
  label = "Upload an image or GIF",
}: {
  onUpload: (id: string) => void
  label?: string
}) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return (
    <label className="field file-field">
      <span>{busy ? "Uploading…" : label}</span>
      <input
        type="file"
        disabled={busy}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setError("")
          setBusy(true)
          try {
            if (file.size > 10 * 1024 * 1024)
              throw new Error("Choose a file under 10 MB.")
            if (!convexSite)
              throw new Error("The media service has not been configured.")
            const token = await getToken({ template: "convex" })
            if (!token) throw new Error("Sign in again before uploading.")
            const response = await fetch(`${convexSite}/upload`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": file.type,
              },
              body: file,
            })
            if (!response.ok) throw new Error(await response.text())
            onUpload((await response.json()).id)
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed.")
          } finally {
            setBusy(false)
          }
        }}
      />
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
