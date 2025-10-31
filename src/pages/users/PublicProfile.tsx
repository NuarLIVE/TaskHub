import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Briefcase, MessageCircle, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FavoriteButton from '@/components/ui/FavoriteButton';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function PublicProfile() {
  const slug = window.location.hash.split('/').pop() || 'mickey';

  const user = {
    name: 'Mickey',
    slug: slug,
    avatar: 'https://i.pravatar.cc/150?img=49',
    location: 'Алматы, Казахстан',
    rating: 4.9,
    completedJobs: 27,
    bio: 'Full-stack разработчик с 5+ годами опыта. Специализируюсь на React, Node.js, и Unity. Помогаю стартапам создавать MVP и масштабировать продукты.',
    skills: ['React', 'Node.js', 'TypeScript', 'Unity', 'PostgreSQL', 'AWS'],
    portfolio: [
      { id: 1, title: 'E-commerce платформа', description: 'Полный стек разработки интернет-магазина', image: 'https://images.pexels.com/photos/7566392/pexels-photo-7566392.jpeg?auto=compress&cs=tinysrgb&w=400' },
      { id: 2, title: 'Unity 2D игра', description: 'Мультиплеер платформер на Photon', image: 'https://images.pexels.com/photos/8612992/pexels-photo-8612992.jpeg?auto=compress&cs=tinysrgb&w=400' }
    ],
    reviews: [
      { id: 1, author: 'NovaTech', rating: 5, text: 'Отличная работа, всё в срок!', date: '2025-10-20' },
      { id: 2, author: 'AppNest', rating: 5, text: 'Профессионал своего дела', date: '2025-10-15' }
    ]
  };

  const handleMessage = () => {
    window.location.hash = `/messages?to=${slug}`;
  };

  return (
    <motion.div
      key="public-profile"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="grid gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <img src={user.avatar} alt={user.name} className="h-24 w-24 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h1 className="text-2xl font-bold">{user.name}</h1>
                      <FavoriteButton itemId={user.slug} itemType="task" variant="text" />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#3F7F6E] mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {user.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {user.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {user.completedJobs} проектов
                      </span>
                    </div>
                    <Button onClick={handleMessage}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Написать
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>О себе</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#3F7F6E]">{user.bio}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Навыки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Портфолио</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {user.portfolio.map((item) => (
                    <div key={item.id} className="group cursor-pointer">
                      <div className="aspect-video rounded-lg overflow-hidden mb-2">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      </div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-[#3F7F6E]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Отзывы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {user.reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{review.author}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-[#3F7F6E] text-sm mb-1">{review.text}</p>
                      <span className="text-xs text-[#3F7F6E]">{review.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 self-start sticky top-24">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#3F7F6E]">Выполнено</span>
                  <span className="font-semibold">{user.completedJobs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#3F7F6E]">Рейтинг</span>
                  <span className="font-semibold">{user.rating}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#3F7F6E]">Отзывов</span>
                  <span className="font-semibold">{user.reviews.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Достижения</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-[#6FE7C8]" />
                  <div>
                    <div className="font-semibold text-sm">Top Freelancer</div>
                    <div className="text-xs text-[#3F7F6E]">Октябрь 2025</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
