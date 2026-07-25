import { ClipboardCheck } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function PatientActionPage() {
  return (
    <ScreenPlaceholder
      audience="Patient"
      title="Care action details"
      description="Instructions, deadline, provider source, and the correct completion control will appear here."
      icon={ClipboardCheck}
      nextTo="/patient/next"
      nextLabel="Back to next action"
    />
  );
}
