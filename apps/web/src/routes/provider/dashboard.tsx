import { LayoutDashboard } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function ProviderDashboardPage() {
  return (
    <ScreenPlaceholder
      audience="Provider"
      title="Care continuity dashboard"
      description="Requires attention, awaiting review, overdue, and on-track queues will surface deterministic operational alerts here."
      icon={LayoutDashboard}
      nextTo="/patient/next"
      nextLabel="Switch to patient"
    />
  );
}
