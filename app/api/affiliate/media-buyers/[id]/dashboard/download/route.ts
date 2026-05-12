import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const buyerId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const hasDepositedFilter = searchParams.get("hasDeposited") || "all";

  const dateFilter: any = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom);
    if (dateTo) dateFilter.createdAt.lte = new Date(dateTo);
  }

  const promoCodes = await db.promoCode.findMany({
    where: { assignedUserId: buyerId },
    select: { id: true, code: true, commissionPercentage: true },
  });
  const promoCodeIds = promoCodes.map(p => p.id);

  const upcFilter: any = { promoCodeId: { in: promoCodeIds } };
  if (dateFilter.createdAt) upcFilter.lastUsedAt = dateFilter.createdAt;
  const allUserPromoCodes = await db.userPromoCode.findMany({
    where: upcFilter,
    select: { userId: true, promoCodeId: true },
  });
  const referredUserIds = [...new Set(allUserPromoCodes.map(u => u.userId))];

  const depositSet = new Set(
    await db.transaction.findMany({
      where: {
        userId: { in: referredUserIds },
        type: "deposit",
        status: "success",
        ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
    }).then(res => res.map(d => d.userId))
  );

  const totalRegistrations = allUserPromoCodes.length;

  let firstDepositDates: { userId: string }[] = [];
  let totalFirstDeposits = 0;
  let totalFtdCommission = 0;

  if (referredUserIds.length > 0) {
    const firstRaw = await db.transaction.groupBy({
      by: ["userId"],
      where: { userId: { in: referredUserIds }, type: "deposit", status: "success" },
      _min: { createdAt: true },
    });
    firstDepositDates = firstRaw
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
      const ftdCount = uniqueUsers.filter(uid => firstDepositDates.some(d => d.userId === uid)).length;
      totalFtdCommission += ftdFee * ftdCount;
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
  const totalDeposits = totalDepositsAgg._sum.amount ? Number(totalDepositsAgg._sum.amount) : 0;

  const promoStats = await Promise.all(
    promoCodes.map(async (pc) => {
      const regs = await db.userPromoCode.count({
        where: {
          promoCodeId: pc.id,
          ...(dateFilter.createdAt ? { lastUsedAt: dateFilter.createdAt } : {}),
        },
      });
      const usersForCode = allUserPromoCodes.filter(u => u.promoCodeId === pc.id).map(u => u.userId);
      const uniqueUsers = [...new Set(usersForCode)];
      const ftdCount = uniqueUsers.filter(uid => firstDepositDates.some(d => d.userId === uid)).length;
      return {
        code: pc.code,
        ftdCount,
        ftdCommission: (pc.commissionPercentage || 0) * ftdCount,
        registrations: regs,
      };
    })
  );

  const usersData = await db.user.findMany({
    where: { id: { in: referredUserIds } },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const userPromoMap = new Map<string, string>();
  for (const upc of allUserPromoCodes) {
    const code = promoCodes.find(p => p.id === upc.promoCodeId)?.code || "";
    userPromoMap.set(upc.userId, code);
  }

  let referredUsersList = usersData.map(u => ({
    name: u.name || "",
    email: u.email || "",
    promoCode: userPromoMap.get(u.id) || "",
    joinedAt: u.createdAt.toISOString().slice(0, 10),
    hasDeposited: depositSet.has(u.id) ? "Yes" : "No",
  }));

  if (hasDepositedFilter === "deposited") {
    referredUsersList = referredUsersList.filter(u => u.hasDeposited === "Yes");
  } else if (hasDepositedFilter === "notdeposited") {
    referredUsersList = referredUsersList.filter(u => u.hasDeposited === "No");
  }

  const lines: string[] = [];
  lines.push("SUMMARY");
  lines.push(`Total Registrations,${totalRegistrations}`);
  lines.push(`Total FTDs,${totalFirstDeposits}`);
  lines.push(`Total FTD Commission,${totalFtdCommission}`);
  lines.push(`Total Deposits (transaction),${totalDeposits}`);
  lines.push("");

  lines.push("PROMO CODES");
  lines.push("Code,FTDs,FTD Commission,Registrations");
  for (const ps of promoStats) {
    lines.push(`"${ps.code}",${ps.ftdCount},${ps.ftdCommission},${ps.registrations}`);
  }
  lines.push("");

  lines.push("USERS");
  lines.push("Name,Email,Promo Code,Joined,Has Deposited");
  for (const user of referredUsersList) {
    lines.push(`"${user.name}","${user.email}","${user.promoCode}","${user.joinedAt}","${user.hasDeposited}"`);
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="media-buyer-report.csv"`,
    },
  });
}