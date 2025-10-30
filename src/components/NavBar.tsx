import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[#6FE7C8] bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5" />
          <a href="#/" className="font-bold tracking-tight">FreelanceHub</a>
          <Badge className="ml-2" variant="secondary">beta</Badge>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-[#3F7F6E]">
          <a href="#/" className="hover:text-foreground transition">Главная</a>
          <a href="#/market" className="hover:text-foreground transition">Биржа</a>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><a href="#/login">Войти</a></Button>
          <Button asChild className="hidden sm:inline-flex"><a href="#/register">Зарегистрироваться</a></Button>
          <Button asChild variant="secondary" className="hidden lg:inline-flex"><a href="#/order/new"><Plus className="h-4 w-4 mr-1" />Заказ</a></Button>
          <Button asChild variant="secondary" className="hidden lg:inline-flex"><a href="#/task/new"><Plus className="h-4 w-4 mr-1" />Task</a></Button>
          <Button asChild variant="ghost" className="inline-flex"><a href="#/profile">Профиль</a></Button>
        </div>
      </div>
    </nav>
  );
}
