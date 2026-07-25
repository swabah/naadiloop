import { ListChecks } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function PatientJourneyPage() {
  return (
    <ScreenPlaceholder
      audience="Patient"
      title="Your care journey"
      description="A simple ordered timeline will show completed, pending, upcoming, and review-waiting actions."
      icon={ListChecks}
      nextTo="/patient/next"
      nextLabel="View next action"
    />
  );
}
