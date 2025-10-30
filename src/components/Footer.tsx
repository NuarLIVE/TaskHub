import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-[#3F7F6E]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> FreelanceHub © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4">
            <a className="hover:text-foreground" href="#/market">Биржа</a>
            <a className="hover:text-foreground" href="#/order/new">Создать заказ</a>
            <a className="hover:text-foreground" href="#/task/new">Создать Task</a>
            <a className="hover:text-foreground" href="#/profile">Профиль</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
