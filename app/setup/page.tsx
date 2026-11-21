import Link from "next/link"
export const metadata = {
  title: "Connect your community",
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <div className="page-width narrow inner-page">
      <span className="eyebrow">A LITTLE ASSEMBLY REQUIRED</span>
      <h1>Your community is ready to connect.</h1>
      <p className="intro">
        This preview uses sample posts. Accounts, drafts, uploads, and
        moderation become available after the project owner configures email and
        password sign-in through Convex Auth.
      </p>
      <div className="panel">
        <h2>For the project owner</h2>
        <ol className="setup-list">
          <li>
            Create a Convex deployment and configure its auth signing keys.
          </li>
          <li>
            Configure Resend in Convex to send verification and password reset
            emails.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in
            the service values, and restart the app.
          </li>
          <li>
            Follow <code>README.md</code> for exact setup, testing, and Vercel
            deployment instructions.
          </li>
        </ol>
      </div>
      <Link className="button primary" href="/">
        Keep exploring the preview ↗
      </Link>
    </div>
  )
}
