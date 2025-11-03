import prisma from '../../../prisma/client';

export const listUsers = async (query: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const where = query ? {
    OR: [
      { email: { contains: query, mode: 'insensitive' as any } },
      { id: { contains: query } }
    ]
  } : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true, createdAt: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  return { items, total };
};

export const getUserDetails = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      walletBalances: true,
      clientOrders: { select: { id: true } },
      restrictions: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  if (!user) throw new Error('User not found');

  const wallet = user.walletBalances[0] || { available: 0, currency: 'USD' };
  const activeRestriction = user.restrictions[0];

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: activeRestriction?.type || 'active',
    created_at: user.createdAt,
    wallet: { balance_cents: Math.floor(wallet.available * 100), currency: wallet.currency },
    totals: { orders: user.clientOrders.length, spent: 0, revenue: 0 }
  };
};

export const muteUser = async (userId: string, until: Date, actorId: string) => {
  await prisma.userRestriction.create({
    data: { userId, type: 'MUTE', until }
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'USER_MUTE',
      targetType: 'USER',
      targetId: userId,
      meta: { until }
    }
  });

  return { until: until.toISOString() };
};

export const banUser = async (userId: string, actorId: string) => {
  await prisma.userRestriction.create({
    data: { userId, type: 'BAN' }
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'USER_BAN',
      targetType: 'USER',
      targetId: userId
    }
  });

  return { banned: true };
};
