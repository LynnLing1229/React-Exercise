import { DecisionWorkbenchPage } from "@/components/decision-workbench/decision-workbench-page"
import { decisionWorkbenchV0SampleData } from "@/decision-workbench-v0-sample-data"

/**
 * V0 Decision Workbench prototype.
 * This route exists only for v0 design exploration and uses local sample data.
 */
export default function Page() {
  return <DecisionWorkbenchPage sampleData={decisionWorkbenchV0SampleData} />
}
