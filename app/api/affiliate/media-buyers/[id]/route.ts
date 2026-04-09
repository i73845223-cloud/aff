import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

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

  const totalReferrals = mediaBuyer.assignedPromoCodes.reduce(
    (sum, code) => sum + code._count.userPromoCodes,
    0
  );
  const totalCommission = mediaBuyer.assignedPromoCodes.reduce(
    (sum, code) =>
      sum +
      code.influencerEarnings.reduce(
        (s, e) => s + Number(e.amount),
        0
      ),
    0
  );

  const referredUsers = mediaBuyer.assignedPromoCodes.flatMap((code) =>
    code.userPromoCodes.map((upc) => ({
      ...upc.user,
      promoCodeUsed: code.code,
      joinedAt: upc.lastUsedAt || upc.user.createdAt,
    }))
  );

  return NextResponse.json({
    ...mediaBuyer,
    totalReferrals,
    totalCommission,
    referredUsers,
  });
}