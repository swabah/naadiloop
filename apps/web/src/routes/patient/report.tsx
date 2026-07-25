import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { trpc } from "../../lib/trpc";

export function PatientReportPage() {
  const { actionId } = useParams({ from: "/patient/actions/$actionId/report" });
  const utils = trpc.useUtils();
  const details = trpc.patient.actionDetails.useQuery({ actionId });
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const upload = trpc.patient.uploadReport.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.patient.actionDetails.invalidate({ actionId }),
        utils.patient.nextAction.invalidate(),
        utils.patient.journey.invalidate(),
      ]);
    },
  });

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setConfirmed(false);
    upload.reset();
  };

  if (details.isPending) return <Card className="h-96 animate-pulse bg-white/60" />;
  if (details.isError) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">Report upload is unavailable</h1>
        <p className="mt-2 text-sm text-muted">{details.error.message}</p>
        <Button className="mt-5" onClick={() => void details.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (upload.isSuccess) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success-ink" />
        <Badge variant="success" className="mt-5">
          Report returned
        </Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink">Awaiting Provider review</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Your report is attached to this test Care action. Your Provider will review it and
          communicate the next step.
        </p>
        <Button asChild className="mt-6">
          <Link to="/patient/journey">Return to Care journey</Link>
        </Button>
      </Card>
    );
  }

  const action = details.data.action;
  const validTest = action.type === "TEST";
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/patient/actions/$actionId" params={{ actionId }}>
          <ArrowLeft className="size-4" />
          Back to Care action
        </Link>
      </Button>
      <Card className="p-6 sm:p-8">
        <Badge variant="info">Demo-safe report return</Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink">Upload a test report</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{action.title}</p>

        {!validTest ? (
          <p className="mt-6 rounded-2xl bg-warning/10 p-4 text-sm text-warning" role="alert">
            Reports can only be returned for a TEST Care action.
          </p>
        ) : (
          <>
            <label className="mt-6 block rounded-2xl border border-dashed border-primary/30 bg-primary-soft/30 p-6 text-center">
              <input
                type="file"
                className="sr-only"
                onChange={chooseFile}
                disabled={upload.isPending}
              />
              {file ? (
                <FileText className="mx-auto size-8 text-primary" />
              ) : (
                <UploadCloud className="mx-auto size-8 text-primary" />
              )}
              <span className="mt-3 block text-sm font-bold text-primary-ink">
                {file?.name ?? "Choose a sample report"}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Demo mode records file metadata and a mock URL; it does not upload real medical
                files.
              </span>
            </label>

            {file ? (
              <label className="mt-5 flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                I confirm this fictional demo file belongs to the selected test Care action.
              </label>
            ) : null}

            {upload.error ? (
              <p className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning" role="alert">
                {upload.error.message}
              </p>
            ) : null}

            <Button
              className="mt-6 w-full"
              disabled={!file || !confirmed || upload.isPending}
              onClick={() => {
                if (!file) return;
                upload.mutate({
                  actionId,
                  fileUrl: `https://example.invalid/demo-reports/${encodeURIComponent(file.name)}`,
                });
              }}
            >
              {upload.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              {upload.isPending ? "Returning report…" : "Return report to Provider"}
            </Button>
          </>
        )}
      </Card>
    </section>
  );
}
