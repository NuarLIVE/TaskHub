import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Code, Brush, Megaphone, FileText, Video, Briefcase, Share2, Server, GraduationCap, Heart, ShoppingCart, Coins, Building, Cog, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Subcategory {
  name: string;
  slug: string;
}

interface Category {
  icon: JSX.Element;
  title: string;
  color: string;
  subcategories: Subcategory[];
}

const categories: Category[] = [
  {
    icon: <Code className="h-6 w-6" />,
    title: 'Разработка',
    color: 'bg-blue-50',
    subcategories: [
      { name: 'Веб-разработка', slug: 'web-dev' },
      { name: 'Мобильная разработка', slug: 'mobile-dev' },
      { name: 'GameDev', slug: 'gamedev' },
      { name: 'Backend', slug: 'backend' },
      { name: 'Full-stack', slug: 'fullstack' },
      { name: 'AI/ML', slug: 'ai-ml' },
      { name: 'ChatGPT/AI-боты', slug: 'ai-bots' },
      { name: 'Десктоп-ПО', slug: 'desktop' },
      { name: 'DevOps', slug: 'devops' },
      { name: 'Скрипты/автоматизации', slug: 'automation' }
    ]
  },
  {
    icon: <Brush className="h-6 w-6" />,
    title: 'Дизайн',
    color: 'bg-pink-50',
    subcategories: [
      { name: 'Лого', slug: 'logo' },
      { name: 'UX/UI', slug: 'ux-ui' },
      { name: 'Баннеры', slug: 'banners' },
      { name: 'Веб-дизайн', slug: 'web-design' },
      { name: '3D', slug: '3d' },
      { name: 'Иллюстрации', slug: 'illustrations' },
      { name: 'Motion (анимация)', slug: 'motion' },
      { name: 'Презентации', slug: 'presentations' },
      { name: 'Фирменный стиль', slug: 'branding' }
    ]
  },
  {
    icon: <Megaphone className="h-6 w-6" />,
    title: 'Маркетинг',
    color: 'bg-green-50',
    subcategories: [
      { name: 'Таргет', slug: 'targeting' },
      { name: 'SEO', slug: 'seo' },
      { name: 'Контекстная реклама', slug: 'context-ads' },
      { name: 'Email маркетинг', slug: 'email-marketing' },
      { name: 'Продвижение соцсетей', slug: 'smm' },
      { name: 'Аналитика/веб-аналитика', slug: 'analytics' }
    ]
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Тексты и переводы',
    color: 'bg-yellow-50',
    subcategories: [
      { name: 'Копирайт', slug: 'copywriting' },
      { name: 'Рерайт', slug: 'rewriting' },
      { name: 'Переводы', slug: 'translation' },
      { name: 'Редактура', slug: 'editing' },
      { name: 'Технические тексты', slug: 'technical-writing' },
      { name: 'Сценарии', slug: 'scripts' },
      { name: 'Описания товаров', slug: 'product-descriptions' }
    ]
  },
  {
    icon: <Video className="h-6 w-6" />,
    title: 'Видео и Аудио',
    color: 'bg-purple-50',
    subcategories: [
      { name: 'Монтаж', slug: 'video-editing' },
      { name: 'Озвучка', slug: 'voiceover' },
      { name: 'Музыка', slug: 'music' },
      { name: 'VFX', slug: 'vfx' },
      { name: 'Саунд-дизайн', slug: 'sound-design' },
      { name: 'Colour grading', slug: 'colour-grading' }
    ]
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: 'Бизнес',
    color: 'bg-indigo-50',
    subcategories: [
      { name: 'Создание презентаций', slug: 'business-presentations' },
      { name: 'Консультации', slug: 'consulting' },
      { name: 'Финансовая аналитика', slug: 'financial-analytics' },
      { name: 'Бизнес-планы', slug: 'business-plans' },
      { name: 'Маркетплейсы', slug: 'marketplaces' },
      { name: 'CRM сопровождение', slug: 'crm-support' }
    ]
  },
  {
    icon: <Share2 className="h-6 w-6" />,
    title: 'Соцсети',
    color: 'bg-red-50',
    subcategories: [
      { name: 'Ведение Instagram/TikTok', slug: 'social-management' },
      { name: 'Монтаж Reels', slug: 'reels-editing' },
      { name: 'Стратегии контента', slug: 'content-strategy' },
      { name: 'Создание постов', slug: 'post-creation' },
      { name: 'Оформление профиля', slug: 'profile-design' }
    ]
  },
  {
    icon: <Server className="h-6 w-6" />,
    title: 'IT-поддержка',
    color: 'bg-cyan-50',
    subcategories: [
      { name: 'Настройка серверов', slug: 'server-setup' },
      { name: 'Хостинг', slug: 'hosting' },
      { name: 'Поддержка сайтов', slug: 'website-support' },
      { name: 'Настройка сетей', slug: 'network-setup' },
      { name: 'Установка CMS', slug: 'cms-installation' },
      { name: 'Решение техпроблем', slug: 'tech-support' }
    ]
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: 'Образование и репетиторство',
    color: 'bg-orange-50',
    subcategories: [
      { name: 'Репетиторы', slug: 'tutors' },
      { name: 'Курсы', slug: 'courses' },
      { name: 'Домашние задания', slug: 'homework-help' },
      { name: 'Подготовка к экзаменам', slug: 'exam-prep' }
    ]
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: 'Жизненные задачи (Lifestyle)',
    color: 'bg-rose-50',
    subcategories: [
      { name: 'Личные советы', slug: 'personal-advice' },
      { name: 'Фото-обработка', slug: 'photo-editing' },
      { name: 'Помощь с документами', slug: 'document-help' },
      { name: 'Тестирование продуктов', slug: 'product-testing' },
      { name: 'Психология/консультирование', slug: 'psychology' },
      { name: 'Виртуальные ассистенты', slug: 'virtual-assistants' }
    ]
  },
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: 'eCommerce',
    color: 'bg-teal-50',
    subcategories: [
      { name: 'Shopify', slug: 'shopify' },
      { name: 'WooCommerce', slug: 'woocommerce' },
      { name: 'Продвижение товаров', slug: 'product-promotion' },
      { name: 'Маркетплейс-лендинги', slug: 'marketplace-landings' }
    ]
  },
  {
    icon: <Coins className="h-6 w-6" />,
    title: 'NFT / Web3',
    color: 'bg-violet-50',
    subcategories: [
      { name: 'NFT-арт', slug: 'nft-art' },
      { name: 'Смарт-контракты', slug: 'smart-contracts' },
      { name: 'Токен-экономика', slug: 'tokenomics' }
    ]
  },
  {
    icon: <Building className="h-6 w-6" />,
    title: 'Архитектура',
    color: 'bg-slate-50',
    subcategories: [
      { name: 'Чертежи', slug: 'blueprints' },
      { name: '3D-макеты', slug: '3d-models' },
      { name: 'Архвизуализация', slug: 'archviz' }
    ]
  },
  {
    icon: <Cog className="h-6 w-6" />,
    title: 'Инженерия',
    color: 'bg-zinc-50',
    subcategories: [
      { name: 'Прототипирование', slug: 'prototyping' },
      { name: 'Электроника', slug: 'electronics' },
      { name: 'Arduino/IoT', slug: 'arduino-iot' }
    ]
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'HR и управление',
    color: 'bg-amber-50',
    subcategories: [
      { name: 'Найм персонала', slug: 'recruitment' },
      { name: 'Создание резюме', slug: 'resume-writing' },
      { name: 'Карьерные консультации', slug: 'career-consulting' }
    ]
  }
];

function SubcategoryCarousel({ subcategories }: { subcategories: Subcategory[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="sm"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {subcategories.map((sub) => (
          <a
            key={sub.slug}
            href={`#/market?category=${encodeURIComponent(sub.name)}`}
            className="flex-shrink-0"
          >
            <div className="px-3 py-1.5 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm whitespace-nowrap cursor-pointer">
              {sub.name}
            </div>
          </a>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Все категории</h1>
          <p className="text-lg text-[#3F7F6E] mb-10">Найдите специалистов в любой области</p>

          <div className="grid grid-cols-1 gap-6">
            {categories.map((category, idx) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${category.color}`}>
                        {category.icon}
                      </div>
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SubcategoryCarousel subcategories={category.subcategories} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </main>
  );
}
