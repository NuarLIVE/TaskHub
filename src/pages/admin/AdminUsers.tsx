import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Shield, Ban, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'FREELANCER' | 'CLIENT'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800',
      FREELANCER: 'bg-blue-100 text-blue-800',
      CLIENT: 'bg-green-100 text-green-800'
    };
    return variants[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Администратор',
      FREELANCER: 'Исполнитель',
      CLIENT: 'Заказчик'
    };
    return labels[role] || role;
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-gradient-to-b from-[#EFFFF8]/30 to-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Управление пользователями</h1>
          <p className="text-[#3F7F6E] mt-2">Просмотр и управление всеми пользователями платформы</p>
        </div>

        <Card className="border-[#6FE7C8]/20 shadow-md mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по имени или email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('all')}
                  size="sm"
                >
                  Все
                </Button>
                <Button
                  variant={roleFilter === 'ADMIN' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('ADMIN')}
                  size="sm"
                >
                  Админы
                </Button>
                <Button
                  variant={roleFilter === 'FREELANCER' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('FREELANCER')}
                  size="sm"
                >
                  Исполнители
                </Button>
                <Button
                  variant={roleFilter === 'CLIENT' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('CLIENT')}
                  size="sm"
                >
                  Заказчики
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {loading ? (
            <Card className="border-[#6FE7C8]/20">
              <CardContent className="p-8 text-center text-gray-500">
                Загрузка...
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card className="border-[#6FE7C8]/20">
              <CardContent className="p-8 text-center text-gray-500">
                Пользователи не найдены
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="border-[#6FE7C8]/20 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#6FE7C8] to-[#3F7F6E] flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                          {user.is_online && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></span>
                              Онлайн
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.bio && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{user.bio}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Регистрация: {formatDate(user.created_at)}</span>
                          {user.last_seen && (
                            <span>Последняя активность: {formatDate(user.last_seen)}</span>
                          )}
                          {user.rating && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-[#3F7F6E]" />
                              Рейтинг: {user.rating}/5
                            </span>
                          )}
                        </div>
                        {user.balance !== undefined && (
                          <p className="text-sm font-medium text-[#3F7F6E] mt-2">
                            Баланс: ${(user.balance / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.hash = `#/users/${user.id}`}
                      >
                        Профиль
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-8">
          <Card className="border-[#6FE7C8]/20 shadow-md">
            <CardHeader>
              <CardTitle>Статистика пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                  <p className="text-sm text-gray-600">Всего</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">
                    {users.filter(u => u.role === 'FREELANCER').length}
                  </p>
                  <p className="text-sm text-blue-600">Исполнители</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">
                    {users.filter(u => u.role === 'CLIENT').length}
                  </p>
                  <p className="text-sm text-green-600">Заказчики</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <Shield className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-900">
                    {users.filter(u => u.role === 'ADMIN').length}
                  </p>
                  <p className="text-sm text-red-600">Админы</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
