import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Mail, Lock, User, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeProvider';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users
        if (session?.user) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name || email.split('@')[0]
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email já está cadastrado. Faça login.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Conta criada com sucesso! Verifique seu email.');
      }
    } catch (error) {
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, informe seu email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setIsForgotPassword(false);
        setEmail('');
      }
    } catch (error) {
      toast.error('Erro ao enviar email. Tente novamente.');
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

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              {isForgotPassword ? 'Recuperar senha' : (isLogin ? 'Bem-vindo de volta' : 'Criar conta')}
            </h1>
            <p className="text-muted-foreground">
              {isForgotPassword 
                ? 'Digite seu email para receber o link de recuperação'
                : (isLogin 
                  ? 'Entre com suas credenciais para continuar' 
                  : 'Preencha os dados para começar')}
            </p>
          </div>

          <form onSubmit={isForgotPassword ? handleForgotPassword : (isLogin ? handleSignIn : handleSignUp)} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div>
                <Label htmlFor="name" className="text-card-foreground">
                  Nome
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-card-foreground">
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <Label htmlFor="password" className="text-card-foreground">
                  Senha
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
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : (isForgotPassword ? 'Enviar Link de Recuperação' : (isLogin ? 'Entrar' : 'Criar Conta'))}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {!isForgotPassword && isLogin && (
              <button
                onClick={() => {
                  setIsForgotPassword(true);
                  setPassword('');
                }}
                className="block w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Esqueceu sua senha?
              </button>
            )}
            
            <button
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsLogin(!isLogin);
                }
                setEmail('');
                setPassword('');
                setName('');
              }}
              className="text-sm text-primary hover:underline"
            >
              {isForgotPassword 
                ? '← Voltar para login'
                : (isLogin 
                  ? 'Não tem uma conta? Cadastre-se' 
                  : 'Já tem uma conta? Faça login')}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
