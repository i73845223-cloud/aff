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

  const buyerId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const hasDepositedFilter = searchParams.get("hasDeposited") || "all";

  const dateFilter: any = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom);
    if (dateTo) dateFilter.createdAt.lte = new Date(dateTo);
  }

  const buyer = await db.user.findFirst({
    where: { id: buyerId, role: "MEDIA" },
    select: { id: true, commissionPercent: true },
  });
  if (!buyer) {
    return NextResponse.json({ error: "Media buyer not found" }, { status: 404 });
  }

  const promoCodes = await db.promoCode.findMany({
    where: { assignedUserId: buyerId },
    select: { id: true, commissionPercentage: true },
  });
  const promoCodeIds = promoCodes.map(p => p.id);

  const upcFilter: any = { promoCodeId: { in: promoCodeIds } };
  if (dateFilter.createdAt) upcFilter.lastUsedAt = dateFilter.createdAt;
  const allUserPromoCodes = await db.userPromoCode.findMany({
    where: upcFilter,
    select: { userId: true, promoCodeId: true },
  });
  const referredUserIds = [...new Set(allUserPromoCodes.map(u => u.userId))];

  const depositForHasFilter: any = {
    userId: { in: referredUserIds },
    type: "deposit",
    status: "success",
  };
  if (dateFilter.createdAt) depositForHasFilter.createdAt = dateFilter.createdAt;
  const usersWithDeposit = await db.transaction.findMany({
    where: depositForHasFilter,
    select: { userId: true },
    distinct: ['userId'],
  });
  const depositSet = new Set(usersWithDeposit.map(d => d.userId));

  const totalRegistrations = allUserPromoCodes.length;

  let firstDepositDates: { userId: string }[] = [];
  let totalFirstDeposits = 0;
  let totalFtdCommission = new Prisma.Decimal(0);

  if (referredUserIds.length > 0) {
    const firstDepRaw = await db.transaction.groupBy({
      by: ["userId"],
      where: {
        userId: { in: referredUserIds },
        type: "deposit",
        status: "success",
      },
      _min: { createdAt: true },
    });

    firstDepositDates = firstDepRaw
      .filter(d => d._min.createdAt)
      .filter(d => {
        const dDate = d._min.createdAt!;
        if (dateFrom && dDate < new Date(dateFrom)) return false;
        if (dateTo && dDate > new Date(dateTo)) return false;
        return true;
      });
    totalFirstDeposits = firstDepositDates.length;

    for (const pc of promoCodes) {
      const ftdFee = pc.commissionPercentage || 0;
      const usersForCode = allUserPromoCodes.filter(u => u.promoCodeId === pc.id).map(u => u.userId);
      const uniqueUsers = [...new Set(usersForCode)];
      const ftdCount = uniqueUsers.filter(uid =>
        firstDepositDates.some(d => d.userId === uid)
      ).length;
      totalFtdCommission = totalFtdCommission.add(
        new Prisma.Decimal(ftdFee).mul(ftdCount)
      );
    }
  }

  const depositAggFilter: any = {
    userId: { in: referredUserIds },
    type: "deposit",
    status: "success",
    category: "transaction",
  };
  if (dateFilter.createdAt) depositAggFilter.createdAt = dateFilter.createdAt;
  const totalDepositsAgg = await db.transaction.aggregate({
    where: depositAggFilter,
    _sum: { amount: true },
  });
  const totalDeposits = totalDepositsAgg._sum.amount || new Prisma.Decimal(0);

  const ownW = await db.transaction.aggregate({
    where: {
      userId: buyerId,
      type: "withdrawal",
      status: "success",
      ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
    },
    _sum: { amount: true },
  });
  const ownWithdrawals = ownW._sum.amount || new Prisma.Decimal(0);
  const balance = totalFtdCommission.minus(ownWithdrawals);

  const mediaBuyer = await db.user.findFirst({
    where: { id: buyerId, role: "MEDIA" },
    include: {
      assignedPromoCodes: {
        include: {
          _count: { select: { userPromoCodes: true } },
          influencerEarnings: true,
          userPromoCodes: {
            where: upcFilter,
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

  const enrichedPromoCodes = await Promise.all(
    mediaBuyer.assignedPromoCodes.map(async (code) => {
      const regs = await db.userPromoCode.count({
        where: {
          promoCodeId: code.id,
          ...(dateFilter.createdAt ? { lastUsedAt: dateFilter.createdAt } : {}),
        },
      });

      const usersForCode = allUserPromoCodes
        .filter(u => u.promoCodeId === code.id)
        .map(u => u.userId);
      const uniqueUserIds = [...new Set(usersForCode)];

      const ftdCount = uniqueUserIds.filter(uid =>
        firstDepositDates.some(d => d.userId === uid)
      ).length;

      const ftdFee = code.commissionPercentage || 0;
      const ftdCommission = new Prisma.Decimal(ftdFee).mul(ftdCount);

      return {
        ...code,
        ftdCount,
        ftdCommission: ftdCommission.toString(),
        registrations: regs,
      };
    })
  );

  const earningsByUser = await db.influencerEarning.groupBy({
    by: ["sourceUserId"],
    where: { influencerId: buyerId, sourceUserId: { in: referredUserIds } },
    _sum: { amount: true },
  });
  const commissionMap = new Map(
    earningsByUser.map(e => [e.sourceUserId, e._sum.amount || new Prisma.Decimal(0)])
  );

  let allUsers = mediaBuyer.assignedPromoCodes.flatMap(code =>
    code.userPromoCodes.map(upc => ({
      ...upc.user,
      promoCodeUsed: code.code,
      joinedAt: upc.lastUsedAt || upc.user.createdAt,
      totalCommission: commissionMap.get(upc.user.id) || new Prisma.Decimal(0),
      hasDeposited: depositSet.has(upc.user.id),
    }))
  );

  if (hasDepositedFilter === "deposited") {
    allUsers = allUsers.filter(u => u.hasDeposited);
  } else if (hasDepositedFilter === "notdeposited") {
    allUsers = allUsers.filter(u => !u.hasDeposited);
  }

  const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());
  uniqueUsers.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

  const totalReferrals = uniqueUsers.length;
  const skip = (page - 1) * limit;
  const paginatedUsers = uniqueUsers.slice(skip, skip + limit);

  return NextResponse.json({
    ...mediaBuyer,
    assignedPromoCodes: enrichedPromoCodes,
    totalReferrals,
    totalCommission: totalFtdCommission,
    totalDeposits: totalDeposits.toString(),
    totalFtdCommission: totalFtdCommission.toString(),
    totalRegistrations,
    totalFirstDeposits,
    totalBalance: balance.toString(),
    commissionPercent: mediaBuyer.commissionPercent ?? 0,
    totalOwnWithdrawals: ownWithdrawals.toString(),
    referredUsers: paginatedUsers,
    referredUsersPagination: {
      currentPage: page,
      totalPages: Math.ceil(totalReferrals / limit),
      totalCount: totalReferrals,
      hasNext: skip + limit < totalReferrals,
      hasPrev: page > 1,
    },
  });
}