import { UploadCloud } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function PatientReportPage() {
  return (
    <ScreenPlaceholder
      audience="Patient"
      title="Upload a test report"
      description="A report attached to a test action will move that action into awaiting provider review."
      icon={UploadCloud}
      nextTo="/patient/journey"
      nextLabel="Back to journey"
    />
  );
}
