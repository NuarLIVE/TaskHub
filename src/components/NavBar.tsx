import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const NAV_LINKS = [
  { href: '#/orders', label: 'Заказы' },
  { href: '#/tasks', label: 'Объявления' },
  { href: '#/talents', label: 'Исполнители' },
  { href: '#/proposals', label: 'Отклики' },
  { href: '#/messages', label: 'Сообщения' },
  { href: '#/wallet', label: 'Кошелёк' },
  { href: '#/me', label: 'Профиль' }
];

export default function NavBar() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
      setMobileMenuOpen(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`transition-colors font-medium ${
                isActiveLink(link.href)
                  ? 'text-[#6FE7C8]'
                  : 'text-[#3F7F6E] hover:text-foreground'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[#6FE7C8]" />
                <span className="font-medium">{user?.profile?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="hidden sm:inline-flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Выход
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden sm:inline-flex"
              >
                <a href="#/login">Войти</a>
              </Button>
              <Button
                asChild
                className="hidden sm:inline-flex"
              >
                <a href="#/register">Зарегистрироваться</a>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#6FE7C8] bg-background">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActiveLink(link.href)
                    ? 'bg-[#EFFFF8] text-[#6FE7C8]'
                    : 'text-[#3F7F6E] hover:bg-[#EFFFF8] hover:text-foreground'
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 space-y-2 border-t border-[#6FE7C8]/20">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm font-medium text-[#3F7F6E] flex items-center gap-2">
                    <User className="h-4 w-4 text-[#6FE7C8]" />
                    {user?.profile?.name}
                  </div>
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
