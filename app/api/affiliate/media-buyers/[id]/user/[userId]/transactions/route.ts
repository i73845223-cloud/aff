import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: mediaBuyerId, userId } = params;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Verify media buyer and referral relationship
  const mediaBuyer = await db.user.findFirst({
    where: { id: mediaBuyerId, role: "MEDIA" },
  });
  if (!mediaBuyer) {
    return NextResponse.json({ error: "Media buyer not found" }, { status: 404 });
  }

  const userPromoCode = await db.userPromoCode.findFirst({
    where: {
      userId,
      promoCode: { assignedUserId: mediaBuyerId },
    },
    include: { promoCode: true },
  });
  if (!userPromoCode) {
    return NextResponse.json(
      { error: "User not referred by this media buyer" },
      { status: 403 }
    );
  }

  // Fetch user info
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const skip = (page - 1) * limit;

  // Fetch transactions with pagination
  const [transactions, totalCount] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.transaction.count({ where: { userId } }),
  ]);

  // ---------- Aggregates for summary cards (only success, then we add pending deposits) ----------
  const aggregates = await db.transaction.groupBy({
    by: ["type", "category"],
    where: { userId, status: "success" },
    _sum: { amount: true },
  });

  // Pending deposits with category ≠ "transaction" (for Turnover plus)
  const pendingDepositsAgg = await db.transaction.groupBy({
    by: ["type", "category"],
    where: {
      userId,
      type: "deposit",
      status: "pending",
      category: { not: "transaction" },
    },
    _sum: { amount: true },
  });

  let depositsCategoryTransactions = new Prisma.Decimal(0);
  let withdrawalsCategoryTransactions = new Prisma.Decimal(0);
  let depositsOther = new Prisma.Decimal(0);   // Turnover plus
  let withdrawalsOther = new Prisma.Decimal(0); // Turnover minus

  // Process successful transactions
  aggregates.forEach((agg) => {
    const amount = agg._sum.amount || new Prisma.Decimal(0);
    const isTransactionsCategory = agg.category === "transaction";

    if (agg.type === "deposit") {
      if (isTransactionsCategory) {
        depositsCategoryTransactions = depositsCategoryTransactions.add(amount);
      } else {
        depositsOther = depositsOther.add(amount);
      }
    } else if (agg.type === "withdrawal") {
      if (isTransactionsCategory) {
        withdrawalsCategoryTransactions = withdrawalsCategoryTransactions.add(amount);
      } else {
        withdrawalsOther = withdrawalsOther.add(amount);
      }
    }
  });

  // Add pending deposits (category ≠ "transaction") to Turnover (plus)
  pendingDepositsAgg.forEach((agg) => {
    const amount = agg._sum.amount || new Prisma.Decimal(0);
    depositsOther = depositsOther.add(amount);
  });

  // ---------- NGR for this specific user ----------
  // NGR = successful withdrawals (category ≠ "transaction")
  //       - (successful + pending) deposits (category ≠ "transaction")
  const [ngrW, ngrD] = await Promise.all([
    db.transaction.aggregate({
      where: {
        userId,
        type: "withdrawal",
        status: "success",
        category: { not: "transaction" },
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        userId,
        type: "deposit",
        status: { in: ["success", "pending"] },
        category: { not: "transaction" },
      },
      _sum: { amount: true },
    }),
  ]);
  const totalWd = ngrW._sum.amount || new Prisma.Decimal(0);
  const totalDp = ngrD._sum.amount || new Prisma.Decimal(0);
  const userNgr = totalWd.minus(totalDp);

  return NextResponse.json({
    user,
    promoCode: userPromoCode.promoCode.code,
    ngr: userNgr.toString(),
    summary: {
      depositsCategoryTransactions: depositsCategoryTransactions.toString(),
      withdrawalsCategoryTransactions: withdrawalsCategoryTransactions.toString(),
      depositsOther: depositsOther.toString(),
      withdrawalsOther: withdrawalsOther.toString(),
    },
    transactions,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: skip + limit < totalCount,
      hasPrev: page > 1,
    },
  });
}