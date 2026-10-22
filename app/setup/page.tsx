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
        moderation become available after the project owner connects Clerk and
        Convex.
      </p>
      <div className="panel">
        <h2>For the project owner</h2>
        <ol className="setup-list">
          <li>
            Create a Clerk application with verified email and Google sign-in.
            Enable its Convex integration.
          </li>
          <li>
            Create a Convex project and configure the Clerk issuer,
            administrator identity, and allowed site origins.
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
