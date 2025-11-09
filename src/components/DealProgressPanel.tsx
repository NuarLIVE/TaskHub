import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Send, Clock } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';

interface DealProgressPanelProps {
  dealId: string;
  userId: string;
  isFreelancer: boolean;
}

interface ProgressReport {
  id: string;
  progress_percentage: number;
  comment: string;
  created_at: string;
}

interface TaskItem {
  id: string;
  task_name: string;
  is_completed: boolean;
  order_index: number;
}

interface TimeExtension {
  id: string;
  reason: string;
  additional_days: number;
  status: string;
  created_at: string;
}

interface Deal {
  current_progress: number;
  last_progress_update: string | null;
}

export default function DealProgressPanel({ dealId, userId, isFreelancer }: DealProgressPanelProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([]);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDays, setExtensionDays] = useState(1);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [dealId]);

  const loadData = async () => {
    const supabase = getSupabase();

    const { data: dealData } = await supabase
      .from('deals')
      .select('current_progress, last_progress_update')
      .eq('id', dealId)
      .maybeSingle();

    if (dealData) {
      setDeal(dealData);
      setNewProgress(dealData.current_progress || 0);
    }

    const { data: reports } = await supabase
      .from('deal_progress_reports')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (reports) setProgressReports(reports);

    const { data: tasks } = await supabase
      .from('deal_task_items')
      .select('*')
      .eq('deal_id', dealId)
      .order('order_index', { ascending: true });

    if (tasks) setTaskItems(tasks);
  };

  const handleSubmitProgress = async () => {
    if (!newComment.trim()) {
      alert('Пожалуйста, добавьте комментарий');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();

    const { error: reportError } = await supabase
      .from('deal_progress_reports')
      .insert({
        deal_id: dealId,
        progress_percentage: newProgress,
        comment: newComment,
        created_by: userId
      });

    if (reportError) {
      alert('Ошибка при сохранении отчета');
      setLoading(false);
      return;
    }

    const { error: dealError } = await supabase
      .from('deals')
      .update({
        current_progress: newProgress,
        last_progress_update: new Date().toISOString(),
        progress_reminder_sent: false
      })
      .eq('id', dealId);

    if (dealError) {
      alert('Ошибка при обновлении прогресса');
      setLoading(false);
      return;
    }

    setNewComment('');
    await loadData();
    setLoading(false);
    alert('Отчет успешно сохранен');
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('deal_task_items')
      .update({ is_completed: !currentStatus })
      .eq('id', taskId);

    if (!error) {
      await loadData();
    }
  };

  const handleRequestExtension = async () => {
    if (!extensionReason.trim()) {
      alert('Пожалуйста, укажите причину');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase
      .from('deal_time_extensions')
      .insert({
        deal_id: dealId,
        requested_by: userId,
        reason: extensionReason,
        additional_days: extensionDays
      });

    if (error) {
      alert('Ошибка при запросе продления');
      setLoading(false);
      return;
    }

    setExtensionReason('');
    setExtensionDays(1);
    setShowExtensionForm(false);
    setLoading(false);
    alert('Запрос на продление отправлен');
  };

  const handleSubmitForReview = async () => {
    if (newProgress !== 100) {
      alert('Перед отправкой на проверку установите прогресс 100%');
      return;
    }

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase
      .from('deals')
      .update({ status: 'pending_review' })
      .eq('id', dealId);

    if (error) {
      alert('Ошибка при отправке на проверку');
      setLoading(false);
      return;
    }

    setLoading(false);
    alert('Работа отправлена на проверку');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasNoTasks = taskItems.length === 0;

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Текущий прогресс</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Готовность проекта</span>
              <span className="text-lg font-semibold text-[#3F7F6E]">{deal?.current_progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#6FE7C8] h-3 rounded-full transition-all duration-300"
                style={{ width: `${deal?.current_progress || 0}%` }}
              />
            </div>
            {deal?.last_progress_update && (
              <p className="text-xs text-gray-500 mt-1">
                Обновлено: {formatDate(deal.last_progress_update)}
              </p>
            )}
          </div>

          {isFreelancer && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Прогресс (%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newProgress}
                  onChange={(e) => setNewProgress(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm font-semibold text-[#3F7F6E]">{newProgress}%</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
                  rows={3}
                  placeholder="Опишите проделанную работу..."
                />
              </div>
              <button
                onClick={handleSubmitProgress}
                disabled={loading || !newComment.trim()}
                className="w-full bg-[#3F7F6E] text-white py-2 rounded-lg hover:bg-[#2d5f52] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Сохранить прогресс
              </button>
            </div>
          )}

          {/* Progress Reports Accordion */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setReportsExpanded(!reportsExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">Промежуточные отчеты</span>
              {reportsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {reportsExpanded && (
              <div className="border-t border-gray-200 p-3 space-y-3 max-h-64 overflow-y-auto">
                {progressReports.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">Отчетов пока нет</p>
                ) : (
                  progressReports.map((report) => (
                    <div key={report.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[#3F7F6E]">{report.progress_percentage}%</span>
                        <span className="text-xs text-gray-500">{formatDate(report.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{report.comment}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Tasks Accordion */}
          <div className={`border border-gray-200 rounded-lg ${hasNoTasks ? 'opacity-50' : ''}`}>
            <button
              onClick={() => !hasNoTasks && setTasksExpanded(!tasksExpanded)}
              disabled={hasNoTasks}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium text-gray-800">Задачи</span>
              {!hasNoTasks && (tasksExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />)}
            </button>
            {tasksExpanded && !hasNoTasks && (
              <div className="border-t border-gray-200 p-3 space-y-2">
                {taskItems.map((task) => (
                  <label key={task.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => isFreelancer && handleToggleTask(task.id, task.is_completed)}
                      disabled={!isFreelancer}
                      className="w-4 h-4 text-[#3F7F6E] rounded focus:ring-[#3F7F6E]"
                    />
                    <span className={`text-sm ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                      {task.task_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isFreelancer && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleSubmitForReview}
            disabled={loading || newProgress !== 100}
            className="w-full bg-[#6FE7C8] text-white py-2.5 rounded-lg hover:bg-[#5dd4b5] disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Отправить на проверку
          </button>
          {showExtensionForm ? (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <textarea
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Причина запроса продления..."
                className="w-full border border-gray-300 rounded p-2 text-sm resize-none"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value))}
                  className="w-20 border border-gray-300 rounded p-2 text-sm"
                />
                <span className="text-sm text-gray-600">дней</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRequestExtension}
                  disabled={loading || !extensionReason.trim()}
                  className="flex-1 bg-[#3F7F6E] text-white py-2 rounded hover:bg-[#2d5f52] disabled:opacity-50 text-sm"
                >
                  Отправить
                </button>
                <button
                  onClick={() => setShowExtensionForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowExtensionForm(true)}
              disabled={loading}
              className="w-full bg-white border border-[#3F7F6E] text-[#3F7F6E] py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Запросить дополнительное время
            </button>
          )}
        </div>
      )}
    </div>
  );
}
