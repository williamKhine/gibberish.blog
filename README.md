# Gibberish.blog

A scrapbook-style blogging community built with Next.js, Convex, Convex Auth, shadcn/ui, and Tiptap. Anyone can register to follow, bookmark, and react. A reviewed writer application unlocks public posts, comments, media uploads, and customized profiles.

## Run the preview

Requires Node.js 24 and npm. Dependencies and exact versions are locked in `package-lock.json`.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without the two Convex URLs, the app displays a **labeled sample-data preview**. Sample posts never enter the database or the sitemap/RSS feed. Protected pages show a setup gate; preview mode does not simulate authenticated actions.

## Connect development services

1. Copy `.env.example` to `.env.local`.
2. Run `npx convex dev` and create or select a development deployment. It fills in `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` and deploys the backend.
3. Set `NEXT_PUBLIC_CONVEX_SITE_URL` to the deployment's HTTP Actions URL, typically `https://your-deployment.convex.site`. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally.
4. Set `SITE_URL=http://localhost:3000` on the Convex deployment. Follow [Convex Auth manual setup](https://labs.convex.dev/auth/setup/manual) to generate and set `JWT_PRIVATE_KEY` and `JWKS`. The auth code and schema are already in this repo.
5. Create a Google OAuth web client. Register `https://your-deployment.convex.site/api/auth/callback/google` as its authorized redirect URI. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` on the Convex deployment. If the OAuth app is in testing mode, add the accounts you'll use as test users. See [Google provider setup](https://labs.convex.dev/auth/config/oauth/google).
6. Keep `npx convex dev` running and start Next.js with `npm run dev`. Open the exact origin in `SITE_URL`. To allow uploads from additional origins, set `UPLOAD_ALLOWED_ORIGINS` on Convex to a comma-separated list that includes the app origin.
7. Sign in with Google and visit `/dashboard`. In the Convex dashboard, find your row in the `users` table and copy its `_id` into `ADMIN_AUTH_USER_IDS`. Use comma-separated IDs for multiple administrators. Visit `/admin` to review applications. Submit and approve a writer application for your own account if you also want to publish.

No production accounts, secrets, or deployments are included. Never place secret keys in `NEXT_PUBLIC_` variables or commit `.env.local`.

## What is implemented

- Chronological discovery, tags, text search, following feed, private bookmarks, and paginated results.
- Server-rendered public articles and profiles, stable post IDs with slug redirects, metadata, a social preview image, sitemap, RSS, and robots configuration.
- Private rich-text drafts, serialized debounced autosave, local recovery, stale-revision detection, preview, publishing, separate working/published versions, unpublishing, deletion, and comment controls.
- Curated profile colors/stickers, unique handles, display names, bios, avatar/cover uploads, and writer following.
- Four preset reactions, plain-text comments with one reply level, comment editing/deletion, reports, writer applications, moderation, suspension, and audit records.
- Exact shadcn preset `b5twFbYFvO`: Base UI Mira, mist, yellow, small radius, Roboto Slab, Oxanium, Hugeicons, translucent menus. Fonts are self-hosted through Fontsource. The generated `components.json` and original preset color variables are retained.
- Responsive layout, dark/light themes, reduced motion, keyboard focus, skip navigation, and accessible form labels.

## Access and media behavior

All mutations enforce backend identity and ownership. Verified readers can create private drafts and applications; approval gates publishing, uploads, public profiles, and comments. Administrator queries can inspect submitted application samples and reported public content, **not private drafts**. Public reads exclude suspended/hidden authors and removed/unpublished posts. Writer approval never publishes the application sample.

Tiptap content is JSON, validated against a node/mark allowlist and rendered as React elements. Arbitrary HTML/CSS, executable links, external images, and embedded video are not supported. Images reference owned media records rather than arbitrary URLs.

Uploads go directly to authenticated Convex HTTP Actions, avoiding Vercel's request-body limit. The server enforces a 10 MiB limit while streaming, inspects binary signatures for JPEG/PNG/WebP/GIF, and stores ownership. File signature checking is not malware scanning or automated content classification; moderation is manual.

The app never exposes Convex storage URLs. `/api/media` forwards to a Convex access check and streams private/no-store responses. Owners can read their draft media. Public media requires a currently public post/profile that references it. Removal, unpublishing, or suspension revokes subsequent public fetches. Previously downloaded copies cannot be recalled. Unattached uploads remain private; storage reclamation/account erasure tooling is not part of this beta.

Limits are transactional fixed windows: three applications/day, fifteen uploads/hour, ten comments/minute, ten publishes/minute, sixty social interactions/minute, five reports/hour, ten profile changes/minute, and ten new drafts/minute. Convex functions are the authorization boundary; UI gates are only presentation.

Draft recovery is stored locally per account and post. A failed save retains editor content and its local copy. A concurrent server edit is rejected, with instructions to copy the text before reloading. Publishing waits for the latest save to complete.

## Checks

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
# Optional: exercise the built production app on the isolated test port
E2E_PRODUCTION=1 npm run test:e2e
```

Backend tests run against `convex-test` without a hosted account. They exercise approval, draft isolation, ownership, revision conflicts, publishing, moderation, rate limits, reactions, comments, uploads, and media permissions. Autosave tests exercise failures and concurrent saves. Playwright covers the unconfigured preview on desktop and mobile, including navigation, search, themes, access gates, responsive overflow, metadata, and feeds.

`npm run build` uses Next.js's supported Webpack compiler. Turbopack's build worker encountered a local sandbox/port error during validation; development still uses Turbopack.

Live Google sign-in, actual cloud storage, and Vercel deployment require provisioned accounts and must be smoke-tested after configuration. No claim of a live end-to-end auth test is made by the offline suite. The shadcn CLI is a development dependency; production does not need its registry tooling. Review development-tool advisories separately when updating dependencies.

## Vercel preview and beta launch

1. Use separate Google OAuth clients and Convex deployments for development and production. Do not connect an untrusted preview to production data.
2. Import this repository into Vercel as a Next.js project. Set all required `.env.example` Next.js values in the appropriate Preview/Production environment. Set `NEXT_PUBLIC_SITE_URL` to that environment's stable URL.
3. Deploy backend functions to the matching Convex environment before building the frontend. For manual production deployment, run `npx convex deploy` after configuring the production auth keys, OAuth credentials, site URL, and any administrator IDs. Alternatively use Convex's documented Vercel integration and scoped deploy key in Vercel's secret environment settings.
4. Keep the default frontend build command `npm run build`. Use the stable app origin as `SITE_URL` in each Convex deployment. Set each environment's `.convex.site` and `.convex.cloud` URLs correctly.
5. Register each deployment’s Convex HTTP callback URL with its matching Google OAuth client.
6. Smoke-test with two normal accounts and an administrator: signup → application → approval → draft → publish → follow/react/comment/report → moderation. Confirm another account and the administrator cannot read private drafts or their media. Confirm public image URLs stop working after unpublish/removal/suspension.
7. Verify Google sign-in and sign-out, uploads near the 10 MiB limit, mobile editing, sitemap/RSS, social previews, error handling, and production logs. Then promote the preview to the small beta.

Rollback the frontend through Vercel and deploy a compatible previous Convex revision if needed. Preserve data when rolling back; do not delete tables as a deployment shortcut.

## Beta boundaries

This is for a small, manually moderated community. The admin list shows the most recent 100 members and 50 audit actions; reports include their author so older reported members can still be suspended. Feeds paginate candidates before visibility filtering, so a page may be sparse and allow loading more. Large-scale ranking, full-text relevance tuning, storage cleanup, automated moderation, operational email, analytics, paid subscriptions, DMs, and custom-domain provisioning are outside this MVP.
