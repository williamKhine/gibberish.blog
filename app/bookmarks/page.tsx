import { ProtectedPage as AuthGate } from "@/components/protected-page"
import { Feed } from "@/components/feed"
export default function Page() {
  return (
    <AuthGate>
      <div className="page-width inner-page">
        <span className="eyebrow">JUST FOR YOU</span>
        <h1>Little things, kept.</h1>
        <p className="intro">
          Your private collection of posts to come back to.
        </p>
        <Feed mode="bookmarks" />
      </div>
    </AuthGate>
  )
}
