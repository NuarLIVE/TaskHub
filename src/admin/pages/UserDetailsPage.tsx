import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/lib/auth';

export default function UserDetailsPage() {
  const params = useParams();
  const id = params.id || window.location.hash.split('/').pop();
  const [user, setUser] = useState<any>(null);
  const [muteUntil, setMuteUntil] = useState('');

  useEffect(() => {
    const API_URL = 'http://localhost:8080/api/v1';
    authService.fetchWithAuth(`${API_URL}/admin/users/${id}`)
      .then(res => res.json())
      .then(setUser);
  }, [id]);

  const handleMute = async () => {
    if (!muteUntil) return;
    const API_URL = 'http://localhost:8080/api/v1';
    await authService.fetchWithAuth(`${API_URL}/admin/users/${id}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ until: muteUntil })
    });
    alert('User muted');
  };

  const handleBan = async () => {
    if (!confirm('Ban this user permanently?')) return;
    const API_URL = 'http://localhost:8080/api/v1';
    await authService.fetchWithAuth(`${API_URL}/admin/users/${id}/ban`, {
      method: 'POST'
    });
    alert('User banned');
  };

  if (!user) return <AdminLayout><p>Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">User Details</h1>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Status:</strong> {user.status}</p>
              <p><strong>Balance:</strong> {user.wallet.balance_cents / 100} {user.wallet.currency}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mute Until</label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={muteUntil}
                  onChange={(e) => setMuteUntil(e.target.value)}
                />
                <Button onClick={handleMute}>Mute</Button>
              </div>
            </div>
            <Button variant="destructive" onClick={handleBan}>Ban User</Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
