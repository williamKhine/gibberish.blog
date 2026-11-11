import { test, expect } from "@playwright/test"
test("home is readable, navigable, and fits the viewport", async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Absolutely gibberish"
  )
  await expect(
    page.getByText("Sample-data preview", { exact: false })
  ).toBeVisible()
  await expect(page.locator(".post-card")).toHaveCount(6)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: `test-results/home-${info.project.name}.png`,
    fullPage: true,
  })
  expect(errors).toEqual([])
})
test("article and author profile render with stable links", async ({
  page,
}) => {
  await page.goto("/")
  await page
    .getByRole("heading", {
      name: "An incomplete guide to doing absolutely nothing",
    })
    .click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "An incomplete guide to doing absolutely nothing"
  )
  await expect(page.locator(".rich-body")).toContainText(
    "A small, unnecessary observation"
  )
  await page.locator(".author-name").click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("milo maybe")
  await expect(page.locator(".post-card")).toHaveCount(2)
})
test("search and tags filter the sample collection", async ({ page }) => {
  await page.goto("/search")
  await page.getByRole("searchbox").fill("houseplants")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.locator(".post-card")).toHaveCount(1)
  await page.goto("/tags/art")
  await expect(page.locator(".post-card")).toHaveCount(1)
  await page.goto("/search?q=not-a-real-topic")
  await expect(
    page.getByText("No little wonders found.", { exact: false })
  ).toBeVisible()
})
test("theme toggle and keyboard skip link work", async ({ page }) => {
  await page.goto("/")
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("link", { name: "Skip to content" })
  ).toBeFocused()
  const before = await page.locator("html").getAttribute("class")
  await page.getByRole("button", { name: "Toggle color theme" }).click()
  await expect
    .poll(() => page.locator("html").getAttribute("class"))
    .not.toBe(before)
})
test("unconfigured protected routes show an honest setup gate", async ({
  page,
}) => {
  for (const route of [
    "/dashboard",
    "/admin",
    "/following",
    "/bookmarks",
    "/write/demo",
  ]) {
    await page.goto(route)
    await expect(
      page.getByRole("heading", { name: "Almost home." })
    ).toBeVisible()
  }
  await page.getByRole("link", { name: "Set up Gibberish" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ready to connect"
  )
})
test("missing content, private media, feeds, and metadata behave safely", async ({
  page,
  request,
}) => {
  await page.goto("/p/missing/missing")
  await expect(
    page.getByRole("heading", { name: "This corner is empty." })
  ).toBeVisible()
  expect((await request.get("/api/media?id=not-real")).status()).toBe(404)
  const rss = await request.get("/rss.xml")
  expect(rss.status()).toBe(200)
  expect(await rss.text()).not.toContain("<item>")
  const sitemap = await request.get("/sitemap.xml")
  expect(await sitemap.text()).not.toContain("demo-")
  await page.goto("/p/demo-nothing/wrong-slug")
  await expect(page).toHaveURL(/\/p\/demo-nothing\/nothing$/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "An incomplete guide to doing absolutely nothing"
  )
})
