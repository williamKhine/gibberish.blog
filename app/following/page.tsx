import { ProtectedPage as AuthGate } from "@/components/protected-page"
import { Feed } from "@/components/feed"
export default function Page() {
  return (
    <AuthGate>
      <div className="page-width inner-page">
        <span className="eyebrow">YOUR KIND OF PEOPLE</span>
        <h1>Familiar corners.</h1>
        <p className="intro">
          The latest from writers you follow. In order, always.
        </p>
        <Feed mode="following" />
      </div>
    </AuthGate>
  )
}
