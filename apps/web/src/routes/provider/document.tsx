import { FileUp } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function ProviderDocumentPage() {
  return (
    <ScreenPlaceholder
      audience="Provider"
      title="Add medical instructions"
      description="Paste a discharge summary or upload a digital PDF before generating a structured care journey."
      icon={FileUp}
      nextTo="/provider/dashboard"
      nextLabel="Return to dashboard"
    />
  );
}
