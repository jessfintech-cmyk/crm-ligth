import React from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, MessageCircle, Bot, TrendingUp, Shield, Zap, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeProvider';

const Landing = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="text-primary-foreground" size={24} />
            </div>
            <span className="text-2xl font-bold text-foreground">CRM Consignado</span>
          </div>
          
          <div className="flex items-center gap-4">
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
            <Link to="/auth">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/auth">
              <Button>Começar Grátis</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Gerencie seu crédito consignado com
            <span className="text-primary"> Inteligência Artificial</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Automatize atendimentos, organize propostas e feche mais negócios com nosso CRM completo integrado com WhatsApp e IA.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="https://lovable.dev/pricing" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="text-lg px-8 py-6">
                Começar Agora
              </Button>
            </a>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center text-foreground mb-16">
          Recursos Poderosos
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
              <Bot className="text-primary" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Agentes IA Inteligentes
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Atendimento automatizado 24/7 com IA que entende contexto e responde naturalmente aos seus clientes.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-success/10 rounded-lg flex items-center justify-center mb-6">
              <MessageCircle className="text-success" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              WhatsApp Integrado
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Receba e envie mensagens diretamente pelo WhatsApp. Histórico completo e organizado de todas as conversas.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-warning/10 rounded-lg flex items-center justify-center mb-6">
              <TrendingUp className="text-warning" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Kanban Intuitivo
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Visualize e gerencie todas as propostas em um Kanban drag-and-drop. Acompanhe cada etapa do processo.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-info/10 rounded-lg flex items-center justify-center mb-6">
              <Shield className="text-info" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Tags Automáticas
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              IA categoriza automaticamente cada mensagem com tags inteligentes para melhor organização.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6">
              <Zap className="text-accent" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Simulador Rápido
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Calcule propostas instantaneamente com nosso simulador integrado. Suporte para todos os tipos de operação.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition">
            <div className="w-14 h-14 bg-destructive/10 rounded-lg flex items-center justify-center mb-6">
              <DollarSign className="text-destructive" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Gestão Completa
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Controle total de clientes, propostas, documentos e pagamentos em um único lugar.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-primary rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Junte-se a centenas de correspondentes que já automatizaram seu negócio.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© 2025 CRM Consignado. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
