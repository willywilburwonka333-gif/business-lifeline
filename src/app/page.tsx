import { BusinessLifeline } from "@/components/business-lifeline";
import { SavedReportGuard } from "@/components/saved-report-guard";
import { SavedScenarioPlanner } from "@/components/saved-scenario-planner";

export default function Home() {
  return (
    <>
      <SavedReportGuard />
      <BusinessLifeline />
      <SavedScenarioPlanner />
    </>
  );
}
