import React from 'react';
import { Sparkles } from 'lucide-react';

const FOOTER_LINKS = {
  platform: [
    { href: '#/orders', label: 'Заказы' },
    { href: '#/tasks', label: 'Объявления' },
    { href: '#/talents', label: 'Исполнители' },
    { href: '#/proposals', label: 'Отклики' },
    { href: '#/proposals/create', label: 'Создать отклик' }
  ],
  account: [
    { href: '#/me', label: 'Профиль' },
    { href: '#/me/edit', label: 'Редактировать профиль' },
    { href: '#/wallet', label: 'Кошелёк' },
    { href: '#/messages', label: 'Сообщения' },
    { href: '#/notifications', label: 'Уведомления' },
    { href: '#/saved', label: 'Сохранённые' },
    { href: '#/reviews', label: 'Отзывы' }
  ],
  create: [
    { href: '#/orders/create', label: 'Создать заказ' },
    { href: '#/tasks/create', label: 'Создать объявление' },
    { href: '#/me/portfolio', label: 'Портфолио' },
    { href: '#/me/portfolio/add', label: 'Добавить в портфолио' },
    { href: '#/me/orders', label: 'Мои заказы' },
    { href: '#/me/deals', label: 'Мои сделки' },
    { href: '#/deal/open', label: 'Открыть сделку' }
  ],
  support: [
    { href: '#/faq', label: 'FAQ' },
    { href: '#/contact', label: 'Контакты' },
    { href: '#/terms', label: 'Условия использования' },
    { href: '#/privacy', label: 'Конфиденциальность' },
    { href: '#/payments', label: 'Политика платежей' },
    { href: '#/disputes', label: 'Споры' },
    { href: '#/404', label: 'Страница 404' }
  ],
  settings: [
    { href: '#/settings/profile', label: 'Настройки профиля' },
    { href: '#/settings/security', label: 'Безопасность' },
    { href: '#/settings/notifications', label: 'Настройки уведомлений' },
    { href: '#/settings/payments', label: 'Платежи' }
  ]
};

export default function Footer() {
  return (
    <footer className="border-t bg-[#EFFFF8]/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground mb-4">Платформа</h3>
            <ul className="space-y-2 text-sm text-[#3F7F6E]">
              {FOOTER_LINKS.platform.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground transition">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Аккаунт</h3>
            <ul className="space-y-2 text-sm text-[#3F7F6E]">
              {FOOTER_LINKS.account.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground transition">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Создать</h3>
            <ul className="space-y-2 text-sm text-[#3F7F6E]">
              {FOOTER_LINKS.create.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground transition">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Поддержка</h3>
            <ul className="space-y-2 text-sm text-[#3F7F6E]">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground transition">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Настройки</h3>
            <ul className="space-y-2 text-sm text-[#3F7F6E]">
              {FOOTER_LINKS.settings.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground transition">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#6FE7C8]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#3F7F6E]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#6FE7C8]" />
            <span>TaskHub © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#/terms" className="hover:text-foreground transition">Условия</a>
            <a href="#/privacy" className="hover:text-foreground transition">Конфиденциальность</a>
            <a href="#/contact" className="hover:text-foreground transition">Контакты</a>
            <a href="#/admin/login" className="hover:text-foreground transition opacity-50 text-xs">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
