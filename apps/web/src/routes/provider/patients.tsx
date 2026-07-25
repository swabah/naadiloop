import { UsersRound } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function ProviderPatientsPage() {
  return (
    <ScreenPlaceholder
      audience="Provider"
      title="Select a patient"
      description="Choose an existing demo patient or start a new care journey. Patient persistence is contracted for the next issue."
      icon={UsersRound}
      nextTo="/provider/dashboard"
      nextLabel="View dashboard"
    />
  );
}
