import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, MessageCircle, Bot, TrendingUp, Shield, Zap, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{brCodeBase64: string, brCode: string, id: string} | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cellphone: '',
    email: '',
    taxId: ''
  });

  const handleCreateQRCode = async () => {
    if (!formData.name || !formData.cellphone || !formData.email || !formData.taxId) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('abacate-pay-pix', {
        body: {
          amount: 9899, // R$ 98,99 em centavos
          description: 'Assinatura CRM Consignado',
          customer: formData
        }
      });

      if (error) throw error;

      if (data?.data) {
        setQrCodeData({
          brCodeBase64: data.data.brCodeBase64,
          brCode: data.data.brCode,
          id: data.data.id
        });
        toast({
          title: "QR Code gerado!",
          description: "Use o QR Code abaixo para realizar o pagamento"
        });
      }
    } catch (error) {
      console.error('Error creating QR Code:', error);
      toast({
        title: "Erro ao gerar QR Code",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Listen for payment status changes via Realtime
  useEffect(() => {
    if (!qrCodeData?.id) return;

    console.log('Setting up realtime listener for payment:', qrCodeData.id);

    const channel = supabase
      .channel(`payment-${qrCodeData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `payment_id=eq.${qrCodeData.id}`,
        },
        (payload) => {
          console.log('Payment status changed:', payload);
          if (payload.new && typeof payload.new === 'object' && 'status' in payload.new) {
            if (payload.new.status === 'COMPLETED') {
              setPaymentSuccess(true);
              toast({
                title: "Pagamento confirmado!",
                description: "Seu pagamento foi aprovado automaticamente"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime listener');
      supabase.removeChannel(channel);
    };
  }, [qrCodeData?.id]);

  const handleCheckPayment = async () => {
    if (!qrCodeData?.id) return;

    setCheckingPayment(true);
    try {
      // Query the database directly for payment status
      const { data, error } = await supabase
        .from('payments')
        .select('status')
        .eq('payment_id', qrCodeData.id)
        .single();

      if (error) throw error;

      console.log('Payment status:', data);

      if (data.status === 'COMPLETED') {
        setPaymentSuccess(true);
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pagamento foi aprovado com sucesso"
        });
      } else {
        toast({
          title: "Pagamento pendente",
          description: "Ainda não identificamos seu pagamento. Por favor, aguarde alguns instantes."
        });
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      toast({
        title: "Erro ao verificar pagamento",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setQrCodeData(null);
    setPaymentSuccess(false);
    setFormData({
      name: '',
      cellphone: '',
      email: '',
      taxId: ''
    });
  };

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
            <Button size="lg" className="text-lg px-8 py-6" onClick={handleOpenDialog}>
              Começar Agora
            </Button>
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

      {/* Checkout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Compra</DialogTitle>
            <DialogDescription>
              Preencha seus dados para gerar o QR Code de pagamento
            </DialogDescription>
          </DialogHeader>
          
          {!qrCodeData ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João Silva"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cellphone">Telefone</Label>
                <Input
                  id="cellphone"
                  value={formData.cellphone}
                  onChange={(e) => setFormData({ ...formData, cellphone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxId">CPF</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="123.456.789-01"
                />
              </div>
              
              <Button 
                onClick={handleCreateQRCode} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Gerando...' : 'Criar QR Code'}
              </Button>
            </div>
          ) : paymentSuccess ? (
            <div className="space-y-4 py-4 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-card-foreground">
                  Pagamento realizado com sucesso!
                </h3>
                <p className="text-muted-foreground">
                  Já pode efetuar seu login na plataforma.
                </p>
                <Link to="/auth" className="w-full">
                  <Button className="w-full" size="lg">
                    Ir para Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Aguardando confirmação do pagamento...
                  </span>
                </div>

                <img 
                  src={qrCodeData.brCodeBase64} 
                  alt="QR Code PIX" 
                  className="w-64 h-64"
                />
                <div className="w-full">
                  <Label>Código PIX Copia e Cola</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={qrCodeData.brCode} 
                      readOnly 
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(qrCodeData.brCode);
                        toast({
                          title: "Copiado!",
                          description: "Código PIX copiado para a área de transferência"
                        });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={handleCheckPayment} 
                  className="w-full mt-4"
                  disabled={checkingPayment}
                  size="lg"
                >
                  {checkingPayment ? 'Verificando...' : 'Já efetuei o pagamento'}
                </Button>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  O pagamento será confirmado automaticamente após a aprovação
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
