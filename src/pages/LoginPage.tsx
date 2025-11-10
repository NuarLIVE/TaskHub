import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { useAuth } from '@/contexts/AuthContext';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 }
};

const pageTransition = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.9 };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        window.location.hash = '/';
      } else {
        setError(result.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="login"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="w-full max-w-md px-4">
          <Card>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Вход</h1>
                <p className="text-[#3F7F6E]">Войдите в свой аккаунт FreelanceHub</p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium">Пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3F7F6E]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-11"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" />
                    <span>Запомнить меня</span>
                  </label>
                  <a href="#" className="text-[#6FE7C8] hover:underline">Забыли пароль?</a>
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#6FE7C8]/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-background px-4 text-[#3F7F6E]">или</span>
                  </div>
                </div>

                <GoogleAuthButton mode="login" />

                <div className="text-center text-sm text-[#3F7F6E]">
                  Нет аккаунта?{' '}
                  <a href="#/register" className="text-[#6FE7C8] hover:underline font-medium">
                    Зарегистрироваться
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
