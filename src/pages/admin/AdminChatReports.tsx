import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Check, X, Loader2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

interface ChatReport {
  id: string;
  chat_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter: {
    name: string;
    email: string;
  };
  reported_user: {
    name: string;
    email: string;
  };
}

const ITEMS_PER_PAGE = 10;

export default function AdminChatReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected'>('all');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const supabase = getSupabase();

  useEffect(() => {
    loadReports();
  }, [currentPage, statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chat_reports')
        .select(`
          *,
          reporter:profiles!chat_reports_reporter_id_fkey(name, email),
          reported_user:profiles!chat_reports_reported_user_id_fkey(name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setReports(data || []);
      setTotalReports(count || 0);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: 'reviewed' | 'resolved' | 'rejected') => {
    if (!user) return;
    setProcessing(reportId);

    try {
      const { error } = await supabase
        .from('chat_reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes[reportId] || null,
        })
        .eq('id', reportId);

      if (error) throw error;

      await loadReports();
      setAdminNotes((prev) => {
        const updated = { ...prev };
        delete updated[reportId];
        return updated;
      });
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Ошибка при обновлении жалобы');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Ожидает', className: 'bg-yellow-100 text-yellow-800' },
      reviewed: { label: 'Рассмотрена', className: 'bg-blue-100 text-blue-800' },
      resolved: { label: 'Решена', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-800' },
    };
    const config = variants[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(totalReports / ITEMS_PER_PAGE);

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="min-h-screen bg-gradient-to-b from-[#EFFFF8]/30 to-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Жалобы из чатов</h1>
          <p className="text-[#3F7F6E] mt-2">Управление жалобами, поданными пользователями в чатах</p>
        </div>

        <Card className="border-[#6FE7C8]/20 shadow-md mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                  size="sm"
                >
                  Все ({totalReports})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                  size="sm"
                  className="text-yellow-700"
                >
                  Ожидают
                </Button>
                <Button
                  variant={statusFilter === 'reviewed' ? 'default' : 'outline'}
                  onClick={() => { setStatusFilter('reviewed'); setCurrentPage(1); }}
                  size="sm"
                  className="text-blue-700"
                >
                  Рассмотрены
                </Button>
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  onClick={() => { setStatusFilter('resolved'); setCurrentPage(1); }}
                  size="sm"
                  className="text-green-700"
                >
                  Решены
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => { setStatusFilter('rejected'); setCurrentPage(1); }}
                  size="sm"
                  className="text-red-700"
                >
                  Отклонены
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-[#6FE7C8]/20">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#6FE7C8] mx-auto mb-3" />
              <p className="text-[#3F7F6E]">Загрузка...</p>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="border-[#6FE7C8]/20">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-[#3F7F6E]" />
              <p className="text-[#3F7F6E]">Жалоб не найдено</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {reports.map((report) => (
                <Card key={report.id} className="border-[#6FE7C8]/20 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {getStatusBadge(report.status)}
                          <span className="text-xs text-gray-500">{formatDate(report.created_at)}</span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-sm font-medium text-gray-700">От:</span>
                            <span className="text-sm text-gray-900">{report.reporter.name}</span>
                            <span className="text-xs text-gray-500">({report.reporter.email})</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-sm font-medium text-gray-700">На:</span>
                            <span className="text-sm text-gray-900">{report.reported_user.name}</span>
                            <span className="text-xs text-gray-500">({report.reported_user.email})</span>
                          </div>
                        </div>

                        {report.reason && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Причина:</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{report.reason}</p>
                          </div>
                        )}

                        {report.admin_notes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Заметки админа:</p>
                            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">{report.admin_notes}</p>
                          </div>
                        )}

                        {report.status === 'pending' && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Добавить заметку:</p>
                            <Input
                              placeholder="Ваши заметки..."
                              value={adminNotes[report.id] || ''}
                              onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MessageSquare className="h-4 w-4" />
                          <span>ID чата: {report.chat_id}</span>
                        </div>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                            disabled={processing === report.id}
                            className="flex-1 lg:w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            {processing === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Рассмотреть</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            disabled={processing === report.id}
                            className="flex-1 lg:w-full text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Решить</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, 'rejected')}
                            disabled={processing === report.id}
                            className="flex-1 lg:w-full text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Отклонить</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <Card className="border-[#6FE7C8]/20 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Назад</span>
                    </Button>
                    <span className="text-sm text-gray-600">
                      Страница {currentPage} из {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="hidden sm:inline">Вперёд</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
