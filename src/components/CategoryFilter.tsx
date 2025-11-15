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
  },
  {
    title: 'Видео и Аудио',
    subcategories: [
      { name: 'Монтаж видео', slug: 'video-editing', image: 'https://images.pexels.com/photos/3945317/pexels-photo-3945317.jpeg' },
      { name: 'Создание музыки', slug: 'music-production', image: 'https://images.pexels.com/photos/744318/pexels-photo-744318.jpeg' },
      { name: 'Озвучка', slug: 'voice-over', image: 'https://images.pexels.com/photos/3784221/pexels-photo-3784221.jpeg' },
      { name: 'Звуковой дизайн', slug: 'sound-design', image: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg' },
      { name: 'Подкасты', slug: 'podcasts', image: 'https://images.pexels.com/photos/6953862/pexels-photo-6953862.jpeg' }
    ]
  },
  {
    title: 'Бизнес',
    subcategories: [
      { name: 'Бизнес-консалтинг', slug: 'business-consulting', image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg' },
      { name: 'Финансовый анализ', slug: 'financial-analysis', image: 'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg' },
      { name: 'HR/подбор персонала', slug: 'hr-recruiting', image: 'https://images.pexels.com/photos/3760069/pexels-photo-3760069.jpeg' },
      { name: 'Юридические услуги', slug: 'legal', image: 'https://images.pexels.com/photos/6077447/pexels-photo-6077447.jpeg' },
      { name: 'Бухгалтерия', slug: 'accounting', image: 'https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg' }
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
