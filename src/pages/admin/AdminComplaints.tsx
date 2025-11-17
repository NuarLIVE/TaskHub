import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface Complaint {
  id: string;
  reported_user_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reported_user: {
    name: string;
    email: string;
  };
  reporter: {
    name: string;
    email: string;
  };
}

export default function AdminComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = getSupabase();

  useEffect(() => {
    loadComplaints();

    const subscription = supabase
      .channel('complaints_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, loadComplaints)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          reported_user:profiles!complaints_reported_user_id_fkey(name, email),
          reporter:profiles!complaints_reporter_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'reviewed' | 'dismissed') => {
    try {
      setProcessing(id);

      const { error } = await supabase
        .from('complaints')
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await loadComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#6FE7C8]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Жалобы</h1>

      {complaints.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Жалоб пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Жалоба на пользователя
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(complaint.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  {complaint.status === 'pending' ? (
                    <Badge className="bg-amber-500">Ожидает</Badge>
                  ) : complaint.status === 'reviewed' ? (
                    <Badge className="bg-green-500">Рассмотрена</Badge>
                  ) : (
                    <Badge variant="secondary">Отклонена</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Жалоба на:</p>
                    <p className="font-medium">{complaint.reported_user.name}</p>
                    <p className="text-sm text-gray-600">{complaint.reported_user.email}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Подал жалобу:</p>
                    <p className="font-medium">{complaint.reporter.name}</p>
                    <p className="text-sm text-gray-600">{complaint.reporter.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Причина:</p>
                  <p className="text-sm">{complaint.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Описание:</p>
                  <p className="text-sm text-gray-600">{complaint.description}</p>
                </div>

                {complaint.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleUpdateStatus(complaint.id, 'reviewed')}
                      disabled={processing === complaint.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing === complaint.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Рассмотрена
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(complaint.id, 'dismissed')}
                      disabled={processing === complaint.id}
                      variant="outline"
                      className="flex-1"
                    >
                      {processing === complaint.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Отклонить
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
