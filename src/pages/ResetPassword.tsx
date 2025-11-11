import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Lock, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeProvider';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Senha alterada com sucesso!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <DollarSign className="text-primary-foreground" size={28} />
          </div>
          <span className="text-2xl font-bold text-foreground">CRM Consignado</span>
        </Link>

        {/* Reset Password Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              Redefinir senha
            </h1>
            <p className="text-muted-foreground">
              Digite sua nova senha
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-card-foreground">
                Nova senha
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-card-foreground">
                Confirmar nova senha
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10"
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : 'Redefinir Senha'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-primary hover:underline">
              ← Voltar para login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
