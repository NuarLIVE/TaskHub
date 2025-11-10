import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, MessageSquare, MapPin, Shield, Calendar, Image as ImageIcon, ExternalLink, Loader2, Upload, Phone, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [portfolioTab, setPortfolioTab] = useState('all');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [portfolioPreviewOpen, setPortfolioPreviewOpen] = useState(false);
  const [selectedPortfolioProject, setSelectedPortfolioProject] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(() => {
    const raw = typeof window !== 'undefined' && localStorage.getItem('fh_profile');
    return raw ? JSON.parse(raw) : {
      name: 'rai carvallo',
      headline: 'Web/Unity',
      role: 'Full‑stack / Game Dev',
      about: 'I am a student who wants to work with ia',
      bio: 'I have experience in working with ai, using the tools this service offers such as tools design, book summary, and other stuff that ai offers to our community. I want to use this to help me in work in the future so it is easier for everyone',
      skills: ['React', 'Tailwind', 'Node', 'PostgreSQL', 'Unity', 'Photon'],
      rateMin: 10,
      rateMax: 50,
      currency: 'USD',
      location: 'Chile',
      contactEmail: 'you@example.com',
      contactTelegram: '@mickey',
      username: 'rcarvall320',
      avatar: 'https://i.pravatar.cc/200?img=49',
      phoneVerified: true,
      joinedDate: 'October 12, 2025',
      lastActive: '2 weeks'
    };
  });

  useEffect(() => {
    if (user) {
      if (tab === 'kworks') {
        loadUserMarketItems();
      } else if (tab === 'portfolio') {
        loadPortfolioProjects();
      }
    }
  }, [user, tab]);

  const loadUserMarketItems = async () => {
    if (!user) return;

    try {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadPortfolioProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false});

    setPortfolioProjects(data || []);
  };

  const saveProfile = (p: any) => {
    setProfile(p);
    localStorage.setItem('fh_profile', JSON.stringify(p));
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
      ...profile,
      name: String(fd.get('name') || ''),
      headline: String(fd.get('headline') || ''),
      about: String(fd.get('about') || ''),
      bio: bioText,
      skills: String(fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean),
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
        className="min-h-screen bg-gray-50"
      >
        {/* Hero Background */}
        <div
          className="relative h-48 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80')`,
            backgroundPosition: 'center 35%'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-blue-900/60" />
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24 pb-12 relative z-10">
          {/* Profile Card */}
          <Card className="mb-8 shadow-lg border-0">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Avatar with Hexagon Style */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 p-1 shadow-xl"
                      style={{
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                      }}
                    >
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                        style={{
                          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="mb-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      {profile.name}
                    </h1>
                    <p className="text-lg text-gray-700 font-medium mb-3">{profile.about}</p>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">{profile.bio}</p>
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{profile.username}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">Payment methods:</span>
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {profile.phoneVerified && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-green-600" />
                          <span>Phone verified</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{profile.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {profile.joinedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Offline {profile.lastActive}</span>
                      </div>
                      <button className="text-blue-600 hover:underline text-xs">
                        Block this seller
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 lg:w-48">
                  <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Heart className="h-4 w-4" />
                  </button>
                  <Button
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    Contact Me
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 border-green-600 text-green-600 hover:bg-green-50"
                    onClick={() => setTab('edit')}
                  >
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs and Content */}
          {tab !== 'edit' && (
            <>
              {/* Portfolio Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Portfolio</h2>

                {/* Portfolio Tabs */}
                <div className="flex gap-4 mb-6 border-b">
                  <button
                    onClick={() => setPortfolioTab('all')}
                    className={`pb-3 px-1 font-medium transition-colors relative ${
                      portfolioTab === 'all'
                        ? 'text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All categories
                    {portfolioTab === 'all' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setPortfolioTab('articles')}
                    className={`pb-3 px-1 font-medium transition-colors relative ${
                      portfolioTab === 'articles'
                        ? 'text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Articles
                    {portfolioTab === 'articles' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => setPortfolioTab('presentations')}
                    className={`pb-3 px-1 font-medium transition-colors relative ${
                      portfolioTab === 'presentations'
                        ? 'text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Presentations
                    {portfolioTab === 'presentations' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                    )}
                  </button>
                </div>

                {/* Portfolio Grid */}
                {portfolioProjects.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="p-12 text-center">
                      <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">{t.profile.noPortfolio}</p>
                      <Button asChild>
                        <a href="#/me/portfolio/add">{t.profile.addPortfolio}</a>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {portfolioProjects.map((project) => (
                      <div
                        key={project.id}
                        className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-shadow"
                        onClick={() => handlePortfolioProjectClick(project)}
                      >
                        {project.image_url ? (
                          <img
                            src={project.image_url}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-medium text-sm line-clamp-2">
                              {project.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User's Kworks Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6">This User's Kworks</h2>

                {userTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No services yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      >
                        <div className="relative aspect-video bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                          {task.image_url ? (
                            <img
                              src={task.image_url}
                              alt={task.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <ImageIcon className="h-16 w-16 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-6 h-6 rounded-full bg-white overflow-hidden border-2 border-white">
                                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-white font-medium drop-shadow-md">
                                {profile.username}
                              </span>
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                            {task.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {task.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-gray-500">Starting at</span>
                              <div className="font-bold text-lg text-green-600">
                                ${task.price}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Custom Kwork Card */}
                    <Card className="overflow-hidden border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors cursor-pointer group">
                      <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                        <div
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 p-0.5"
                          style={{
                            clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                          }}
                        >
                          <div
                            className="w-full h-full bg-white flex items-center justify-center"
                            style={{
                              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                            }}
                          >
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4 text-center">
                        <h3 className="font-medium mb-2">Need something specific?</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          This seller offers custom kworks.
                        </p>
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                          Order Custom Kwork
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold">
                    Reviews Left for {profile.username}
                  </h2>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                <Card>
                  <CardContent className="p-8 text-center text-gray-600">
                    {profile.username} doesn't have any reviews yet.
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Contact Button */}
              <div className="text-center">
                <Button
                  size="lg"
                  className="px-12 h-14 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg"
                >
                  Contact Me
                </Button>
              </div>
            </>
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
                    <label className="text-sm font-medium">About</label>
                    <Input name="about" defaultValue={profile.about} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.profile.bio}</label>
                    <textarea
                      name="bio"
                      defaultValue={profile.bio}
                      rows={4}
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
                    <Button type="submit" size="lg" className="flex-1 bg-green-600 hover:bg-green-700">
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
                      className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
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
