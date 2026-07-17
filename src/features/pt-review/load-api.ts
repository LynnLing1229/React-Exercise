import { buildPTReviewContextFromApi } from "./api-to-review-context"
import type { PTReviewAPIResponse } from "./pt-review-api"
import type { PTReviewContext } from "./review-context"

export interface PTReviewAPIQuery {
  trackedPersonId?: string
  start?: string
  end?: string
}

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000"
const DEFAULT_TRACKED_PERSON_ID = "owner"
const DEFAULT_START = "2026-07-01"
const DEFAULT_END = "2026-07-09"

export async function loadPTReviewContextFromApi(
  query: PTReviewAPIQuery = {},
): Promise<PTReviewContext> {
  const response = await fetch(ptReviewUrl(query), {
    cache: "no-store",
    headers: { accept: "application/json" },
  })

  if (!response.ok) {
    throw new Error(`PT Review API request failed with ${response.status}`)
  }

  const payload = (await response.json()) as PTReviewAPIResponse
  return buildPTReviewContextFromApi(payload)
}

function ptReviewUrl(query: PTReviewAPIQuery) {
  const baseUrl = process.env.PT_REVIEW_API_BASE_URL ?? DEFAULT_API_BASE_URL
  const url = new URL("/pt-review", baseUrl)
  url.searchParams.set("tracked_person_id", query.trackedPersonId ?? DEFAULT_TRACKED_PERSON_ID)
  url.searchParams.set("start", query.start ?? DEFAULT_START)
  url.searchParams.set("end", query.end ?? DEFAULT_END)
  return url
}
