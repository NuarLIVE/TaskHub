import prisma from '../../../prisma/client';

export const listDisputes = async (status: string) => {
  const state = status === 'closed' ? 'RESOLVED' : 'OPEN';

  const items = await prisma.dispute.findMany({
    where: { state },
    include: {
      deal: { select: { id: true, amount: true, currency: true, clientId: true, freelancerId: true } },
      openedBy: { select: { email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    items: items.map((d: any) => ({
      id: d.id,
      order_id: d.dealId,
      opened_by: d.openedBy.email,
      reason: d.reason,
      created_at: d.createdAt
    }))
  };
};

export const resolveDispute = async (id: string, winner: 'buyer' | 'seller', actorId: string) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { deal: true }
  });

  if (!dispute) throw new Error('Dispute not found');

  const winnerId = winner === 'buyer' ? dispute.deal.clientId : dispute.deal.freelancerId;

  await prisma.$transaction([
    prisma.walletBalance.upsert({
      where: { userId_currency: { userId: winnerId, currency: dispute.deal.currency } },
      update: { available: { increment: dispute.deal.amount } },
      create: { userId: winnerId, currency: dispute.deal.currency, available: dispute.deal.amount }
    }),
    prisma.dispute.update({
      where: { id },
      data: { state: 'RESOLVED', winner, resolvedAt: new Date() }
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: 'DISPUTE_RESOLVE',
        targetType: 'DISPUTE',
        targetId: id,
        meta: { winner }
      }
    })
  ]);

  return { winner };
};
