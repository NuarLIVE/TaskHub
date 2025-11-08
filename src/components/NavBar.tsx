import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase, resetSupabase } from '@/lib/supabaseClient';
import { useSupabaseKeepAlive } from '@/hooks/useSupabaseKeepAlive';
import { queryWithRetry, subscribeWithMonitoring } from '@/lib/supabase-utils';

const PUBLIC_LINKS = [
  { href: '#/market', label: 'Биржа' },
  { href: '#/market?category=Разработка', label: 'Разработка' },
  { href: '#/market?category=Дизайн', label: 'Дизайн' },
  { href: '#/market?category=Маркетинг', label: 'Маркетинг' },
  { href: '#/market?category=Локализация', label: 'Локализация' },
  { href: '#/market?category=Копирайт', label: 'Копирайт' },
  { href: '#/market?category=QA / Безопасность', label: 'QA' }
];

const PRIVATE_LINKS = [
  { href: '#/market', label: 'Биржа' },
  { href: '#/my-deals', label: 'Мои сделки' },
  { href: '#/proposals', label: 'Отклики' },
  { href: '#/messages', label: 'Сообщения' },
  { href: '#/wallet', label: 'Кошелёк' },
  { href: '#/me', label: 'Профиль' }
];

export default function NavBar() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false); // флаг для зелёной точки
  const { isAuthenticated, user, logout } = useAuth();

  const computeHasUnread = async () => {
    if (!user) {
      setHasUnread(false);
      return;
    }
    const { data, error } = await queryWithRetry(() =>
      getSupabase()
        .from('chats')
        .select('id, participant1_id, participant2_id, unread_count_p1, unread_count_p2')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    );
    if (error) {
      setHasUnread(false);
      return;
    }
    const anyUnread = (data || []).some((c: any) =>
      c.participant1_id === user.id ? (c.unread_count_p1 || 0) > 0 : (c.unread_count_p2 || 0) > 0
    );
    setHasUnread(anyUnread);
  };

  useSupabaseKeepAlive({
    onRecover: async () => {
      await resetSupabase();
      await computeHasUnread();
    },
    intervalMs: 90_000,
    headTable: 'profiles'
  });

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
      setMobileMenuOpen(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!user) return;

    computeHasUnread();
    const interval = setInterval(computeHasUnread, 15000);

    const handleVisibilityChange = () => {
      if (!document.hidden) computeHasUnread();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let chatsSub: any = null;
    subscribeWithMonitoring('navbar-chats-unread', {
      table: 'chats',
      event: '*',
      callback: () => computeHasUnread(),
      onError: () => setTimeout(computeHasUnread, 1200)
    }).then(s => (chatsSub = s));

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      chatsSub?.unsubscribe?.();
    };
  }, [user?.id]);

  const isActiveLink = (href: string) => {
    const path = href.replace('#', '');
    const current = currentHash.replace('#', '') || '/';
    if (path === '/' && current === '/') return true;
    if (path !== '/' && current.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[#6FE7C8] bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[#6FE7C8]" />
          <a href="#/" className="font-bold tracking-tight hover:text-[#6FE7C8] transition">
            FreelanceHub
          </a>
          <Badge className="ml-2" variant="secondary">beta</Badge>
        </div>

        <div className="hidden lg:flex items-center gap-6 text-sm">
          {(isAuthenticated ? PRIVATE_LINKS : PUBLIC_LINKS).map((link) => {
            const isMessages = link.label === 'Сообщения';
            return (
              <a
                key={link.href}
                href={link.href}
                className={`transition-colors font-medium relative ${
                  isActiveLink(link.href) ? 'text-[#6FE7C8]' : 'text-[#3F7F6E] hover:text-foreground'
                }`}
              >
                {link.label}
                {isAuthenticated && isMessages && hasUnread && (
                  <span
                    aria-label="Есть новые сообщения"
                    className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-[#6FE7C8]"
                  />
                )}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <a href="#/me" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#6FE7C8]" />
                  <span className="font-medium">{user?.profile?.name}</span>
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4 mr-2" />
                Выход
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <a href="#/login">Войти</a>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <a href="#/register">Зарегистрироваться</a>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#6FE7C8] bg-background">
          <div className="px-4 py-3 space-y-1">
            {(isAuthenticated ? PRIVATE_LINKS : PUBLIC_LINKS).map((link) => {
              const isMessages = link.label === 'Сообщения';
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                    isActiveLink(link.href)
                      ? 'bg-[#EFFFF8] text-[#6FE7C8]'
                      : 'text-[#3F7F6E] hover:bg-[#EFFFF8] hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    {link.label}
                    {isAuthenticated && isMessages && hasUnread && (
                      <span aria-hidden="true" className="ml-2 h-2 w-2 rounded-full bg-[#6FE7C8]" />
                    )}
                  </span>
                </a>
              );
            })}
            <div className="pt-3 space-y-2 border-t border-[#6FE7C8]/20">
              {isAuthenticated ? (
                <>
                  <a
                    href="#/me"
                    className="px-3 py-2 text-sm font-medium text-[#3F7F6E] flex items-center gap-2 hover:bg-[#EFFFF8] rounded-md"
                  >
                    <User className="h-4 w-4 text-[#6FE7C8]" />
                    {user?.profile?.name}
                  </a>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    Выход
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="#/login"
                    className="block px-3 py-2 rounded-md text-sm font-medium text-[#3F7F6E] hover:bg-[#EFFFF8] hover:text-foreground"
                  >
                    Войти
                  </a>
                  <a
                    href="#/register"
                    className="block px-3 py-2 rounded-md text-sm font-medium bg-[#6FE7C8] text-white hover:bg-[#5DD6B7]"
                  >
                    Зарегистрироваться
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
