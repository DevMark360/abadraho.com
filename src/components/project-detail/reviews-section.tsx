"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

type ReviewRow = {
  id: number;
  rating: number;
  comment: string;
  authorName: string | null;
  createdAt: string | null;
};

function StarRating({
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
              "h-6 w-6",
              n <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsSection({
  projectId,
  ratingAverage: initialAvg,
  ratingCount: initialCount,
}: {
  projectId: number;
  ratingAverage: number;
  ratingCount: number;
}) {
  const { user, loading: authLoading } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error">("ok");
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/reviews?projectId=${projectId}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.reviews) {
          const rows = j.reviews as ReviewRow[];
          setReviews(rows);
          if (rows.length) {
            setCount(rows.length);
            setAvg(rows.reduce((s, r) => s + r.rating, 0) / rows.length);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReviewsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

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
        setMsg(j.message ?? "Thanks for your review!");
        setComment("");

        const listRes = await fetch(`/api/v1/reviews?projectId=${projectId}`, {
          credentials: "same-origin",
        });
        const listJson = await listRes.json();
        if (listJson.reviews) {
          const rows = listJson.reviews as ReviewRow[];
          setReviews(rows);
          if (rows.length) {
            setCount(rows.length);
            setAvg(rows.reduce((s, r) => s + r.rating, 0) / rows.length);
          }
        }
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

  const hasReviews = count > 0 || reviews.length > 0;

  if (!reviewsLoaded || authLoading) return null;

  if (!hasReviews && !user) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Reviews</h2>
      {hasReviews ? (
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {avg.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
        </p>
      ) : null}

      {user && !hasReviews ? (
        <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-100">
            <MessageSquareQuote className="h-5 w-5 text-amber-600" aria-hidden />
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-900">Be the first to review</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
            Share your experience with this project to help other buyers decide.
          </p>
        </div>
      ) : null}

      {user ? (
        <form
          onSubmit={submit}
          className="mt-4 space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4"
        >
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Your rating</p>
            <StarRating value={rating} onChange={setRating} disabled={submitting} />
          </div>
          <p className="text-xs text-zinc-500">
            Reviews are checked by our team before they appear publicly.
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            maxLength={255}
            placeholder="Write your review…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            rows={3}
            disabled={submitting}
          />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Submitting…" : hasReviews ? "Submit review" : "Post first review"}
          </Button>
          {msg ? (
            <p
              className={cn(
                "text-sm",
                msgTone === "ok" ? "text-emerald-700" : "text-red-600"
              )}
              role={msgTone === "error" ? "alert" : "status"}
            >
              {msg}
            </p>
          ) : null}
        </form>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="mt-6 space-y-3 border-t border-zinc-100 pt-4">
          {reviews.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-1 font-medium text-zinc-800">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {r.rating}/5
                {r.authorName ? (
                  <span className="font-normal text-zinc-500"> · {r.authorName}</span>
                ) : null}
              </div>
              <p className="mt-1 text-zinc-600">{r.comment}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
