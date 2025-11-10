import { AlertCircle, CheckCircle } from 'lucide-react';

interface ProposalLimitIndicatorProps {
  used: number;
  max: number;
  type?: 'orders' | 'tasks';
}

export function ProposalLimitIndicator({ used, max, type = 'orders' }: ProposalLimitIndicatorProps) {
  const remaining = max - used;
  const remainingPercentage = (remaining / max) * 100;
  const isNearLimit = remaining <= 18;
  const isAtLimit = remaining <= 0;

  return (
    <div className="bg-gradient-to-r from-[#EFFFF8] to-[#E0F7EE] rounded-lg border border-[#3F7F6E]/20 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isAtLimit ? (
            <AlertCircle className="h-5 w-5 text-red-600" />
          ) : isNearLimit ? (
            <AlertCircle className="h-5 w-5 text-orange-600" />
          ) : (
            <CheckCircle className="h-5 w-5 text-[#3F7F6E]" />
          )}
          <div>
            <h3 className="font-semibold text-sm text-[#3F7F6E]">
              {type === 'orders' ? 'Откликов на заказы в этом месяце' : 'Откликов на задачи'}
            </h3>
            {type === 'tasks' && (
              <p className="text-xs text-[#3F7F6E]/70">Неограниченно</p>
            )}
          </div>
        </div>
        {type === 'orders' && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#3F7F6E]">
              {remaining}
            </p>
            <p className="text-xs text-[#3F7F6E]/70">осталось</p>
          </div>
        )}
      </div>

      {type === 'orders' && (
        <>
          <div className="w-full bg-gray-200/60 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full transition-all ${
                isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-[#3F7F6E]'
              }`}
              style={{ width: `${Math.min(Math.max(remainingPercentage, 0), 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#3F7F6E]/70">
              Использовано: {used} из {max}
            </span>
            {isAtLimit && (
              <span className="text-red-600 font-medium">
                Лимит исчерпан
              </span>
            )}
            {isNearLimit && !isAtLimit && (
              <span className="text-orange-600 font-medium">
                Осталось мало
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
