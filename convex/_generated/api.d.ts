/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as scanner_github from "../scanner/github.js";
import type * as scanner_platform from "../scanner/platform.js";
import type * as scanner_scoring from "../scanner/scoring.js";
import type * as scanner_tier1 from "../scanner/tier1.js";
import type * as scanner_tier2 from "../scanner/tier2.js";
import type * as scans from "../scans.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "scanner/github": typeof scanner_github;
  "scanner/platform": typeof scanner_platform;
  "scanner/scoring": typeof scanner_scoring;
  "scanner/tier1": typeof scanner_tier1;
  "scanner/tier2": typeof scanner_tier2;
  scans: typeof scans;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
