import React from 'react';
import { LayoutDashboard, Users, ShoppingBag, AlertTriangle, DollarSign } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navItems = [
    { href: '#/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '#/admin/users', icon: Users, label: 'Users' },
    { href: '#/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { href: '#/admin/disputes', icon: AlertTriangle, label: 'Disputes' },
    { href: '#/admin/payouts', icon: DollarSign, label: 'Payouts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <nav className="px-4 space-y-1">
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
