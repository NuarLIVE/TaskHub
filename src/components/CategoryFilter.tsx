import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Subcategory {
  name: string;
  slug: string;
  image: string;
}

interface Category {
  title: string;
  subcategories: Subcategory[];
}

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  triggerLabel?: string;
}

const allCategories: Category[] = [
  {
    title: 'Архитектура',
    subcategories: [
      { name: 'Чертежи', slug: 'blueprints', image: 'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg' },
      { name: '3D-макеты', slug: '3d-models', image: 'https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg' },
      { name: 'Архвизуализация', slug: 'archviz', image: 'https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg' }
    ]
  },
  {
    title: 'Бизнес',
    subcategories: [
      { name: 'Создание презентаций', slug: 'business-presentations', image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg' },
      { name: 'Консультации', slug: 'consulting', image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg' },
      { name: 'Финансовая аналитика', slug: 'financial-analytics', image: 'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg' },
      { name: 'Бизнес-планы', slug: 'business-plans', image: 'https://images.pexels.com/photos/7413915/pexels-photo-7413915.jpeg' },
      { name: 'Маркетплейсы', slug: 'marketplaces', image: 'https://images.pexels.com/photos/3907507/pexels-photo-3907507.jpeg' },
      { name: 'CRM сопровождение', slug: 'crm-support', image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg' }
    ]
  },
  {
    title: 'Видео и Аудио',
    subcategories: [
      { name: 'Монтаж', slug: 'video-editing', image: 'https://images.pexels.com/photos/5081918/pexels-photo-5081918.jpeg' },
      { name: 'Озвучка', slug: 'voiceover', image: 'https://images.pexels.com/photos/7087833/pexels-photo-7087833.jpeg' },
      { name: 'Музыка', slug: 'music', image: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg' },
      { name: 'VFX', slug: 'vfx', image: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg' },
      { name: 'Саунд-дизайн', slug: 'sound-design', image: 'https://images.pexels.com/photos/2114016/pexels-photo-2114016.jpeg' },
      { name: 'Colour grading', slug: 'colour-grading', image: 'https://images.pexels.com/photos/6739932/pexels-photo-6739932.jpeg' }
    ]
  },
  {
    title: 'Дизайн',
    subcategories: [
      { name: 'Лого', slug: 'logo', image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg' },
      { name: 'UX/UI', slug: 'ux-ui', image: 'https://images.pexels.com/photos/326514/pexels-photo-326514.jpeg' },
      { name: 'Баннеры', slug: 'banners', image: 'https://images.pexels.com/photos/3727464/pexels-photo-3727464.jpeg' },
      { name: 'Веб-дизайн', slug: 'web-design', image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg' },
      { name: '3D', slug: '3d', image: 'https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg' },
      { name: 'Иллюстрации', slug: 'illustrations', image: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg' },
      { name: 'Motion (анимация)', slug: 'motion', image: 'https://images.pexels.com/photos/6774436/pexels-photo-6774436.jpeg' },
      { name: 'Презентации', slug: 'presentations', image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg' },
      { name: 'Фирменный стиль', slug: 'branding', image: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg' }
    ]
  },
  {
    title: 'eCommerce',
    subcategories: [
      { name: 'Shopify', slug: 'shopify', image: 'https://images.pexels.com/photos/3769747/pexels-photo-3769747.jpeg' },
      { name: 'WooCommerce', slug: 'woocommerce', image: 'https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg' },
      { name: 'Продвижение товаров', slug: 'product-promotion', image: 'https://images.pexels.com/photos/3962285/pexels-photo-3962285.jpeg' },
      { name: 'Маркетплейс-лендинги', slug: 'marketplace-landings', image: 'https://images.pexels.com/photos/3867761/pexels-photo-3867761.jpeg' }
    ]
  },
  {
    title: 'HR и управление',
    subcategories: [
      { name: 'Найм персонала', slug: 'recruitment', image: 'https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg' },
      { name: 'Создание резюме', slug: 'resume-writing', image: 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg' },
      { name: 'Карьерные консультации', slug: 'career-consulting', image: 'https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg' }
    ]
  },
  {
    title: 'IT-поддержка',
    subcategories: [
      { name: 'Настройка серверов', slug: 'server-setup', image: 'https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg' },
      { name: 'Хостинг', slug: 'hosting', image: 'https://images.pexels.com/photos/2881229/pexels-photo-2881229.jpeg' },
      { name: 'Поддержка сайтов', slug: 'website-support', image: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg' },
      { name: 'Настройка сетей', slug: 'network-setup', image: 'https://images.pexels.com/photos/2881232/pexels-photo-2881232.jpeg' },
      { name: 'Установка CMS', slug: 'cms-installation', image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg' },
      { name: 'Решение техпроблем', slug: 'tech-support', image: 'https://images.pexels.com/photos/5483077/pexels-photo-5483077.jpeg' }
    ]
  },
  {
    title: 'Инженерия',
    subcategories: [
      { name: 'Прототипирование', slug: 'prototyping', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg' },
      { name: 'Электроника', slug: 'electronics', image: 'https://images.pexels.com/photos/163100/circuit-circuit-board-resistor-computer-163100.jpeg' },
      { name: 'Arduino/IoT', slug: 'arduino-iot', image: 'https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg' }
    ]
  },
  {
    title: 'Жизненные задачи (Lifestyle)',
    subcategories: [
      { name: 'Личные советы', slug: 'personal-advice', image: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg' },
      { name: 'Фото-обработка', slug: 'photo-editing', image: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg' },
      { name: 'Помощь с документами', slug: 'document-help', image: 'https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg' },
      { name: 'Тестирование продуктов', slug: 'product-testing', image: 'https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg' },
      { name: 'Психология/консультирование', slug: 'psychology', image: 'https://images.pexels.com/photos/3807733/pexels-photo-3807733.jpeg' },
      { name: 'Виртуальные ассистенты', slug: 'virtual-assistants', image: 'https://images.pexels.com/photos/4226140/pexels-photo-4226140.jpeg' }
    ]
  },
  {
    title: 'Маркетинг',
    subcategories: [
      { name: 'Таргет', slug: 'targeting', image: 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg' },
      { name: 'SEO', slug: 'seo', image: 'https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg' },
      { name: 'Контекстная реклама', slug: 'context-ads', image: 'https://images.pexels.com/photos/6476587/pexels-photo-6476587.jpeg' },
      { name: 'Email маркетинг', slug: 'email-marketing', image: 'https://images.pexels.com/photos/5797903/pexels-photo-5797903.jpeg' },
      { name: 'Продвижение соцсетей', slug: 'smm', image: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg' },
      { name: 'Аналитика/веб-аналитика', slug: 'analytics', image: 'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg' }
    ]
  },
  {
    title: 'NFT / Web3',
    subcategories: [
      { name: 'NFT-арт', slug: 'nft-art', image: 'https://images.pexels.com/photos/8369526/pexels-photo-8369526.jpeg' },
      { name: 'Смарт-контракты', slug: 'smart-contracts', image: 'https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg' },
      { name: 'Токен-экономика', slug: 'tokenomics', image: 'https://images.pexels.com/photos/7567528/pexels-photo-7567528.jpeg' }
    ]
  },
  {
    title: 'Образование и репетиторство',
    subcategories: [
      { name: 'Репетиторы', slug: 'tutors', image: 'https://images.pexels.com/photos/8500285/pexels-photo-8500285.jpeg' },
      { name: 'Курсы', slug: 'courses', image: 'https://images.pexels.com/photos/6146929/pexels-photo-6146929.jpeg' },
      { name: 'Домашние задания', slug: 'homework-help', image: 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg' },
      { name: 'Подготовка к экзаменам', slug: 'exam-prep', image: 'https://images.pexels.com/photos/6238050/pexels-photo-6238050.jpeg' }
    ]
  },
  {
    title: 'Разработка',
    subcategories: [
      { name: 'Веб-разработка', slug: 'web-dev', image: 'https://images.pexels.com/photos/276452/pexels-photo-276452.jpeg' },
      { name: 'Мобильная разработка', slug: 'mobile-dev', image: 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg' },
      { name: 'GameDev', slug: 'gamedev', image: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg' },
      { name: 'Backend', slug: 'backend', image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg' },
      { name: 'Full-stack', slug: 'fullstack', image: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg' },
      { name: 'AI/ML', slug: 'ai-ml', image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg' },
      { name: 'ChatGPT/AI-боты', slug: 'ai-bots', image: 'https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg' },
      { name: 'Десктоп-ПО', slug: 'desktop', image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg' },
      { name: 'DevOps', slug: 'devops', image: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg' },
      { name: 'Скрипты/автоматизации', slug: 'automation', image: 'https://images.pexels.com/photos/270404/pexels-photo-270404.jpeg' }
    ]
  },
  {
    title: 'Соцсети',
    subcategories: [
      { name: 'Ведение Instagram/TikTok', slug: 'social-management', image: 'https://images.pexels.com/photos/4065891/pexels-photo-4065891.jpeg' },
      { name: 'Монтаж Reels', slug: 'reels-editing', image: 'https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg' },
      { name: 'Стратегии контента', slug: 'content-strategy', image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg' },
      { name: 'Создание постов', slug: 'post-creation', image: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg' },
      { name: 'Оформление профиля', slug: 'profile-design', image: 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg' }
    ]
  },
  {
    title: 'Тексты и переводы',
    subcategories: [
      { name: 'Копирайт', slug: 'copywriting', image: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg' },
      { name: 'Рерайт', slug: 'rewriting', image: 'https://images.pexels.com/photos/301703/pexels-photo-301703.jpeg' },
      { name: 'Переводы', slug: 'translation', image: 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg' },
      { name: 'Редактура', slug: 'editing', image: 'https://images.pexels.com/photos/159510/pen-writing-notes-studying-159510.jpeg' },
      { name: 'Технические тексты', slug: 'technical-writing', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg' },
      { name: 'Сценарии', slug: 'scripts', image: 'https://images.pexels.com/photos/7235865/pexels-photo-7235865.jpeg' },
      { name: 'Описания товаров', slug: 'product-descriptions', image: 'https://images.pexels.com/photos/4067755/pexels-photo-4067755.jpeg' }
    ]
  }
];

interface SubcategoryCarouselProps {
  subcategories: Subcategory[];
  selectedCategories: string[];
  onToggle: (name: string) => void;
}

function SubcategoryCarousel({ subcategories, selectedCategories, onToggle }: SubcategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const updateArrowVisibility = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateArrowVisibility();
    const handleScroll = () => updateArrowVisibility();
    scrollRef.current?.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateArrowVisibility);
    return () => {
      scrollRef.current?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateArrowVisibility);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const gap = 12;
      const containerWidth = scrollRef.current.clientWidth;
      const itemWidth = Math.floor((containerWidth - gap * 3) / 4);
      const scrollAmount = itemWidth * 3 + gap * 3;

      const currentScroll = scrollRef.current.scrollLeft;
      let targetScroll: number;

      if (direction === 'right') {
        targetScroll = currentScroll + scrollAmount;
      } else {
        targetScroll = currentScroll - scrollAmount;
      }

      scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      {showLeftArrow && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 p-0 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {subcategories.map((sub) => {
          const isSelected = selectedCategories.includes(sub.name);
          return (
            <div
              key={sub.slug}
              onClick={() => onToggle(sub.name)}
              className="flex-shrink-0 snap-start cursor-pointer"
              style={{ width: 'calc((100% - 36px) / 4)' }}
            >
              <div className={`rounded-xl overflow-hidden border-2 transition-all duration-300 h-full ${
                isSelected ? 'border-[#3F7F6E] shadow-lg' : 'border-gray-200 hover:border-[#3F7F6E] hover:shadow-md'
              }`}>
                <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                  <img
                    src={`${sub.image}?auto=compress&cs=tinysrgb&w=400`}
                    alt={sub.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#3F7F6E] bg-opacity-20 flex items-center justify-center">
                      <div className="w-10 h-10 bg-[#3F7F6E] rounded-full flex items-center justify-center">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className={`text-sm font-medium text-center ${isSelected ? 'text-[#3F7F6E]' : ''}`}>
                    {sub.name}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showRightArrow && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 p-0 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

export default function CategoryFilter({ selectedCategories, onCategoriesChange, triggerLabel = 'Категории' }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<string[]>(selectedCategories);

  useEffect(() => {
    setLocalSelected(selectedCategories);
  }, [selectedCategories]);

  const handleToggle = (categoryName: string) => {
    setLocalSelected(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const handleApply = () => {
    onCategoriesChange(localSelected);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalSelected([]);
  };

  const selectedCount = localSelected.length;

  return (
    <>
      <Button
        variant="outline"
        className="h-10 relative"
        onClick={() => setOpen(true)}
      >
        <Filter className="h-4 w-4 mr-2" />
        {triggerLabel}
        {selectedCount > 0 && (
          <span className="ml-2 bg-[#3F7F6E] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {selectedCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Выберите категории</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {allCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-lg font-semibold mb-3">{category.title}</h3>
                <SubcategoryCarousel
                  subcategories={category.subcategories}
                  selectedCategories={localSelected}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleReset}>
              Сбросить
            </Button>
            <Button onClick={handleApply} className="bg-[#3F7F6E] hover:bg-[#2F6F5E]">
              Применить {selectedCount > 0 && `(${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
