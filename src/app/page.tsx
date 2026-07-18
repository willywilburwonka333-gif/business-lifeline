import { BusinessLifeline } from "@/components/business-lifeline";
import { SavedReportGuard } from "@/components/saved-report-guard";
import { SavedScenarioPlanner } from "@/components/saved-scenario-planner";

export default function Home() {
  return (
    <div id="main-content" tabIndex={-1}>
      <SavedReportGuard />
      <BusinessLifeline />
      <SavedScenarioPlanner />
    </div>
  );
}
