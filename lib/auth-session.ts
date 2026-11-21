"use server"

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"

export async function hasAuthCookie() {
  return Boolean(await convexAuthNextjsToken())
}
