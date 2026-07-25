import { FileCheck2 } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function ProviderReportPage() {
  return (
    <ScreenPlaceholder
      audience="Provider"
      title="Review a patient report"
      description="The provider will review the uploaded report, leave a comment, and communicate or create the next action."
      icon={FileCheck2}
      gate
      nextTo="/provider/dashboard"
      nextLabel="Return to dashboard"
    />
  );
}
