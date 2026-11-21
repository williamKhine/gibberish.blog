import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server"
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server"
import { configured } from "@/lib/config"

const auth = convexAuthNextjsMiddleware((request) => {
  const destination = request.nextUrl.clone()
  destination.searchParams.delete("_rsc")
  const headers = new Headers(request.headers)
  headers.set("x-auth-return-to", destination.pathname + destination.search)
  return NextResponse.next({ request: { headers } })
})

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return configured ? auth(request, event) : NextResponse.next()
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/api/(.*)",
  ],
}
