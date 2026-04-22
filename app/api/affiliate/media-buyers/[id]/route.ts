import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const mediaBuyer = await db.user.findFirst({
    where: {
      id,
      role: "MEDIA",
    },
    include: {
      assignedPromoCodes: {
        include: {
          _count: { select: { userPromoCodes: true } },
          influencerEarnings: true,
          userPromoCodes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  createdAt: true,
                  transactions: {
                    where: { status: "success" },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!mediaBuyer) {
    return NextResponse.json({ error: "Media buyer not found" }, { status: 404 });
  }

  const referredUserIds = mediaBuyer.assignedPromoCodes.flatMap((code) =>
    code.userPromoCodes.map((upc) => upc.user.id)
  );

  const earningsByUser = await db.influencerEarning.groupBy({
    by: ["sourceUserId"],
    where: {
      influencerId: id,
      sourceUserId: { in: referredUserIds },
    },
    _sum: { amount: true },
  });

  const commissionMap = new Map(
    earningsByUser.map((e) => [e.sourceUserId, e._sum.amount || new Prisma.Decimal(0)])
  );

  const allReferredUsers = mediaBuyer.assignedPromoCodes.flatMap((code) =>
    code.userPromoCodes.map((upc) => ({
      ...upc.user,
      promoCodeUsed: code.code,
      joinedAt: upc.lastUsedAt || upc.user.createdAt,
      totalCommission: commissionMap.get(upc.user.id) || new Prisma.Decimal(0),
    }))
  );

  const uniqueUsers = Array.from(
    new Map(allReferredUsers.map((user) => [user.id, user])).values()
  );

  uniqueUsers.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

  const totalCount = uniqueUsers.length;
  const skip = (page - 1) * limit;
  const paginatedUsers = uniqueUsers.slice(skip, skip + limit);

  const totalReferrals = uniqueUsers.length;
  const totalCommission = await db.influencerEarning.aggregate({
    where: { influencerId: id },
    _sum: { amount: true },
  });

  const buyerTransactionAggregates = await db.transaction.groupBy({
    by: ["type"],
    where: {
      status: "success",
      category: "transaction",
      user: {
        userPromoCodes: {
          some: {
            promoCode: {
              assignedUserId: id,
            },
          },
        },
      },
    },
    _sum: { amount: true },
  });

  let buyerTotalDeposits = new Prisma.Decimal(0);
  let buyerTotalWithdrawals = new Prisma.Decimal(0);

  buyerTransactionAggregates.forEach((agg) => {
    const amount = agg._sum.amount || new Prisma.Decimal(0);
    if (agg.type === "deposit") buyerTotalDeposits = buyerTotalDeposits.add(amount);
    else if (agg.type === "withdrawal") buyerTotalWithdrawals = buyerTotalWithdrawals.add(amount);
  });

  return NextResponse.json({
    ...mediaBuyer,
    totalReferrals,
    totalCommission: totalCommission._sum.amount || new Prisma.Decimal(0),
    totalDeposits: buyerTotalDeposits.toString(),
    totalWithdrawals: buyerTotalWithdrawals.toString(),
    referredUsers: paginatedUsers,
    referredUsersPagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: skip + limit < totalCount,
      hasPrev: page > 1,
    },
  });
}