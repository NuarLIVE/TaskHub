import prisma from '../../../prisma/client';

export const getOnlineCount = async () => {
  return { online: Math.floor(Math.random() * 50) + 10 };
};

export const getOrdersStats = async (range: string) => {
  const days = range === '7d' ? 7 : 30;
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + 5
    });
  }
  return data;
};

export const getRevenueStats = async (range: string) => {
  const days = range === '7d' ? 7 : 30;
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      revenue_cents: Math.floor(Math.random() * 50000) + 10000
    });
  }
  return data;
};

export const getBoostUsage = async () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      boosted_count: Math.floor(Math.random() * 10) + 2,
      normal_count: Math.floor(Math.random() * 30) + 10
    });
  }
  return data;
};
