import { useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

interface ModerationResult {
  flagged: boolean;
  reasons: string[];
  confidence: number;
  action: 'none' | 'warning' | 'blocked';
  message?: string;
}

interface UseModerationOptions {
  contentType: 'proposal' | 'message' | 'order' | 'task';
  debounceMs?: number;
  onBlock?: (message: string) => void;
  onWarning?: (message: string) => void;
}

export function useContentModeration({
  contentType,
  debounceMs = 500,
  onBlock,
  onWarning
}: UseModerationOptions) {
  const [isChecking, setIsChecking] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const checkContent = useCallback(async (content: string): Promise<ModerationResult | null> => {
    if (!content.trim()) {
      setIsBlocked(false);
      setBlockMessage('');
      setModerationError(null);
      return null;
    }

    try {
      setIsChecking(true);
      setModerationError(null);

      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return null;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            contentType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Moderation check failed');
      }

      const result: ModerationResult = await response.json();

      if (result.flagged) {
        if (result.action === 'blocked') {
          setIsBlocked(true);
          setBlockMessage(result.message || 'Контент содержит запрещённую информацию');
          onBlock?.(result.message || 'Контент содержит запрещённую информацию');
        } else if (result.action === 'warning') {
          onWarning?.(result.message || 'Пожалуйста, проверьте содержание');
        }
      } else {
        setIsBlocked(false);
        setBlockMessage('');
      }

      return result;
    } catch (error) {
      console.error('Moderation check error:', error);
      setModerationError('Не удалось проверить контент. Попробуйте ещё раз.');
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [contentType, onBlock, onWarning]);

  const checkContentDebounced = useCallback((content: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      checkContent(content);
    }, debounceMs);
  }, [checkContent, debounceMs]);

  const checkContentImmediate = useCallback((content: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    return checkContent(content);
  }, [checkContent]);

  return {
    isChecking,
    isBlocked,
    blockMessage,
    moderationError,
    checkContent: checkContentDebounced,
    checkContentImmediate,
  };
}
