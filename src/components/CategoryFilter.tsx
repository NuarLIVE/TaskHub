import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    title: '3D и Анимация',
    subcategories: [
      { name: '3D моделирование', slug: '3d-modeling', image: 'https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg' },
      { name: '3D-макеты', slug: '3d-models', image: 'https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg' },
      { name: 'Анимация персонажей', slug: 'character-animation', image: 'https://images.pexels.com/photos/6774436/pexels-photo-6774436.jpeg' },
      { name: 'Motion дизайн', slug: 'motion-design', image: 'https://images.pexels.com/photos/6774436/pexels-photo-6774436.jpeg' }
    ]
  },
  {
    title: 'Архитектура',
    subcategories: [
      { name: 'Чертежи', slug: 'blueprints', image: 'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg' },
      { name: 'Архвизуализация', slug: 'archviz', image: 'https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg' },
      { name: 'Проектирование интерьеров', slug: 'interior-design', image: 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg' }
    ]
  },
  {
    title: 'Аудио',
    subcategories: [
      { name: 'Озвучка', slug: 'voiceover', image: 'https://images.pexels.com/photos/7087833/pexels-photo-7087833.jpeg' },
      { name: 'Создание музыки', slug: 'music-creation', image: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg' },
      { name: 'Саунд-дизайн', slug: 'sound-design', image: 'https://images.pexels.com/photos/2114016/pexels-photo-2114016.jpeg' },
      { name: 'Аудио монтаж', slug: 'audio-editing', image: 'https://images.pexels.com/photos/3784221/pexels-photo-3784221.jpeg' },
      { name: 'Подкасты', slug: 'podcasts', image: 'https://images.pexels.com/photos/6953862/pexels-photo-6953862.jpeg' }
    ]
  },
  {
    title: 'Видео',
    subcategories: [
      { name: 'Монтаж видео', slug: 'video-editing', image: 'https://images.pexels.com/photos/5081918/pexels-photo-5081918.jpeg' },
      { name: 'Цветокоррекция', slug: 'color-grading', image: 'https://images.pexels.com/photos/6739932/pexels-photo-6739932.jpeg' },
      { name: 'VFX эффекты', slug: 'vfx', image: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg' },
      { name: 'Видеосъемка', slug: 'videography', image: 'https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg' },
      { name: 'Монтаж Reels/Shorts', slug: 'reels-editing', image: 'https://images.pexels.com/photos/5082579/pexels-photo-5082579.jpeg' }
    ]
  },
  {
    title: 'Дизайн',
    subcategories: [
      { name: 'Логотипы', slug: 'logo', image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg' },
      { name: 'UX/UI дизайн', slug: 'ux-ui', image: 'https://images.pexels.com/photos/326514/pexels-photo-326514.jpeg' },
      { name: 'Веб-дизайн', slug: 'web-design', image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg' },
      { name: 'Баннеры и реклама', slug: 'banners', image: 'https://images.pexels.com/photos/3727464/pexels-photo-3727464.jpeg' },
      { name: 'Иллюстрации', slug: 'illustrations', image: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg' },
      { name: 'Фирменный стиль', slug: 'branding', image: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg' },
      { name: 'Дизайн презентаций', slug: 'presentation-design', image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg' },
      { name: 'Графический дизайн', slug: 'graphic-design', image: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg' }
    ]
  },
  {
    title: 'Консультации',
    subcategories: [
      { name: 'Бизнес-консультации', slug: 'business-consulting', image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg' },
      { name: 'Финансовые консультации', slug: 'financial-consulting', image: 'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg' },
      { name: 'Карьерные консультации', slug: 'career-consulting', image: 'https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg' },
      { name: 'IT-консультации', slug: 'it-consulting', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg' },
      { name: 'Юридические консультации', slug: 'legal-consulting', image: 'https://images.pexels.com/photos/6077447/pexels-photo-6077447.jpeg' }
    ]
  },
  {
    title: 'Копирайтинг',
    subcategories: [
      { name: 'SEO-копирайтинг', slug: 'seo-copywriting', image: 'https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg' },
      { name: 'Продающие тексты', slug: 'sales-copywriting', image: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg' },
      { name: 'Контент для соцсетей', slug: 'social-content', image: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg' },
      { name: 'Статьи и блоги', slug: 'articles-blogs', image: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg' },
      { name: 'Технические тексты', slug: 'technical-writing', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg' },
      { name: 'Рерайтинг', slug: 'rewriting', image: 'https://images.pexels.com/photos/301703/pexels-photo-301703.jpeg' }
    ]
  },
  {
    title: 'Маркетинг',
    subcategories: [
      { name: 'SMM', slug: 'smm', image: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg' },
      { name: 'Таргетированная реклама', slug: 'targeting', image: 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg' },
      { name: 'SEO продвижение', slug: 'seo', image: 'https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg' },
      { name: 'Контекстная реклама', slug: 'context-ads', image: 'https://images.pexels.com/photos/6476587/pexels-photo-6476587.jpeg' },
      { name: 'Email маркетинг', slug: 'email-marketing', image: 'https://images.pexels.com/photos/5797903/pexels-photo-5797903.jpeg' },
      { name: 'Контент-маркетинг', slug: 'content-marketing', image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg' },
      { name: 'Аналитика', slug: 'analytics', image: 'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg' }
    ]
  },
  {
    title: 'Образование',
    subcategories: [
      { name: 'Репетиторство', slug: 'tutoring', image: 'https://images.pexels.com/photos/8500285/pexels-photo-8500285.jpeg' },
      { name: 'Онлайн-курсы', slug: 'online-courses', image: 'https://images.pexels.com/photos/6146929/pexels-photo-6146929.jpeg' },
      { name: 'Помощь с учебой', slug: 'homework-help', image: 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg' },
      { name: 'Языковые уроки', slug: 'language-lessons', image: 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg' }
    ]
  },
  {
    title: 'Переводы',
    subcategories: [
      { name: 'Письменный перевод', slug: 'translation', image: 'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg' },
      { name: 'Технический перевод', slug: 'technical-translation', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg' },
      { name: 'Литературный перевод', slug: 'literary-translation', image: 'https://images.pexels.com/photos/159510/pen-writing-notes-studying-159510.jpeg' },
      { name: 'Локализация', slug: 'localization', image: 'https://images.pexels.com/photos/270637/pexels-photo-270637.jpeg' }
    ]
  },
  {
    title: 'Программирование',
    subcategories: [
      { name: 'Веб-разработка', slug: 'web-dev', image: 'https://images.pexels.com/photos/276452/pexels-photo-276452.jpeg' },
      { name: 'Мобильная разработка', slug: 'mobile-dev', image: 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg' },
      { name: 'Backend разработка', slug: 'backend', image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg' },
      { name: 'Full-stack', slug: 'fullstack', image: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg' },
      { name: 'GameDev', slug: 'gamedev', image: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg' },
      { name: 'AI/ML разработка', slug: 'ai-ml', image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg' },
      { name: 'Десктоп приложения', slug: 'desktop', image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg' },
      { name: 'Боты и автоматизация', slug: 'bots-automation', image: 'https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg' },
      { name: 'DevOps', slug: 'devops', image: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg' }
    ]
  },
  {
    title: 'Фото',
    subcategories: [
      { name: 'Фотосъемка', slug: 'photography', image: 'https://images.pexels.com/photos/1194420/pexels-photo-1194420.jpeg' },
      { name: 'Ретушь фото', slug: 'photo-retouching', image: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg' },
      { name: 'Фотообработка', slug: 'photo-editing', image: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg' },
      { name: 'Предметная съемка', slug: 'product-photography', image: 'https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg' }
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredCategories = allCategories.map(category => ({
    ...category,
    subcategories: category.subcategories.filter(sub =>
      searchQuery === '' ||
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.subcategories.length > 0);

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
        <DialogContent className="max-w-[90vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Выберите категории</DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по категориям и подкатегориям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            {filteredCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-lg font-semibold mb-3">{category.title}</h3>
                <SubcategoryCarousel
                  subcategories={category.subcategories}
                  selectedCategories={localSelected}
                  onToggle={handleToggle}
                />
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Ничего не найдено по запросу "{searchQuery}"
              </div>
            )}
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
