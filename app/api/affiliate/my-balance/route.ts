import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'AFFILIATE' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliateId = session.user.id;
  const { searchParams } = request.nextUrl;
  const showDetails = searchParams.get('details') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const affiliate = await db.user.findUnique({
    where: { id: affiliateId },
    select: { commissionPercent: true },
  });
  const commissionPercent = affiliate?.commissionPercent || 0;

  const promoCodes = await db.promoCode.findMany({
    where: { createdByUserId: affiliateId },
    select: { id: true },
  });
  const promoCodeIds = promoCodes.map(p => p.id);

  let netFlow = new Prisma.Decimal(0);

  if (promoCodeIds.length > 0) {
    const userPromoCodes = await db.userPromoCode.findMany({
      where: { promoCodeId: { in: promoCodeIds } },
      select: { userId: true },
    });
    const referredUserIds = [...new Set(userPromoCodes.map(up => up.userId))];

    if (referredUserIds.length > 0) {
      const withdrawals = await db.transaction.aggregate({
        where: {
          userId: { in: referredUserIds },
          type: 'withdrawal',
          status: 'success',
          category: { not: 'transaction' },
        },
        _sum: { amount: true },
      });

      const deposits = await db.transaction.aggregate({
        where: {
          userId: { in: referredUserIds },
          type: 'deposit',
          status: { in: ['success', 'pending'] },
          category: { not: 'transaction' },
        },
        _sum: { amount: true },
      });

      const totalW = withdrawals._sum.amount || new Prisma.Decimal(0);
      const totalD = deposits._sum.amount || new Prisma.Decimal(0);
      netFlow = totalW.minus(totalD);
    }
  }

  const commissionAmount = netFlow.mul(commissionPercent).div(100);

  const ownWithdrawals = await db.transaction.aggregate({
    where: { userId: affiliateId, type: 'withdrawal', status: 'success' },
    _sum: { amount: true },
  });
  const totalOwnWithdrawals = ownWithdrawals._sum.amount || new Prisma.Decimal(0);

  const finalBalance = commissionAmount.minus(totalOwnWithdrawals);

  let withdrawalsList: any[] = [];
  let withdrawalsTotal = 0;
  if (showDetails) {
    const skip = (page - 1) * limit;
    const [list, count] = await Promise.all([
      db.transaction.findMany({
        where: { userId: affiliateId, type: 'withdrawal', status: 'success' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, amount: true, createdAt: true, description: true },
      }),
      db.transaction.count({ where: { userId: affiliateId, type: 'withdrawal', status: 'success' } }),
    ]);
    withdrawalsList = list;
    withdrawalsTotal = count;
  }

  return NextResponse.json({
    netFlow: netFlow.toString(),
    commissionPercent,
    commissionAmount: commissionAmount.toString(),
    totalOwnWithdrawals: totalOwnWithdrawals.toString(),
    finalBalance: finalBalance.toString(),
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