import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';

interface ProposalLimitIndicatorProps {
  used: number;
  max: number;
  blockedUntil?: Date | null;
  onBuyMore?: () => void;
}

export function ProposalLimitIndicator({ used, max, blockedUntil, onBuyMore }: ProposalLimitIndicatorProps) {
  const percentage = (used / max) * 100;
  const isBlocked = blockedUntil && new Date(blockedUntil) > new Date();
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= max;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm mb-1">Лимит откликов</h3>
          <p className="text-2xl font-bold">
            {used} <span className="text-lg text-muted-foreground">/ {max}</span>
          </p>
        </div>
        {isAtLimit ? (
          <AlertCircle className="h-5 w-5 text-red-500" />
        ) : isNearLimit ? (
          <AlertCircle className="h-5 w-5 text-orange-500" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {isBlocked && (
        <Badge variant="destructive" className="mb-2 w-full justify-center">
          Заблокирован до {new Date(blockedUntil).toLocaleDateString()}
        </Badge>
      )}

      {isAtLimit && !isBlocked && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Вы достигли месячного лимита откликов
          </p>
          {onBuyMore && (
            <Button size="sm" className="w-full" onClick={onBuyMore}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Докупить +50 за $10
            </Button>
          )}
        </div>
      )}

      {isNearLimit && !isAtLimit && !isBlocked && (
        <p className="text-sm text-orange-600">
          Осталось {max - used} откликов
        </p>
      )}
    </div>
  );
}
