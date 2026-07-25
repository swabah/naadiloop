import { HandHeart } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function PatientHelpPage() {
  return (
    <ScreenPlaceholder
      audience="Patient"
      title="Ask for help"
      description="Patients will be able to request caregiver help, transport, clearer instructions, or provider contact."
      icon={HandHeart}
      nextTo="/patient/next"
      nextLabel="Back to next action"
    />
  );
}
