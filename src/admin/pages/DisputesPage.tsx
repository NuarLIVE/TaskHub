import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    const API_URL = 'http://localhost:8080/api/v1';
    authService.fetchWithAuth(`${API_URL}/admin/disputes?status=${filter}`)
      .then(res => res.json())
      .then(data => setDisputes(data.items));
  }, [filter]);

  const handleResolve = async (id: string, winner: string) => {
    if (!confirm(`Resolve dispute in favor of ${winner}?`)) return;
    
    const API_URL = 'http://localhost:8080/api/v1';
    await authService.fetchWithAuth(`${API_URL}/admin/disputes/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner })
    });
    
    setDisputes(disputes.filter(d => d.id !== id));
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Disputes</h1>
      <div className="mb-4 flex gap-2">
        <Button variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>
          Open
        </Button>
        <Button variant={filter === 'closed' ? 'default' : 'outline'} onClick={() => setFilter('closed')}>
          Closed
        </Button>
      </div>
      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Order ID</th>
              <th className="text-left p-4">Opened By</th>
              <th className="text-left p-4">Reason</th>
              <th className="text-left p-4">Created</th>
              {filter === 'open' && <th className="text-left p-4">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {disputes.map((dispute: any) => (
              <tr key={dispute.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{dispute.order_id}</td>
                <td className="p-4">{dispute.opened_by}</td>
                <td className="p-4">{dispute.reason}</td>
                <td className="p-4">{new Date(dispute.created_at).toLocaleDateString()}</td>
                {filter === 'open' && (
                  <td className="p-4 flex gap-2">
                    <Button size="sm" onClick={() => handleResolve(dispute.id, 'buyer')}>
                      Buyer Wins
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolve(dispute.id, 'seller')}>
                      Seller Wins
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
