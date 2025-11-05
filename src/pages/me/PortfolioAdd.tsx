import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = { initial: { opacity: 0, y: 16 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -16 } };
const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function PortfolioAdd() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Необходимо войти в систему');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('portfolio_projects')
        .insert({
          user_id: user.id,
          title,
          description,
          project_url: link || null,
          image_url: imageUrl || null,
          tags
        });

      if (error) throw error;

      alert('Работа успешно добавлена в портфолио!');
      window.location.hash = '/me';
    } catch (error) {
      console.error('Error adding portfolio project:', error);
      alert('Ошибка при добавлении проекта');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.hash = '/me';
  };

  return (
    <motion.div
      key="portfolio-add"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background"
    >
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold mb-6">Добавить работу в портфолио</h1>

        <Card>
          <CardHeader>
            <CardTitle>Информация о проекте</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div>
                <label className="text-sm font-medium mb-1 block">Название проекта</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E-commerce платформа на React"
                  required
                  className="h-11"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Опишите проект, использованные технологии, вашу роль и результаты..."
                  className="w-full rounded-md border px-3 py-2 bg-background"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Ссылка / Репозиторий</label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://github.com/username/project или https://example.com"
                  className="h-11"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Теги</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="React, Node.js, TypeScript..."
                    className="h-10"
                  />
                  <Button type="button" onClick={handleAddTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">URL изображения</label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/project-screenshot.png"
                  className="h-11"
                />
                <p className="text-xs text-[#3F7F6E] mt-1">
                  Укажите ссылку на изображение проекта
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
}
