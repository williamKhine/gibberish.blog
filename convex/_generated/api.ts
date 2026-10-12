import { anyApi } from "convex/server"
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server"
import type * as community from "../community"
declare const fullApi: ApiFromModules<{
  community: typeof community
}>
export const api = anyApi as unknown as FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>
export const internal = anyApi as unknown as FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>
