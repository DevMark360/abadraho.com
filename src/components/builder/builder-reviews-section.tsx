"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { Select } from "@/components/ui/select";
import { AuthGatePrompt } from "@/components/project-detail/auth-gate-prompt";
import { useAuth } from "@/components/auth/auth-provider";
import {
  BuilderRatingDistributionChart,
  BuilderStarRow,
} from "@/components/builder/builder-rating-ui";
import { cn } from "@/lib/utils";
import {
  EMPTY_BUILDER_RATING_DISTRIBUTION,
  normalizeBuilderRatingDistribution,
  type BuilderRatingDistribution,
} from "@/lib/builder-rating";

type ProjectOption = {
  id: number;
  name: string;
  slug: string;
};

type ReviewRow = {
  id: number;
  projectId: number;
  rating: number;
  comment: string;
  authorName: string | null;
  createdAt: string | null;
  projectName: string;
  projectSlug: string;
};

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`${n} stars`}
        >
          <Star
            className={cn(
              "h-7 w-7",
              n <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function BuilderReviewsSection({
  pageSlug,
  projects,
  initialAverage,
  initialCount,
  initialDistribution,
  initialReviews,
  returnPath,
}: {
  pageSlug: string;
  projects: ProjectOption[];
  initialAverage: number;
  initialCount: number;
  initialDistribution?: Partial<BuilderRatingDistribution> | null;
  initialReviews: ReviewRow[];
  returnPath: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error">("ok");
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [avg, setAvg] = useState(initialAverage);
  const [count, setCount] = useState(initialCount);
  const [distribution, setDistribution] = useState<BuilderRatingDistribution>(() =>
    normalizeBuilderRatingDistribution(initialDistribution)
  );

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: String(p.id), label: p.name })),
    [projects]
  );

  useEffect(() => {
    if (projects.length && !projects.some((p) => p.id === projectId)) {
      setProjectId(projects[0]!.id);
    }
  }, [projects, projectId]);

  async function refreshReviews() {
    const res = await fetch(`/api/v1/builders/${pageSlug}/reviews`, {
      credentials: "same-origin",
    });
    const j = await res.json();
    if (j.reviews) {
      setReviews(j.reviews as ReviewRow[]);
      setAvg(Number(j.ratingAverage) || 0);
      setCount(Number(j.ratingCount) || 0);
      if (j.ratingDistribution) {
        setDistribution(normalizeBuilderRatingDistribution(j.ratingDistribution));
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !projectId) return;

    const text = comment.trim();
    if (!text) {
      setMsgTone("error");
      setMsg("Please write a short review.");
      return;
    }

    setSubmitting(true);
    setMsg("");

    try {
      const res = await fetch("/api/v1/reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          product_rating: rating,
          review: text,
        }),
      });
      const j = await res.json();

      if (res.ok && j.success) {
        setMsgTone("ok");
        setMsg(j.message ?? "Thank you! Your review was submitted for approval.");
        setComment("");
        await refreshReviews();
      } else {
        setMsgTone("error");
        setMsg(j.message ?? "Could not submit review. Try again.");
      }
    } catch {
      setMsgTone("error");
      setMsg("Could not submit review. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-zinc-900">Ratings &amp; reviews</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold leading-none text-zinc-900 sm:text-5xl">
              {count > 0 ? avg.toFixed(1) : "—"}
            </span>
            {count > 0 ? <BuilderStarRow value={avg} size="lg" className="mb-1" /> : null}
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            {count > 0
              ? `${count} review${count === 1 ? "" : "s"}`
              : "No reviews yet"}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
          <BuilderRatingDistributionChart distribution={distribution} total={count} />
        </div>
      </div>

      {authLoading ? null : user && projects.length > 0 ? (
        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5 sm:p-6"
        >
          <h3 className="text-base font-semibold text-zinc-900">Write your review</h3>
          <p className="text-sm text-zinc-600">
            Reviews are checked by our team before they appear publicly.
          </p>

          {projects.length > 1 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Project
              </p>
              <Select
                layout="field"
                value={String(projectId)}
                onChange={(e) => setProjectId(Number(e.target.value))}
                disabled={submitting}
                className="bg-white"
              >
                {projectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            maxLength={255}
            placeholder="Write your review…"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
            rows={4}
            disabled={submitting}
          />

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>

          {msg ? (
            <p
              className={cn("text-sm", msgTone === "ok" ? "text-emerald-700" : "text-red-600")}
              role={msgTone === "error" ? "alert" : "status"}
            >
              {msg}
            </p>
          ) : null}
        </form>
      ) : !user && projects.length > 0 ? (
        <div className="mt-8">
          <AuthGatePrompt
            title="Sign in to leave a review"
            description="Sign in to your account to share your experience."
            returnPath={returnPath}
            variant="card"
          />
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <CollapsiblePanel
          className="mt-8"
          defaultOpen={false}
          label="View all reviews"
          hint={`${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
          bodyClassName="p-4 sm:p-5"
        >
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BuilderStarRow value={r.rating} size="sm" />
                    <span className="text-sm font-semibold text-zinc-800">{r.rating}/5</span>
                    {r.authorName ? (
                      <span className="text-sm text-zinc-500">· {r.authorName}</span>
                    ) : null}
                  </div>
                  <Link
                    href={`/project/${r.projectSlug}`}
                    className="text-xs font-semibold text-brand-accent hover:underline"
                  >
                    {r.projectName}
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{r.comment}</p>
              </li>
            ))}
          </ul>
        </CollapsiblePanel>
      ) : null}
    </section>
  );
}
