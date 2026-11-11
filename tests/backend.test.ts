import { beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api, internal } from "../convex/_generated/api"
import { parseBody, sniffImage } from "../lib/content"
const modules = import.meta.glob("../convex/**/*.ts")
const body = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "A few words worth sharing." }],
    },
  ],
})
const content = {
  title: "Hello, little world",
  body,
  excerpt: "A small thing.",
  tags: ["life"],
}
function setup() {
  const t = convexTest(schema, modules)
  return {
    t,
    alice: t.withIdentity({ subject: "alice", emailVerified: true }),
    bob: t.withIdentity({ subject: "bob", emailVerified: true }),
    admin: t.withIdentity({ subject: "admin", emailVerified: true }),
  }
}
async function approved() {
  const x = setup()
  const aliceId = await x.alice.mutation(api.community.ensureMember)
  const bobId = await x.bob.mutation(api.community.ensureMember)
  await x.admin.mutation(api.community.ensureMember)
  await x.t.run(async (ctx) => {
    await ctx.db.patch(aliceId, { approved: true })
    await ctx.db.patch(bobId, { approved: true })
  })
  return { ...x, aliceId, bobId }
}
async function published() {
  const x = await approved()
  const post = await x.alice.mutation(api.community.createDraft)
  await x.alice.mutation(api.community.saveDraft, {
    id: post,
    revision: 0,
    content,
  })
  await x.alice.mutation(api.community.postAction, {
    id: post,
    action: "publish",
  })
  return { ...x, post }
}
beforeEach(() => {
  vi.stubEnv("ADMIN_CLERK_IDS", "admin")
})
describe("membership and authorization", () => {
  it("requires verified identity to create a member", async () => {
    const { t } = setup()
    await expect(t.mutation(api.community.ensureMember)).rejects.toThrow()
    await expect(
      t
        .withIdentity({ subject: "x", emailVerified: false })
        .mutation(api.community.ensureMember)
    ).rejects.toThrow("verify")
  })
  it("makes member creation idempotent and does not expose identity in public profiles", async () => {
    const x = await approved()
    expect(await x.alice.mutation(api.community.ensureMember)).toBe(x.aliceId)
    const me = await x.alice.query(api.community.me)
    const p = await x.t.query(api.community.getProfile, { handle: me!.handle })
    expect(p).not.toHaveProperty("subject")
  })
  it("lets readers draft but blocks publishing, comments, uploads and public profiles", async () => {
    const { alice } = setup()
    await alice.mutation(api.community.ensureMember)
    const id = await alice.mutation(api.community.createDraft)
    await alice.mutation(api.community.saveDraft, { id, revision: 0, content })
    await expect(
      alice.mutation(api.community.postAction, { id, action: "publish" })
    ).rejects.toThrow("approval")
    await expect(alice.mutation(internal.media.reserve)).rejects.toThrow(
      "approval"
    )
    await expect(
      alice.mutation(api.community.saveProfile, {
        handle: "new-name",
        name: "Name",
        bio: "",
        accent: "pink",
        sticker: "✳",
      })
    ).rejects.toThrow("approval")
  })
  it("keeps private drafts inaccessible even to administrators", async () => {
    const x = await approved()
    const id = await x.alice.mutation(api.community.createDraft)
    await expect(x.bob.query(api.community.draft, { id })).rejects.toThrow()
    await expect(x.admin.query(api.community.draft, { id })).rejects.toThrow()
    await expect(
      x.bob.mutation(api.community.saveDraft, { id, revision: 0, content })
    ).rejects.toThrow()
    expect(await x.t.query(api.community.getPost, { id })).toBeNull()
  })
  it("prevents unauthorized administrative actions", async () => {
    const x = await approved()
    await expect(x.alice.query(api.community.adminQueue)).rejects.toThrow(
      "Administrator"
    )
    await expect(
      x.alice.mutation(api.community.moderate, {
        action: "suspend",
        target: x.bobId,
        reason: "test",
      })
    ).rejects.toThrow("Administrator")
  })
  it("processes application approval without publishing a sample", async () => {
    const { t, alice, admin } = setup()
    await alice.mutation(api.community.ensureMember)
    await admin.mutation(api.community.ensureMember)
    await alice.mutation(api.community.apply, {
      introduction: "I collect small observations about everyday life.",
      sample:
        "This is a long enough sample of my writing for a community application.",
      accepted: true,
    })
    const queue = await admin.query(api.community.adminQueue)
    await admin.mutation(api.community.moderate, {
      action: "approve",
      target: queue.applications[0]._id,
      reason: "Welcome aboard",
    })
    expect((await alice.query(api.community.me))?.approved).toBe(true)
    expect(
      (
        await t.query(api.community.feed, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page
    ).toHaveLength(0)
  })
  it("allows rejected applications to be revised and blocks duplicate pending applications", async () => {
    const x = setup()
    await x.alice.mutation(api.community.ensureMember)
    await x.admin.mutation(api.community.ensureMember)
    const application = {
      introduction: "I write about the little things in life.",
      sample:
        "A sample with at least fifty characters, shared only with the moderators.",
      accepted: true,
    }
    await x.alice.mutation(api.community.apply, application)
    await expect(
      x.alice.mutation(api.community.apply, application)
    ).rejects.toThrow("queue")
    const q = await x.admin.query(api.community.adminQueue)
    await x.admin.mutation(api.community.moderate, {
      action: "reject",
      target: q.applications[0]._id,
      reason: "Please add more detail",
    })
    await x.alice.mutation(api.community.apply, {
      ...application,
      introduction: "A revised introduction with a little more detail.",
    })
    expect((await x.alice.query(api.community.me))?.application?.status).toBe(
      "pending"
    )
  })
})
describe("publishing and moderation", () => {
  it("keeps edits private until republished and detects stale revision writes", async () => {
    const x = await published()
    await x.alice.mutation(api.community.saveDraft, {
      id: x.post,
      revision: 1,
      content: { ...content, title: "Private revision" },
    })
    expect(
      (await x.t.query(api.community.getPost, { id: x.post }))?.title
    ).toBe(content.title)
    await expect(
      x.alice.mutation(api.community.saveDraft, {
        id: x.post,
        revision: 1,
        content,
      })
    ).rejects.toThrow("another tab")
    await x.alice.mutation(api.community.postAction, {
      id: x.post,
      action: "publish",
    })
    expect(
      (await x.t.query(api.community.getPost, { id: x.post }))?.title
    ).toBe("Private revision")
  })
  it("unpublishes and deletes without leaving public content", async () => {
    const x = await published()
    await x.alice.mutation(api.community.postAction, {
      id: x.post,
      action: "unpublish",
    })
    expect(await x.t.query(api.community.getPost, { id: x.post })).toBeNull()
    await x.alice.mutation(api.community.postAction, {
      id: x.post,
      action: "delete",
    })
    await expect(
      x.alice.query(api.community.draft, { id: x.post })
    ).rejects.toThrow()
  })
  it("hides suspended writers immediately and disables their mutations", async () => {
    const x = await published()
    await x.admin.mutation(api.community.moderate, {
      action: "suspend",
      target: x.aliceId,
      reason: "Repeated abuse",
    })
    expect(await x.t.query(api.community.getPost, { id: x.post })).toBeNull()
    expect(
      (
        await x.t.query(api.community.feed, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page
    ).toHaveLength(0)
    await expect(x.alice.mutation(api.community.createDraft)).rejects.toThrow(
      "unavailable"
    )
  })
  it("does not allow removed content to be republished", async () => {
    const x = await published()
    await x.admin.mutation(api.community.moderate, {
      action: "remove-post",
      target: x.post,
      reason: "Violates house rules",
    })
    expect(await x.t.query(api.community.getPost, { id: x.post })).toBeNull()
    await expect(
      x.alice.mutation(api.community.postAction, {
        id: x.post,
        action: "publish",
      })
    ).rejects.toThrow("Moderated")
  })
  it("enforces profile uniqueness and curated customization", async () => {
    const x = await approved()
    const p = {
      handle: "a-writer",
      name: "A writer",
      bio: "Hello",
      accent: "pink",
      sticker: "✿",
    }
    await x.alice.mutation(api.community.saveProfile, p)
    await expect(x.bob.mutation(api.community.saveProfile, p)).rejects.toThrow(
      "taken"
    )
    await expect(
      x.bob.mutation(api.community.saveProfile, {
        ...p,
        handle: "other",
        accent: "javascript:",
      })
    ).rejects.toThrow()
  })
})
describe("social", () => {
  it("supports private bookmarks, follows, and a single reaction per reader per post", async () => {
    const x = await published()
    await x.bob.mutation(api.community.interact, {
      post: x.post,
      action: "bookmark",
    })
    await x.bob.mutation(api.community.interact, {
      post: x.post,
      action: "follow",
    })
    await x.bob.mutation(api.community.interact, {
      post: x.post,
      action: "reaction",
      emoji: "💛",
    })
    await x.bob.mutation(api.community.interact, {
      post: x.post,
      action: "reaction",
      emoji: "✨",
    })
    const state = await x.bob.query(api.community.social, { post: x.post })
    expect(state).toMatchObject({
      bookmarked: true,
      following: true,
      mine: "✨",
      counts: [{ emoji: "✨", count: 1 }],
    })
    expect(
      (await x.alice.query(api.community.social, { post: x.post }))?.bookmarked
    ).toBe(false)
    await expect(
      x.t.query(api.community.feed, {
        mode: "bookmarks",
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).rejects.toThrow()
  })
  it("supports one level of replies and comment ownership", async () => {
    const x = await published()
    const first = await x.bob.mutation(api.community.comment, {
      post: x.post,
      text: "A kind thought.",
    })
    const reply = await x.alice.mutation(api.community.comment, {
      post: x.post,
      text: "Thank you!",
      parent: first!,
    })
    await expect(
      x.bob.mutation(api.community.comment, {
        post: x.post,
        text: "Too nested",
        parent: reply!,
      })
    ).rejects.toThrow("Reply")
    await expect(
      x.alice.mutation(api.community.comment, {
        post: x.post,
        text: "Take over",
        id: first!,
      })
    ).rejects.toThrow("unavailable")
    await x.bob.mutation(api.community.comment, {
      post: x.post,
      text: "Updated thought",
      id: first!,
    })
  })
  it("blocks new comments when closed while allowing owner deletion", async () => {
    const x = await published()
    const c = await x.bob.mutation(api.community.comment, {
      post: x.post,
      text: "Before closure",
    })
    await x.alice.mutation(api.community.postAction, {
      id: x.post,
      action: "comments",
    })
    await expect(
      x.bob.mutation(api.community.comment, {
        post: x.post,
        text: "After closure",
      })
    ).rejects.toThrow("closed")
    await x.bob.mutation(api.community.comment, {
      post: x.post,
      id: c!,
      text: "",
      remove: true,
    })
    expect(
      (
        await x.t.query(api.community.comments, {
          post: x.post,
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page
    ).toHaveLength(0)
  })
  it("rate limits comments and reports and records administrative reasons", async () => {
    const x = await published()
    for (let i = 0; i < 10; i++)
      await x.bob.mutation(api.community.comment, {
        post: x.post,
        text: `Thought ${i}`,
      })
    await expect(
      x.bob.mutation(api.community.comment, { post: x.post, text: "Too many" })
    ).rejects.toThrow("Too many")
    for (let i = 0; i < 5; i++)
      await x.bob.mutation(api.community.report, {
        kind: "post",
        target: x.post,
        reason: "Please review this content.",
      })
    await expect(
      x.bob.mutation(api.community.report, {
        kind: "post",
        target: x.post,
        reason: "Please review this content.",
      })
    ).rejects.toThrow("Too many")
    const q = await x.admin.query(api.community.adminQueue)
    await x.admin.mutation(api.community.moderate, {
      action: "resolve",
      target: q.reports[0]._id,
      reason: "Reviewed and resolved",
    })
    expect(
      (await x.admin.query(api.community.adminQueue)).audit[0].reason
    ).toBe("Reviewed and resolved")
  })
})
describe("media and content safety", () => {
  it("recognizes supported signatures and rejects SVG/HTML", () => {
    expect(sniffImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      "image/png"
    )
    expect(sniffImage(new TextEncoder().encode("GIF89a1234567890"))).toBe(
      "image/gif"
    )
    expect(
      sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))
    ).toBeNull()
  })
  it("rejects arbitrary markup, dangerous links, and external image URLs", () => {
    expect(() => parseBody(JSON.stringify({ type: "script" }))).toThrow()
    expect(() =>
      parseBody(
        JSON.stringify({
          type: "doc",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        })
      )
    ).toThrow("Links")
    expect(() =>
      parseBody(
        JSON.stringify({
          type: "doc",
          content: [
            { type: "image", attrs: { src: "https://example.com/x.png" } },
          ],
        })
      )
    ).toThrow("uploaded")
  })
  it("protects draft media, validates ownership, and revokes public media on removal", async () => {
    const x = await published()
    const media = await x.alice.run(async (ctx) => {
      const storage = await ctx.storage.store(
        new Blob(["test"], { type: "image/png" })
      )
      return ctx.db.insert("media", {
        owner: x.aliceId,
        storage,
        mime: "image/png",
        size: 4,
      })
    })
    expect(await x.t.query(internal.media.accessible, { id: media })).toBeNull()
    expect(
      await x.bob.query(internal.media.accessible, { id: media })
    ).toBeNull()
    expect(
      await x.alice.query(internal.media.accessible, { id: media })
    ).not.toBeNull()
    await expect(
      x.bob.mutation(api.community.saveProfile, {
        handle: "other-writer",
        name: "Bob",
        bio: "",
        accent: "blue",
        sticker: "★",
        avatar: media,
      })
    ).rejects.toThrow("another")
    await x.alice.mutation(api.community.saveDraft, {
      id: x.post,
      revision: 1,
      content: { ...content, cover: media },
    })
    expect(
      await x.t.query(internal.media.accessible, { id: media, post: x.post })
    ).toBeNull()
    await x.alice.mutation(api.community.postAction, {
      id: x.post,
      action: "publish",
    })
    expect(
      await x.t.query(internal.media.accessible, { id: media, post: x.post })
    ).not.toBeNull()
    await x.admin.mutation(api.community.moderate, {
      action: "remove-post",
      target: x.post,
      reason: "Remove this post",
    })
    expect(
      await x.t.query(internal.media.accessible, { id: media, post: x.post })
    ).toBeNull()
  })
  it("rejects unauthenticated uploads and returns no-store for inaccessible media", async () => {
    const { t } = setup()
    const upload = await t.fetch("/upload", {
      method: "POST",
      body: "not an image",
    })
    expect(upload.status).toBe(403)
    const response = await t.fetch("/media?id=invalid")
    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toContain("no-store")
  })
})
describe("upload HTTP boundary and complete publishing journey", () => {
  it("accepts a signed-in approved upload, rejects wrong types and oversized bodies", async () => {
    const x = await approved()
    const bytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII="
      ),
      (c) => c.charCodeAt(0)
    )
    const response = await x.alice.fetch("/upload", {
      method: "POST",
      headers: { "Content-Type": "image/png", Origin: "http://localhost:3000" },
      body: bytes,
    })
    expect(response.status).toBe(200)
    const { id } = await response.json()
    expect(
      await x.alice.query(internal.media.accessible, { id })
    ).not.toBeNull()
    expect(await x.t.query(internal.media.accessible, { id })).toBeNull()
    const wrong = await x.alice.fetch("/upload", {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: '<svg onload="alert(1)">malicious</svg>',
    })
    expect(wrong.status).toBe(415)
    const large = await x.alice.fetch("/upload", {
      method: "POST",
      headers: { "Content-Length": String(10 * 1024 * 1024 + 1) },
      body: "x",
    })
    expect(large.status).toBe(413)
  })
  it("limits upload reservation and publishing requests", async () => {
    const x = await published()
    for (let i = 0; i < 15; i++) await x.alice.mutation(internal.media.reserve)
    await expect(x.alice.mutation(internal.media.reserve)).rejects.toThrow(
      "Too many"
    )
    for (let i = 0; i < 9; i++)
      await x.alice.mutation(api.community.postAction, {
        id: x.post,
        action: "publish",
      })
    await expect(
      x.alice.mutation(api.community.postAction, {
        id: x.post,
        action: "publish",
      })
    ).rejects.toThrow("Too many")
  })
  it("hides profile media after suspension and prevents reporting private drafts", async () => {
    const x = await approved()
    const media = await x.alice.run(async (ctx) => {
      const storage = await ctx.storage.store(new Blob(["test"]))
      return ctx.db.insert("media", {
        owner: x.aliceId,
        storage,
        mime: "image/png",
        size: 4,
      })
    })
    await x.alice.mutation(api.community.saveProfile, {
      handle: "public-writer",
      name: "Alice",
      bio: "hello",
      accent: "pink",
      sticker: "✳",
      avatar: media,
    })
    expect(
      await x.t.query(internal.media.accessible, {
        id: media,
        profile: x.aliceId,
      })
    ).not.toBeNull()
    await x.admin.mutation(api.community.moderate, {
      action: "suspend",
      target: x.aliceId,
      reason: "Account suspended",
    })
    expect(
      await x.t.query(internal.media.accessible, {
        id: media,
        profile: x.aliceId,
      })
    ).toBeNull()
    const draft = await x.bob.mutation(api.community.createDraft)
    await expect(
      x.admin.mutation(api.community.report, {
        kind: "post",
        target: draft,
        reason: "A private draft should not be discoverable",
      })
    ).rejects.toThrow("unavailable")
  })
  it("joins, applies, gets approved, publishes, receives a comment and gets reported", async () => {
    const x = setup()
    const aliceId = await x.alice.mutation(api.community.ensureMember)
    await x.admin.mutation(api.community.ensureMember)
    await x.bob.mutation(api.community.ensureMember)
    await x.alice.mutation(api.community.apply, {
      introduction: "I would like to share small stories about my day.",
      sample:
        "This is a tiny sample of the stories I like to write, including wandering thoughts.",
      accepted: true,
    })
    let q = await x.admin.query(api.community.adminQueue)
    await x.admin.mutation(api.community.moderate, {
      action: "approve",
      target: q.applications[0]._id,
      reason: "Welcome to the community",
    })
    const post = await x.alice.mutation(api.community.createDraft)
    await x.alice.mutation(api.community.saveDraft, {
      id: post,
      revision: 0,
      content,
    })
    await x.alice.mutation(api.community.postAction, {
      id: post,
      action: "publish",
    })
    expect(
      (
        await x.t.query(api.community.feed, {
          paginationOpts: { numItems: 12, cursor: null },
        })
      ).page[0]._id
    ).toBe(post)
    await x.bob.mutation(api.community.toggleFollow, { target: aliceId })
    expect(
      await x.bob.query(api.community.following, { target: aliceId })
    ).toBe(true)
    await expect(
      x.bob.mutation(api.community.comment, {
        post,
        text: "Reader cannot comment yet",
      })
    ).rejects.toThrow("approval")
    await x.alice.mutation(api.community.comment, {
      post,
      text: "A thought from the author",
    })
    await x.bob.mutation(api.community.report, {
      kind: "post",
      target: post,
      reason: "Please review this post for the community.",
    })
    q = await x.admin.query(api.community.adminQueue)
    expect(q.reports[0].text).toContain(content.title)
    await x.admin.mutation(api.community.moderate, {
      action: "remove-post",
      target: post,
      reason: "Removed after review",
    })
    expect(await x.t.query(api.community.getPost, { id: post })).toBeNull()
  })
})
