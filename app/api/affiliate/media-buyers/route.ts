import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  const skip = (page - 1) * limit;

  const whereClause: Prisma.UserWhereInput = {
    role: "MEDIA",
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const allMatchingBuyers = await db.user.findMany({
    where: whereClause,
    select: { id: true },
  });
  const matchingBuyerIds = allMatchingBuyers.map(b => b.id);

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where: whereClause,
      include: {
        assignedPromoCodes: {
          include: {
            _count: { select: { userPromoCodes: true } },
            influencerEarnings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.user.count({ where: whereClause }),
  ]);

  const enrichedUsers = users.map((user) => {
    const totalReferrals = user.assignedPromoCodes.reduce(
      (sum, code) => sum + code._count.userPromoCodes,
      0
    );
    const totalCommission = user.assignedPromoCodes.reduce(
      (sum, code) =>
        sum +
        code.influencerEarnings.reduce(
          (s, e) => s + Number(e.amount),
          0
        ),
      0
    );
    return {
      ...user,
      totalReferrals,
      totalCommission,
    };
  });

  const filteredAggregates = await db.transaction.groupBy({
    by: ["type"],
    where: {
      status: "success",
      category: "transaction",
      user: {
        userPromoCodes: {
          some: {
            promoCode: {
              assignedUserId: { in: matchingBuyerIds },
            },
          },
        },
      },
    },
    _sum: { amount: true },
  });

  let totalDeposits = new Prisma.Decimal(0);
  let totalWithdrawals = new Prisma.Decimal(0);

  filteredAggregates.forEach((agg) => {
    const amount = agg._sum.amount || new Prisma.Decimal(0);
    if (agg.type === "deposit") totalDeposits = totalDeposits.add(amount);
    else if (agg.type === "withdrawal") totalWithdrawals = totalWithdrawals.add(amount);
  });

  const totalCommissionAgg = await db.influencerEarning.aggregate({
    where: {
      influencerId: { in: matchingBuyerIds },
    },
    _sum: { amount: true },
  });

  const totalReferralsAgg = await db.userPromoCode.count({
    where: {
      promoCode: {
        assignedUserId: { in: matchingBuyerIds },
      },
    },
  });

  return NextResponse.json({
    users: enrichedUsers,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: skip + limit < totalCount,
      hasPrev: page > 1,
    },
    globalTotals: {
      totalDeposits: totalDeposits.toString(),
      totalWithdrawals: totalWithdrawals.toString(),
      totalCommission: totalCommissionAgg._sum.amount?.toString() || "0",
      totalReferrals: totalReferralsAgg,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "MEDIA",
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}