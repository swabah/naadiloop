import { ShieldCheck } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function ProviderVerifyPage() {
  return (
    <ScreenPlaceholder
      audience="Provider"
      title="Verify the care journey"
      description="Review every extracted action, its source sentence, instructions, priority, and due date before activation."
      icon={ShieldCheck}
      gate
      nextTo="/provider/dashboard"
      nextLabel="Return to dashboard"
    />
  );
}
