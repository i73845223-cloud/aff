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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const skip = (page - 1) * limit;

  const [transactions, totalCount] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.transaction.count({ where: { userId } }),
  ]);

  const aggregates = await db.transaction.groupBy({
    by: ["type", "category"],
    where: {
      userId,
      status: "success",
    },
    _sum: { amount: true },
  });

  let depositsCategoryTransactions = new Prisma.Decimal(0);
  let withdrawalsCategoryTransactions = new Prisma.Decimal(0);
  let depositsOther = new Prisma.Decimal(0);
  let withdrawalsOther = new Prisma.Decimal(0);

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

  const commissionEarned = await db.influencerEarning.aggregate({
    where: {
      influencerId: mediaBuyerId,
      sourceUserId: userId,
    },
    _sum: { amount: true },
  });

  return NextResponse.json({
    user,
    promoCode: userPromoCode.promoCode.code,
    commissionEarned: commissionEarned._sum.amount || new Prisma.Decimal(0),
    summary: {
      depositsCategoryTransactions,
      withdrawalsCategoryTransactions,
      depositsOther,
      withdrawalsOther,
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