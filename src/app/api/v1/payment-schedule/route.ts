import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  createPaymentSchedule,
  formatScheduleSummaryHtml,
} from "@/server/services/payment-schedule.service";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Sign in to request a payment schedule." },
      { status: 401 }
    );
  }

  const body = await request.json();

  const result = await createPaymentSchedule({
    projectId: body.project_id != null ? Number(body.project_id) : undefined,
    unitId: Number(body.unit_id),
    userId: session?.id ?? null,
    duration: body.duration != null ? Number(body.duration) : null,
    downPayment: body.down_payment,
    monthlyInstallment: body.monthly_installment,
    quarterlyInstallment: body.quarterly_installment,
    halfYearlyInstallment: body.half_yearly_installment,
    yearlyInstallment: body.yearly_installment,
    possession: body.possession,
    loanAmount: body.loan_amount,
    slabCasting: body.slab_casting,
    plinth: body.plinth,
    colour: body.colour,
    startOfWork: body.start_of_work,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Payment schedule saved successfully.",
    summary: result.summary,
    html: formatScheduleSummaryHtml(result.summary),
  });
}
