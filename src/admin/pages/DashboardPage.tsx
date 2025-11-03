import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/lib/auth';

export default function DashboardPage() {
  const [stats, setStats] = useState({ online: 0, orders: [], revenue: [] });

  useEffect(() => {
    const API_URL = 'http://localhost:8080/api/v1';
    
    Promise.all([
      authService.fetchWithAuth(`${API_URL}/admin/stats/online-now`),
      authService.fetchWithAuth(`${API_URL}/admin/stats/orders?range=7d`),
      authService.fetchWithAuth(`${API_URL}/admin/stats/revenue?range=7d`)
    ]).then(async ([onlineRes, ordersRes, revenueRes]) => {
      const online = await onlineRes.json();
      const orders = await ordersRes.json();
      const revenue = await revenueRes.json();
      setStats({ online: online.online, orders, revenue });
    });
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Online Now</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.online}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {stats.orders.reduce((sum: number, d: any) => sum + d.count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              ${Math.floor(stats.revenue.reduce((sum: number, d: any) => sum + d.revenue_cents, 0) / 100)}
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
