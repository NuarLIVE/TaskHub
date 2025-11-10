import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, MessageSquare, MapPin, AtSign, Link as LinkIcon, Clock, Image as ImageIcon, ExternalLink, Loader2, Eye, Calendar, Upload, X, Award, TrendingUp, CheckCircle, Briefcase, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

const supabase = getSupabase();

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useRegion();
  const [tab, setTab] = useState('portfolio');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [helpfulVotes, setHelpfulVotes] = useState<Set<number>>(new Set());
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewType, setPreviewType] = useState<'order' | 'task' | 'portfolio'>('order');
  const [portfolioPreviewOpen, setPortfolioPreviewOpen] = useState(false);
  const [selectedPortfolioProject, setSelectedPortfolioProject] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(() => {
    const raw = typeof window !== 'undefined' && localStorage.getItem('fh_profile');
    return raw ? JSON.parse(raw) : {
      name: 'Mickey',
      headline: 'Web/Unity',
      role: 'Full‑stack / Game Dev',
      about: 'Full‑stack разработчик и Unity‑инженер. Люблю аккуратные интерфейсы и предсказуемый неткод.',
      bio: 'Занимаюсь разработкой уже более 5 лет. Специализируюсь на создании веб-приложений и игр. Работал над множеством проектов от стартапов до крупных корпораций. Всегда открыт к новым вызовам и интересным задачам. Предпочитаю чистый код и современные технологии.',
      skills: ['React', 'Tailwind', 'Node', 'PostgreSQL', 'Unity', 'Photon'],
      rateMin: 20,
      rateMax: 35,
      currency: 'USD',
      location: 'Есик / Алматы',
      contactEmail: 'you@example.com',
      contactTelegram: '@mickey',
      avatar: 'https://i.pravatar.cc/120?img=49'
    };
  });

  useEffect(() => {
    if (user) {
      if (tab === 'market') {
        loadUserMarketItems();
      } else if (tab === 'portfolio') {
        loadPortfolioProjects();
      }
    }
  }, [user, tab]);

  const loadUserMarketItems = async () => {
    if (!user) return;

    setLoadingMarket(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserOrders(ordersData || []);
      setUserTasks(tasksData || []);
    } finally {
      setLoadingMarket(false);
    }
  };

  const loadPortfolioProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setPortfolioProjects(data || []);
  };

  const saveProfile = (p: any) => {
    setProfile(p);
    localStorage.setItem('fh_profile', JSON.stringify(p));
  };

  const openPreview = (item: any, type: 'order' | 'task' | 'portfolio') => {
    setPreviewItem(item);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const handlePortfolioProjectClick = (project: any) => {
    setSelectedPortfolioProject(project);
    setPortfolioPreviewOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const bioText = (form.querySelector('textarea[name="bio"]') as HTMLTextAreaElement)?.value || '';

    let uploadedAvatarUrl = profile.avatar;
    if (avatarFile) {
      try {
        const fileName = `avatar-${user?.id}-${Date.now()}.${avatarFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName);

        uploadedAvatarUrl = publicUrl;
        setAvatarFile(null);
        setAvatarPreview('');
      } catch (error: any) {
        console.error('Avatar upload error:', error);
        alert(`Ошибка при загрузке аватара: ${error.message}`);
        return;
      }
    }

    const next = {
      name: String(fd.get('name') || ''),
      headline: String(fd.get('headline') || ''),
      role: String(fd.get('role') || ''),
      about: String(fd.get('about') || ''),
      bio: bioText,
      skills: String(fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean),
      rateMin: Number(fd.get('rateMin') || 0),
      rateMax: Number(fd.get('rateMax') || 0),
      currency: String(fd.get('currency') || 'USD'),
      location: String(fd.get('location') || ''),
      contactEmail: String(fd.get('contactEmail') || ''),
      contactTelegram: String(fd.get('contactTelegram') || ''),
      avatar: uploadedAvatarUrl
    };
    saveProfile(next);
    alert('Профиль обновлён');
    setTab('portfolio');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="profile"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white"
      >
        {/* Hero Section with Cover */}
        <div className="relative bg-gradient-to-br from-[#6FE7C8] via-[#5DD6B7] to-[#3F7F6E] h-64">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-10"></div>
        </div>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Main Profile Card */}
              <Card className="border-2 shadow-xl bg-white">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="relative inline-block mb-4">
                      <img
                        src={profile.avatar}
                        alt="avatar"
                        className="h-28 w-28 rounded-2xl object-cover ring-4 ring-white shadow-lg mx-auto"
                      />
                      <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
                    <p className="text-lg text-[#6FE7C8] font-medium mb-2">{profile.headline}</p>
                    <p className="text-sm text-gray-600 mb-3">{profile.role}</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-gradient-to-br from-[#EFFFF8] to-gray-50 rounded-xl">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="font-bold text-lg">4.9</span>
                      </div>
                      <div className="text-xs text-gray-600">{t.profile.rating}</div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <div className="font-bold text-lg text-[#6FE7C8] mb-1">27</div>
                      <div className="text-xs text-gray-600">{t.profile.completedOrders}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-emerald-600 mb-1">98%</div>
                      <div className="text-xs text-gray-600">Success Rate</div>
                    </div>
                  </div>

                  {/* Rate */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-[#6FE7C8]/10 to-transparent rounded-xl border border-[#6FE7C8]/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Hourly Rate</span>
                      <DollarSign className="h-4 w-4 text-[#6FE7C8]" />
                    </div>
                    <div className="text-2xl font-bold text-[#3F7F6E]">
                      ${profile.rateMin}–${profile.rateMax}
                      <span className="text-sm font-normal text-gray-500 ml-1">/hr</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 mb-6">
                    <Button className="w-full h-11 bg-gradient-to-r from-[#6FE7C8] to-[#5DD6B7] hover:from-[#5DD6B7] hover:to-[#4CC5A6] shadow-md">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="w-full h-11">
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Favorites
                    </Button>
                  </div>

                  {/* Quick Links */}
                  <div className="flex items-center justify-between text-sm border-t pt-4">
                    <button className="text-[#6FE7C8] hover:text-[#5DD6B7] font-medium flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      Share
                    </button>
                    <button
                      className="text-[#6FE7C8] hover:text-[#5DD6B7] font-medium"
                      onClick={() => setTab('edit')}
                    >
                      {t.profile.editProfile}
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#6FE7C8]" />
                    {t.profile.skills}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="px-3 py-1 bg-gradient-to-r from-[#EFFFF8] to-[#6FE7C8]/10 border border-[#6FE7C8]/20 text-[#3F7F6E] font-medium"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contact Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-9 w-9 rounded-lg bg-[#EFFFF8] flex items-center justify-center flex-shrink-0">
                      <AtSign className="h-4 w-4 text-[#3F7F6E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">{t.auth.email}</div>
                      <div className="font-medium truncate">{profile.contactEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-9 w-9 rounded-lg bg-[#EFFFF8] flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-[#3F7F6E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">Telegram</div>
                      <div className="font-medium">{profile.contactTelegram}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Tabs */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'portfolio', label: t.profile.portfolio, icon: Briefcase },
                      { id: 'about', label: t.profile.bio, icon: Users },
                      { id: 'market', label: t.nav.market, icon: TrendingUp },
                      { id: 'reviews', label: t.profile.reviews, icon: Star }
                    ].map((tabItem) => {
                      const Icon = tabItem.icon;
                      return (
                        <Button
                          key={tabItem.id}
                          variant={tab === tabItem.id ? 'default' : 'ghost'}
                          onClick={() => setTab(tabItem.id)}
                          className={`h-10 ${tab === tabItem.id ? 'shadow-md' : ''}`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {tabItem.label}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* About Tab */}
              {tab === 'about' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{t.profile.bio}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">About</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.about}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Bio</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Portfolio Tab */}
              {tab === 'portfolio' && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold">{t.profile.portfolio}</h2>
                    <Button asChild className="shadow-md">
                      <a href="#/me/portfolio/add">
                        <Upload className="h-4 w-4 mr-2" />
                        {t.profile.addPortfolio}
                      </a>
                    </Button>
                  </div>
                  {portfolioProjects.length === 0 ? (
                    <Card className="border-2 border-dashed">
                      <CardContent className="p-12 text-center">
                        <div className="h-20 w-20 rounded-full bg-[#EFFFF8] mx-auto mb-4 flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-[#3F7F6E]" />
                        </div>
                        <p className="text-gray-600 mb-4 text-lg">{t.profile.noPortfolio}</p>
                        <Button asChild size="lg">
                          <a href="#/me/portfolio/add">{t.profile.addPortfolio}</a>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {portfolioProjects.map((project) => (
                        <Card
                          key={project.id}
                          className="overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                          onClick={() => handlePortfolioProjectClick(project)}
                        >
                          {project.image_url ? (
                            <div className="relative aspect-[16/10] overflow-hidden">
                              <img
                                src={project.image_url}
                                alt={project.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          ) : (
                            <div className="aspect-[16/10] bg-gradient-to-br from-[#EFFFF8] via-[#6FE7C8]/10 to-[#5DD6B7]/10 flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-[#3F7F6E]/30" />
                            </div>
                          )}
                          <CardContent className="p-5">
                            <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-[#6FE7C8] transition-colors">
                              {project.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {project.tags?.slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {project.tags?.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{project.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Market Tab */}
              {tab === 'market' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">{t.deals.myOrders}</h2>
                    {loadingMarket ? (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-[#6FE7C8] mx-auto mb-3" />
                          <p className="text-gray-600">{t.common.loading}</p>
                        </CardContent>
                      </Card>
                    ) : userOrders.length === 0 ? (
                      <Card className="border-2 border-dashed">
                        <CardContent className="p-8 text-center text-gray-600">
                          {t.deals.noOrders}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {userOrders.map((order) => (
                          <Card
                            key={order.id}
                            className="cursor-pointer hover:shadow-lg hover:border-[#6FE7C8]/50 transition-all"
                            onClick={() => openPreview(order, 'order')}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                  <h4 className="font-bold text-xl mb-3">{order.title}</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary">{order.category}</Badge>
                                    <Badge variant="outline">{order.status}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{order.description}</p>
                                  <div className="flex items-center gap-4">
                                    <div className="font-bold text-xl text-[#6FE7C8]">
                                      {order.currency} {order.price_min}–{order.price_max}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Eye className="h-4 w-4" />
                                        {order.views_count || 0}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(order.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">{t.deals.myTasks}</h2>
                    {userTasks.length === 0 ? (
                      <Card className="border-2 border-dashed">
                        <CardContent className="p-8 text-center text-gray-600">
                          {t.deals.noTasks}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {userTasks.map((task) => (
                          <Card
                            key={task.id}
                            className="cursor-pointer hover:shadow-lg hover:border-[#6FE7C8]/50 transition-all"
                            onClick={() => openPreview(task, 'task')}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                  <h4 className="font-bold text-xl mb-3">{task.title}</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Badge variant="secondary">{task.category}</Badge>
                                    <Badge variant={task.status === 'active' ? 'default' : 'outline'}>
                                      {task.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description}</p>
                                  <div className="flex items-center gap-4">
                                    <div className="font-bold text-xl text-[#6FE7C8]">
                                      {task.currency} {task.price}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {task.delivery_days}d
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews Tab */}
              {tab === 'reviews' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{t.profile.reviews}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="h-20 w-20 rounded-full bg-[#EFFFF8] mx-auto mb-4 flex items-center justify-center">
                        <Star className="h-10 w-10 text-[#3F7F6E]" />
                      </div>
                      <p className="text-gray-600 text-lg">{t.profile.noReviews}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Edit Tab */}
              {tab === 'edit' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{t.profile.editProfile}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={onSubmitEdit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Avatar</label>
                        <div className="flex items-center gap-4">
                          <img
                            src={avatarPreview || profile.avatar}
                            alt="avatar"
                            className="h-20 w-20 rounded-xl object-cover border-2"
                          />
                          <div>
                            <input
                              type="file"
                              ref={avatarInputRef}
                              onChange={handleAvatarChange}
                              accept="image/*"
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => avatarInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t.common.uploadImage}
                            </Button>
                            {avatarFile && (
                              <p className="text-xs text-gray-500 mt-1">{avatarFile.name}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t.profile.name}</label>
                          <Input name="name" defaultValue={profile.name} required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Headline</label>
                          <Input name="headline" defaultValue={profile.headline} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Input name="role" defaultValue={profile.role} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">About</label>
                        <Input name="about" defaultValue={profile.about} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t.profile.bio}</label>
                        <textarea
                          name="bio"
                          defaultValue={profile.bio}
                          rows={6}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t.profile.skills}</label>
                        <Input
                          name="skills"
                          defaultValue={profile.skills.join(', ')}
                          placeholder="React, Node, etc."
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Min Rate</label>
                          <Input name="rateMin" type="number" defaultValue={profile.rateMin} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Max Rate</label>
                          <Input name="rateMax" type="number" defaultValue={profile.rateMax} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t.market.currency}</label>
                          <select
                            name="currency"
                            defaultValue={profile.currency}
                            className="w-full h-10 rounded-md border px-3 bg-background"
                          >
                            <option>USD</option>
                            <option>EUR</option>
                            <option>RUB</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location</label>
                        <Input name="location" defaultValue={profile.location} />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t.auth.email}</label>
                          <Input name="contactEmail" type="email" defaultValue={profile.contactEmail} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Telegram</label>
                          <Input name="contactTelegram" defaultValue={profile.contactTelegram} />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Button type="submit" size="lg" className="flex-1">
                          {t.common.save}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => setTab('portfolio')}
                        >
                          {t.common.cancel}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Portfolio Preview Dialog */}
        <Dialog open={portfolioPreviewOpen} onOpenChange={setPortfolioPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedPortfolioProject && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedPortfolioProject.title}</DialogTitle>
                </DialogHeader>
                {selectedPortfolioProject.image_url && (
                  <img
                    src={selectedPortfolioProject.image_url}
                    alt={selectedPortfolioProject.title}
                    className="w-full rounded-lg"
                  />
                )}
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">{selectedPortfolioProject.description}</p>
                  {selectedPortfolioProject.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPortfolioProject.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  {selectedPortfolioProject.link && (
                    <a
                      href={selectedPortfolioProject.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#6FE7C8] hover:text-[#5DD6B7] font-medium"
                    >
                      View Project <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
}
