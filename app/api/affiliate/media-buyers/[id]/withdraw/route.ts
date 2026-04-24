import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'AFFILIATE' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const buyerId = params.id;

  const buyer = await db.user.findFirst({
    where: { id: buyerId, role: 'MEDIA' },
  });
  if (!buyer) {
    return NextResponse.json({ error: 'Media buyer not found' }, { status: 404 });
  }

  const body = await request.json();
  const { amount, description } = body;

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const transaction = await db.transaction.create({
    data: {
      type: 'withdrawal',
      amount: parsedAmount,
      status: 'success',
      description: description || 'Affiliate withdrawal',
      category: 'affiliate_withdrawal',
      userId: buyerId,
    },
  });

  return NextResponse.json({ transaction });
}