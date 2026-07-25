import { HeartPulse } from "lucide-react";
import { ScreenPlaceholder } from "../../components/screen-placeholder";

export function PatientNextPage() {
  return (
    <ScreenPlaceholder
      audience="Patient"
      title="Your next care action"
      description="One clear, plain-language instruction will be the most prominent part of the patient experience."
      icon={HeartPulse}
      nextTo="/patient/journey"
      nextLabel="View care journey"
    />
  );
}
