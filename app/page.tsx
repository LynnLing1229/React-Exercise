import { PTReviewPage } from "@/components/pt-review/pt-review-page"
import firstScreenResponse from "@/v0-first-screen-api-response.json"
import { buildPTReviewContextFromApi } from "@/src/features/pt-review/api-to-review-context"
import type { PTReviewAPIResponse } from "@/src/features/pt-review/pt-review-api"

/**
 * V0 handoff only: keep the accepted first screen visible without requiring
 * FastAPI in the design environment. The real repository page remains API-only.
 */
export default function Page() {
  const context = buildPTReviewContextFromApi(
    firstScreenResponse as unknown as PTReviewAPIResponse,
  )

  return <PTReviewPage context={context} />
}
