"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

/** Housing affordability calculator — legacy search history feature */
export function HousingCalculator() {
  const { user } = useAuth();
  const [income, setIncome] = useState("");
  const [down, setDown] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function calc(e: React.FormEvent) {
    e.preventDefault();
    const monthly = Number(income) / 12;
    const budget = monthly * 0.35 * 12 * 25 + Number(down || 0);
    setResult(`Estimated budget: AED ${Math.round(budget).toLocaleString()}`);
    if (user) {
      await fetch("/api/v1/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: "housing_calc",
          annual_income: income,
          down_payment: down,
          result: budget,
        }),
      });
    }
  }

  return (
    <div className="rounded-clay border border-white/80 bg-clay-surface shadow-clay-sm p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Housing calculator</h3>
      <form onSubmit={calc} className="mt-3 space-y-2">
        <input
          type="number"
          placeholder="Annual income (AED)"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Down payment (AED)"
          value={down}
          onChange={(e) => setDown(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm" className="w-full">
          Calculate
        </Button>
      </form>
      {result && <p className="mt-2 text-xs font-medium text-zinc-700">{result}</p>}
    </div>
  );
}
