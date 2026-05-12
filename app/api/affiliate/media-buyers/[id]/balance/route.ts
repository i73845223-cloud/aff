import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'AFFILIATE' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const buyerId = params.id;
  const { searchParams } = request.nextUrl;
  const showDetails = searchParams.get('details') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const dateFilter: any = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom);
    if (dateTo) dateFilter.createdAt.lte = new Date(dateTo);
  }

  const buyer = await db.user.findFirst({
    where: { id: buyerId, role: 'MEDIA' },
    select: { id: true, commissionPercent: true },
  });
  if (!buyer) {
    return NextResponse.json({ error: 'Media buyer not found' }, { status: 404 });
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

  let firstDepositDates: { userId: string }[] = [];
  let totalFtdCommission = new Prisma.Decimal(0);

  if (referredUserIds.length > 0) {
    const firstDepRaw = await db.transaction.groupBy({
      by: ['userId'],
      where: { userId: { in: referredUserIds }, type: 'deposit', status: 'success' },
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

    for (const pc of promoCodes) {
      const ftdFee = pc.commissionPercentage || 0;
      const usersForCode = allUserPromoCodes.filter(u => u.promoCodeId === pc.id).map(u => u.userId);
      const uniqueUsers = [...new Set(usersForCode)];
      const ftdCount = uniqueUsers.filter(uid => firstDepositDates.some(d => d.userId === uid)).length;
      totalFtdCommission = totalFtdCommission.add(new Prisma.Decimal(ftdFee).mul(ftdCount));
    }
  }

  const ownW = await db.transaction.aggregate({
    where: {
      userId: buyerId,
      type: 'withdrawal',
      status: 'success',
      ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
    },
    _sum: { amount: true },
  });
  const ownWithdrawals = ownW._sum.amount || new Prisma.Decimal(0);
  const balance = totalFtdCommission.minus(ownWithdrawals);

  let withdrawalsList: any[] = [];
  let withdrawalsTotal = 0;
  if (showDetails) {
    const skip = (page - 1) * limit;
    const [list, count] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId: buyerId,
          type: 'withdrawal',
          status: 'success',
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, amount: true, createdAt: true, description: true },
      }),
      db.transaction.count({
        where: {
          userId: buyerId,
          type: 'withdrawal',
          status: 'success',
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        },
      }),
    ]);
    withdrawalsList = list;
    withdrawalsTotal = count;
  }

  return NextResponse.json({
    totalFtdCommission: totalFtdCommission.toString(),
    ownWithdrawals: ownWithdrawals.toString(),
    balance: balance.toString(),
    ...(showDetails && {
      withdrawals: withdrawalsList,
      withdrawalsPagination: {
        page,
        limit,
        total: withdrawalsTotal,
        totalPages: Math.ceil(withdrawalsTotal / limit),
      },
    }),
  });
}