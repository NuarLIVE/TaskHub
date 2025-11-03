import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';

export default function UsersPage() {
  const [users, setUsers] = useState({ items: [], total: 0 });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const API_URL = 'http://localhost:8080/api/v1';
    authService.fetchWithAuth(`${API_URL}/admin/users?query=${query}&page=${page}&limit=20`)
      .then(res => res.json())
      .then(setUsers);
  }, [query, page]);

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <div className="mb-4">
        <Input
          placeholder="Search by email or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Created</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.items.map((user: any) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.role}</td>
                <td className="p-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`#/admin/users/${user.id}`}>View</a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button disabled={users.items.length < 20} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </AdminLayout>
  );
}
