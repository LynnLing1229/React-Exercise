import { PTReviewPage } from "@/components/pt-review/pt-review-page"
import firstScreenResponse from "@/v0-first-screen-api-response.json"
import { buildPTReviewContextFromApi } from "@/src/features/pt-review/api-to-review-context"
import type { PTReviewAPIResponse } from "@/src/features/pt-review/pt-review-api"
import Link from "next/link"

/**
 * V0 handoff only: keep the accepted first screen visible without requiring
 * FastAPI in the design environment. The real repository page remains API-only.
 */
export default function Page() {
  const context = buildPTReviewContextFromApi(
    firstScreenResponse as unknown as PTReviewAPIResponse,
  )

  return (
    <div className="relative">
      {/* Prototype Navigation */}
      <div className="fixed top-4 right-4 z-50">
        <Link
          href="/decision-workbench"
          className="rounded-md border border-primary bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          查看 Decision Workbench →
        </Link>
      </div>
      <PTReviewPage context={context} />
    </div>
  )
}
