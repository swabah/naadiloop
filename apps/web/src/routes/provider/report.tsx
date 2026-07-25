import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { trpc } from "../../lib/trpc";

export function ProviderReportPage() {
  const { reportId } = useParams({ from: "/provider/reports/$reportId" });
  const utils = trpc.useUtils();
  const details = trpc.provider.reportDetails.useQuery({ reportId });
  const [comment, setComment] = useState("");
  const [addFollowUp, setAddFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const review = trpc.provider.reviewReport.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provider.dashboard.invalidate(),
        utils.provider.reportDetails.invalidate({ reportId }),
        utils.patient.nextAction.invalidate(),
        utils.patient.journey.invalidate(),
      ]);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addFollowUp && (!followUpTitle.trim() || !followUpInstructions.trim())) {
      setFormError("Enter a title and instructions for the follow-up.");
      return;
    }
    setFormError(null);
    review.mutate({
      reportId,
      comment: comment || undefined,
      followUp: addFollowUp
        ? {
            type: "FOLLOW_UP",
            title: followUpTitle,
            instructions: followUpInstructions,
            dueDate: followUpDate
              ? new Date(`${followUpDate}T09:00:00.000Z`).toISOString()
              : undefined,
            priority: "NORMAL",
            sourceText: `Provider-authored follow-up after report review: ${followUpTitle}`,
            assignedTo: "patient",
            reviewRequired: false,
            payload: { reason: followUpInstructions },
          }
        : undefined,
    });
  };

  if (details.isPending) return <Card className="h-[32rem] animate-pulse bg-white/60" />;
  if (details.isError) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">The report could not be loaded</h1>
        <p className="mt-2 text-sm text-muted">{details.error.message}</p>
        <Button className="mt-5" onClick={() => void details.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (review.isSuccess) {
    return (
      <Card className="mx-auto max-w-2xl border-gate/20 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success-ink" />
        <Badge variant="gate" className="mt-5">
          Human gate completed
        </Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink">The loop is closed</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Completion, Provider review, and next-step communication were recorded together.
          {review.data.followUpId ? " The new follow-up is now visible to the Patient." : ""}
        </p>
        <Button asChild className="mt-6">
          <Link to="/provider/dashboard">Return to dashboard</Link>
        </Button>
      </Card>
    );
  }

  const { report, action, patient } = details.data;
  if (report.status === "REVIEWED") {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success-ink" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          This report was already reviewed
        </h1>
        <p className="mt-2 text-sm text-muted">
          {report.providerComment || "No optional Provider comment was added."}
        </p>
        <Button asChild className="mt-6">
          <Link to="/provider/dashboard">Return to dashboard</Link>
        </Button>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/provider/dashboard">
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </Button>
      <div>
        <Badge variant="gate">Human gate · Provider review</Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink sm:text-4xl">
          Review {patient.name}&apos;s report
        </h1>
        <p className="mt-2 text-sm text-muted">{action.title}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6">
          <FileCheck2 className="size-8 text-gate" />
          <h2 className="mt-4 text-lg font-bold text-primary-ink">Returned demo report</h2>
          <p className="mt-2 break-all text-sm leading-6 text-muted">{report.fileUrl}</p>
          <Button asChild variant="outline" className="mt-5">
            <a href={report.fileUrl} target="_blank" rel="noreferrer">
              Open report link
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <blockquote className="mt-6 rounded-2xl bg-primary-soft/60 p-4 text-sm leading-6 text-primary-ink">
            {action.sourceText}
          </blockquote>
        </Card>

        <Card className="p-6">
          <form className="space-y-5" onSubmit={submit}>
            <label className="block space-y-2" htmlFor="provider-comment">
              <span className="text-sm font-bold">Comment to the Patient · Optional</span>
              <Textarea
                id="provider-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2_000}
                disabled={review.isPending}
                placeholder="e.g. Reviewed. Continue the existing instructions and attend the planned consultation."
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-gate/5 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-gate"
                checked={addFollowUp}
                onChange={(event) => setAddFollowUp(event.target.checked)}
                disabled={review.isPending}
              />
              <span>
                <strong className="block text-primary-ink">Create a follow-up Care action</strong>
                <span className="mt-1 block leading-5 text-muted">
                  This is Provider-authored and will become the Patient&apos;s next step.
                </span>
              </span>
            </label>

            {addFollowUp ? (
              <div className="space-y-4 rounded-2xl border border-gate/15 p-4">
                <div className="flex items-center gap-2 font-bold text-primary-ink">
                  <Plus className="size-4 text-gate" />
                  Follow-up details
                </div>
                <Input
                  value={followUpTitle}
                  onChange={(event) => setFollowUpTitle(event.target.value)}
                  placeholder="Follow-up title"
                  maxLength={160}
                  disabled={review.isPending}
                />
                <Textarea
                  value={followUpInstructions}
                  onChange={(event) => setFollowUpInstructions(event.target.value)}
                  placeholder="Instructions communicated by the Provider"
                  maxLength={2_000}
                  disabled={review.isPending}
                />
                <label className="block space-y-2 text-sm font-bold" htmlFor="follow-up-due-date">
                  Due date · Optional
                  <Input
                    id="follow-up-due-date"
                    type="date"
                    value={followUpDate}
                    onChange={(event) => setFollowUpDate(event.target.value)}
                    disabled={review.isPending}
                  />
                </label>
              </div>
            ) : null}

            {formError || review.error ? (
              <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning" role="alert">
                {formError ?? review.error?.message}
              </p>
            ) : null}

            <Button type="submit" variant="gate" className="w-full" disabled={review.isPending}>
              {review.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {review.isPending ? "Recording review…" : "Review and communicate next step"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
