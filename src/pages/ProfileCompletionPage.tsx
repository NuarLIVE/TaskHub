import { useState, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileCompletionPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [skillInput, setSkillInput] = useState('');

  const [formData, setFormData] = useState({
    specialty: '',
    experience_years: '',
    age: '',
    rate_min: '',
    rate_max: '',
    currency: 'USD',
    skills: [] as string[],
    location: '',
    contact_telegram: '',
    contact_gmail: '',
  });

  useEffect(() => {
    if (!user) {
      window.location.hash = '/login';
    }
  }, [user]);

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

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      if (formData.skills.length >= 10) {
        alert('Максимум 10 навыков');
        return;
      }
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      let avatarUrl = '';

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('portfolio-images')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      const updateData: any = {
        specialty: formData.specialty,
        experience_years: parseInt(formData.experience_years) || 0,
        age: parseInt(formData.age) || null,
        rate_min: parseInt(formData.rate_min) || 0,
        rate_max: parseInt(formData.rate_max) || 0,
        currency: formData.currency,
        skills: formData.skills,
        location: formData.location,
        contact_telegram: formData.contact_telegram,
        contact_gmail: formData.contact_gmail,
        profile_completed: true,
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      window.location.hash = '/';
    } catch (error) {
      console.error('Error completing profile:', error);
      alert('Ошибка при сохранении профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Завершите настройку профиля
            </h1>
            <p className="text-gray-600">
              Расскажите о себе, чтобы клиенты могли найти вас
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-[#3F7F6E] text-white p-2 rounded-full cursor-pointer hover:bg-[#2F6F5E] transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="mt-2 text-sm text-gray-500">Загрузите фото профиля</p>
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Специальность *
              </label>
              <input
                type="text"
                required
                value={formData.specialty}
                onChange={(e) =>
                  setFormData({ ...formData, specialty: e.target.value })
                }
                placeholder="Например: Full-stack разработчик, UI/UX дизайнер"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
              />
            </div>

            {/* Experience and Age */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Опыт работы (лет) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="40"
                  value={formData.experience_years}
                  onChange={(e) =>
                    setFormData({ ...formData, experience_years: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Максимум 40 лет</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Возраст
                </label>
                <input
                  type="number"
                  min="16"
                  max="100"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Не указано"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                />
              </div>
            </div>

            {/* Rates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Стоимость работ *
              </label>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.rate_min}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_min: e.target.value })
                  }
                  placeholder="Мин."
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                />
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.rate_max}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_max: e.target.value })
                  }
                  placeholder="Макс."
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                />
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                  <option value="KZT">KZT</option>
                </select>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Навыки и технологии *
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Добавьте навык"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-6 py-3 bg-[#3F7F6E] text-white rounded-lg hover:bg-[#2F6F5E] transition-colors"
                >
                  Добавить
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#3F7F6E]/10 text-[#3F7F6E] rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
              {formData.skills.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Добавьте хотя бы один навык
                </p>
              )}
              {formData.skills.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {formData.skills.length} / 10 навыков
                </p>
              )}
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Контактная информация
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Локация
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Город, страна"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={formData.contact_telegram}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_telegram: e.target.value })
                    }
                    placeholder="@username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gmail
                  </label>
                  <input
                    type="email"
                    value={formData.contact_gmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_gmail: e.target.value })
                    }
                    placeholder="example@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3F7F6E] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || formData.skills.length === 0}
                className="w-full py-4 bg-[#3F7F6E] text-white rounded-lg font-semibold hover:bg-[#2F6F5E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Сохранение...' : 'Завершить настройку профиля'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
