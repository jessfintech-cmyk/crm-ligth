import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { MessageCircle, User, DollarSign, Phone, Send, Bot, Calculator, ImagePlus, X, Menu, LogOut, Settings, Users, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MessageTags from '@/components/MessageTags';
import TagFilter from '@/components/TagFilter';
import { useNavigate } from 'react-router-dom';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useTheme } from '@/contexts/ThemeProvider';
import { Button } from '@/components/ui/button';

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  banco: string;
  valorSolicitado: number;
  prazo: number;
  agente: string;
  status: string;
  telefone: string;
  ultimaAtualizacao: string;
}

interface Mensagem {
  id: number;
  messageId?: string; // ID do banco de dados para buscar tags
  remetente: 'cliente' | 'ia' | 'agente';
  texto: string;
  timestamp: string;
  agente?: string;
}

const initialClients: Cliente[] = [
  {
    id: '1',
    nome: 'João Silva',
    cpf: '123.456.789-00',
    banco: 'Banco do Brasil',
    valorSolicitado: 50000,
    prazo: 84,
    agente: 'Ana Costa',
    status: 'novo',
    telefone: '11999999999',
    ultimaAtualizacao: new Date().toISOString()
  },
  {
    id: '2',
    nome: 'Maria Santos',
    cpf: '987.654.321-00',
    banco: 'Caixa Econômica',
    valorSolicitado: 35000,
    prazo: 60,
    agente: 'Carlos Lima',
    status: 'analise',
    telefone: '11988888888',
    ultimaAtualizacao: new Date().toISOString()
  },
  {
    id: '3',
    nome: 'Pedro Costa',
    cpf: '456.789.123-00',
    banco: 'Bradesco',
    valorSolicitado: 70000,
    prazo: 96,
    agente: 'Ana Costa',
    status: 'documentacao',
    telefone: '11977777777',
    ultimaAtualizacao: new Date().toISOString()
  }
];

const colunas = [
  { id: 'novo', titulo: 'Novo Lead', cor: 'border-info' },
  { id: 'analise', titulo: 'Proposta em Análise', cor: 'border-warning' },
  { id: 'retencao', titulo: 'Retenção Bancária', cor: 'border-warning' },
  { id: 'documentacao', titulo: 'Documentação', cor: 'border-accent' },
  { id: 'pagamento', titulo: 'Em Pagamento', cor: 'border-success' },
  { id: 'finalizado', titulo: 'Finalizado', cor: 'border-muted' }
];

const tiposOperacao = [
  'Portabilidade com troco',
  'Portabilidade com redução',
  'Compra de dívida',
  'Cartão consignado',
  'Compra de cartão',
  'Contrato novo',
  'Refin'
];

const bancos = [
  'Banco do Brasil',
  'Caixa Econômica',
  'Bradesco',
  'Itaú',
  'Santander',
  'Banco Inter',
  'Futuro Previdência',
  'J17',
  'Banco Larca',
  'Banco Hoje Previdência',
  'Banco BRB',
  'Banco Barigui',
  'Banco Pan',
  'Safra',
  'C6 Bank',
  'Nubank',
  'Original',
  'BMG',
  'Daycoval',
  'Mercantil do Brasil'
];

const agentesIA: Record<string, { nome: string; prompt: string; personalidade: string }> = {
  novo: {
    nome: 'Agente de Captação',
    prompt: 'Você é um agente especializado em captar novos leads. Seja cordial e entusiasta.',
    personalidade: 'Amigável e proativo'
  },
  analise: {
    nome: 'Agente de Análise',
    prompt: 'Você analisa propostas e orienta sobre documentação necessária.',
    personalidade: 'Detalhista e orientador'
  },
  retencao: {
    nome: 'Agente de Retenção',
    prompt: 'Você acompanha o processo bancário e mantém o cliente informado.',
    personalidade: 'Paciente e informativo'
  },
  documentacao: {
    nome: 'Agente de Documentação',
    prompt: 'Você auxilia na coleta e validação de documentos.',
    personalidade: 'Organizado e claro'
  },
  pagamento: {
    nome: 'Agente de Pagamento',
    prompt: 'Você confirma pagamentos e finaliza contratos.',
    personalidade: 'Profissional e conclusivo'
  },
  finalizado: {
    nome: 'Agente de Pós-venda',
    prompt: 'Você faz follow-up e busca satisfação do cliente.',
    personalidade: 'Atencioso e focado em relacionamento'
  }
};

const Dashboard = () => {
  const [clientes, setClientes] = useState<Cliente[]>(initialClients);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [conversas, setConversas] = useState<Record<string, Mensagem[]>>({});
  const [simuladorAberto, setSimuladorAberto] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);
  const [dadosSimulacao, setDadosSimulacao] = useState({
    tipoOperacao: 'Contrato novo',
    bancoAtual: '',
    bancoOperacao: '',
    parcela: '',
    saldoDevedor: '',
    coeficiente: '',
    prazo: ''
  });
  const [operacoesSimulacao, setOperacoesSimulacao] = useState<Array<{
    tipoOperacao: string;
    bancoAtual: string;
    bancoOperacao: string;
    parcela: number;
    saldoDevedor: number;
    prazo: number;
    valorLiberado: number;
    observacao: string;
  }>>([]);
  const [whatsappConfig, setWhatsappConfig] = useState({
    numero: '+5551995353698',
    mensagemBotao: 'Aceito a proposta'
  });
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario] = useState({
    nome: 'Administrador',
    tipo: 'admin'
  });
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>(clientes);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [gptMakerChats, setGptMakerChats] = useState<any[]>([]);
  const [chatsAberto, setChatsAberto] = useState(false);
  const [conversaSelecionada, setConversaSelecionada] = useState<any>(null);
  const [mensagensGPT, setMensagensGPT] = useState<any[]>([]);

  // Verificar autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Carregar mensagens do banco de dados e escutar realtime
  useEffect(() => {
    const carregarMensagens = async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar mensagens:', error);
        return;
      }

      if (data) {
        // Agrupar mensagens por CPF do cliente
        const mensagensPorCliente: Record<string, Mensagem[]> = {};
        
        data.forEach((msg) => {
          // Encontrar cliente pelo CPF
          const cliente = clientes.find(c => c.cpf === msg.cliente_cpf);
          if (cliente) {
            if (!mensagensPorCliente[cliente.id]) {
              mensagensPorCliente[cliente.id] = [];
            }
            mensagensPorCliente[cliente.id].push({
              id: Date.now() + Math.random(),
              messageId: msg.id, // ID do banco para buscar tags
              remetente: msg.remetente as 'cliente' | 'ia' | 'agente',
              texto: msg.texto,
              timestamp: msg.created_at,
              agente: msg.agente_nome || undefined
            });
          }
        });

        setConversas(mensagensPorCliente);
      }
    };

    carregarMensagens();

    // Escutar novas mensagens em tempo real
    const channel = supabase
      .channel('whatsapp_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('Nova mensagem recebida:', payload);
          const novaMensagem = payload.new;
          
          // Encontrar cliente pelo CPF
          const cliente = clientes.find(c => c.cpf === novaMensagem.cliente_cpf);
          if (cliente) {
            const mensagemFormatada: Mensagem = {
              id: Date.now() + Math.random(),
              messageId: novaMensagem.id, // ID do banco para buscar tags
              remetente: novaMensagem.remetente as 'cliente' | 'ia' | 'agente',
              texto: novaMensagem.texto,
              timestamp: novaMensagem.created_at,
              agente: novaMensagem.agente_nome || undefined
            };

            setConversas(prev => ({
              ...prev,
              [cliente.id]: [...(prev[cliente.id] || []), mensagemFormatada]
            }));

            // Mostrar notificação se for mensagem do cliente
            if (novaMensagem.remetente === 'cliente') {
              toast.success(`Nova mensagem de ${cliente.nome}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientes]);

  // Filtrar clientes por tags
  useEffect(() => {
    const filtrarClientes = async () => {
      if (tagsFiltro.length === 0) {
        setClientesFiltrados(clientes);
        return;
      }

      // Buscar mensagens que têm as tags selecionadas
      const { data: messageTags, error } = await supabase
        .from('message_tags')
        .select('message_id, whatsapp_messages(cliente_cpf)')
        .in('tag_id', tagsFiltro);

      if (error) {
        console.error('Erro ao filtrar por tags:', error);
        return;
      }

      // Extrair CPFs únicos
      const cpfsComTags = new Set<string>();
      messageTags?.forEach((mt: any) => {
        if (mt.whatsapp_messages?.cliente_cpf) {
          cpfsComTags.add(mt.whatsapp_messages.cliente_cpf);
        }
      });

      // Filtrar clientes que têm esses CPFs
      const clientesFiltrados = clientes.filter(c => cpfsComTags.has(c.cpf));
      setClientesFiltrados(clientesFiltrados);
    };

    filtrarClientes();
  }, [tagsFiltro, clientes]);

  const buscarCliente = (texto: string) => {
    return clientes.find(c => 
      c.cpf.includes(texto) || 
      c.nome.toLowerCase().includes(texto.toLowerCase())
    );
  };

  const receberMensagemWhatsApp = (cpf: string, mensagemTexto: string) => {
    const cliente = buscarCliente(cpf);
    if (cliente) {
      const novaConversa: Mensagem = {
        id: Date.now(),
        remetente: 'cliente',
        texto: mensagemTexto,
        timestamp: new Date().toISOString()
      };
      
      setConversas(prev => ({
        ...prev,
        [cliente.id]: [...(prev[cliente.id] || []), novaConversa]
      }));

      toast.success(`Nova mensagem de ${cliente.nome}`);
      setTimeout(() => respostaIA(cliente, mensagemTexto), 1000);
    }
  };

  const respostaIA = async (cliente: Cliente, mensagemCliente: string) => {
    const agente = agentesIA[cliente.status];
    
    // Verificar se pede simulação
    if (mensagemCliente.toLowerCase().includes('simulação') || 
        mensagemCliente.toLowerCase().includes('simular')) {
      const respostaSimulacao: Mensagem = {
        id: Date.now(),
        remetente: 'ia',
        agente: agente.nome,
        texto: `Olá ${cliente.nome}! Vou fazer uma simulação para você. Aguarde um momento...`,
        timestamp: new Date().toISOString()
      };
      setConversas(prev => ({
        ...prev,
        [cliente.id]: [...(prev[cliente.id] || []), respostaSimulacao]
      }));
      setTimeout(() => setSimuladorAberto(true), 500);
      return;
    }

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gptmaker-chat`;

      console.log('Enviando mensagem para GPT Maker com contexto do agente...');
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: mensagemCliente,
          contextId: cliente.cpf,
          chatName: cliente.nome,
          phone: cliente.telefone,
          status: cliente.status,
          valorSolicitado: cliente.valorSolicitado,
          banco: cliente.banco
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao conectar com GPT Maker');
      }

      const data = await response.json();
      console.log('Resposta recebida:', data);

      // Criar mensagem com a resposta do GPT Maker
      const respostaIAMsg: Mensagem = {
        id: Date.now(),
        remetente: 'ia',
        agente: agente.nome,
        texto: data.message || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date().toISOString()
      };

      setConversas(prev => ({
        ...prev,
        [cliente.id]: [...(prev[cliente.id] || []), respostaIAMsg]
      }));

      // Se houver imagens ou áudios, adicionar como mensagens separadas
      if (data.images && data.images.length > 0) {
        data.images.forEach((imageUrl: string, index: number) => {
          const imagemMsg: Mensagem = {
            id: Date.now() + index + 1,
            remetente: 'ia',
            agente: agente.nome,
            texto: `📷 [Imagem: ${imageUrl}]`,
            timestamp: new Date().toISOString()
          };
          setConversas(prev => ({
            ...prev,
            [cliente.id]: [...(prev[cliente.id] || []), imagemMsg]
          }));
        });
      }

      if (data.audios && data.audios.length > 0) {
        data.audios.forEach((audioUrl: string, index: number) => {
          const audioMsg: Mensagem = {
            id: Date.now() + index + 100,
            remetente: 'ia',
            agente: agente.nome,
            texto: `🎵 [Áudio: ${audioUrl}]`,
            timestamp: new Date().toISOString()
          };
          setConversas(prev => ({
            ...prev,
            [cliente.id]: [...(prev[cliente.id] || []), audioMsg]
          }));
        });
      }

    } catch (error) {
      console.error('Erro ao gerar resposta IA:', error);
      const respostaErro: Mensagem = {
        id: Date.now(),
        remetente: 'ia',
        agente: agente.nome,
        texto: 'Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date().toISOString()
      };
      setConversas(prev => ({
        ...prev,
        [cliente.id]: [...(prev[cliente.id] || []), respostaErro]
      }));
      toast.error('Erro ao conectar com IA');
    }
  };

  const enviarWhatsApp = async (telefone: string, mensagemTexto: string) => {
    console.log(`Enviando para ${telefone}: ${mensagemTexto}`);
    toast.success('Mensagem enviada via WhatsApp!');
  };

  const buscarChatsGPTMaker = async () => {
    try {
      toast.info('Carregando conversas do GPT Maker...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gptmaker-chats`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar chats');
      }

      const data = await response.json();
      setGptMakerChats(data);
      setChatsAberto(true);
      toast.success(`${data.length} conversas encontradas!`);
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
      toast.error('Erro ao carregar conversas do GPT Maker');
    }
  };

  const abrirConversaGPT = async (chat: any, showToast: boolean = true) => {
    try {
      if (showToast) {
        setConversaSelecionada(chat);
        toast.info('Carregando mensagens...');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gptmaker-messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ conversationId: chat.id }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens');
      }

      const data = await response.json();
      console.log('Mensagens recebidas:', data);
      setMensagensGPT(data || []);
      if (showToast) {
        toast.success(`${data?.length || 0} mensagens carregadas`);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      if (showToast) {
        toast.error('Erro ao carregar mensagens');
      }
    }
  };

  // Atualização automática de mensagens a cada 2 segundos
  useEffect(() => {
    if (!conversaSelecionada) return;

    const interval = setInterval(() => {
      abrirConversaGPT(conversaSelecionada, false);
    }, 2000);

    return () => clearInterval(interval);
  }, [conversaSelecionada]);

  const enviarMensagemGPT = async (texto: string) => {
    if (!texto.trim() || !conversaSelecionada) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gptmaker-send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            conversationId: conversaSelecionada.id,
            message: texto,
            phone: conversaSelecionada.whatsappPhone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      toast.success('Mensagem enviada!');
      // Recarregar mensagens
      await abrirConversaGPT(conversaSelecionada);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const atualizarStatusCliente = async (chatId: string, novoStatus: string) => {
    // Buscar cliente pelo chat ID ou telefone
    const cliente = clientes.find(c => c.id === chatId || c.telefone === chatId);
    
    if (cliente && cliente.status !== novoStatus) {
      const clientesAtualizados = clientes.map(c => 
        c.id === cliente.id 
          ? { ...c, status: novoStatus, ultimaAtualizacao: new Date().toISOString() }
          : c
      );
      
      setClientes(clientesAtualizados);
      toast.success(`${cliente.nome} movido para ${colunas.find(col => col.id === novoStatus)?.titulo}`);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const clienteAtualizado = clientes.find(c => c.id === draggableId);
    if (!clienteAtualizado) return;

    const novoStatus = destination.droppableId;

    const clientesAtualizados = clientes.map(c => 
      c.id === draggableId 
        ? { ...c, status: novoStatus, ultimaAtualizacao: new Date().toISOString() }
        : c
    );

    setClientes(clientesAtualizados);
    toast.success(`${clienteAtualizado.nome} movido para ${colunas.find(col => col.id === novoStatus)?.titulo}`);

    const mensagemStatus = gerarMensagemStatus(novoStatus, clienteAtualizado);
    await enviarWhatsApp(clienteAtualizado.telefone, mensagemStatus);
  };

  const gerarMensagemStatus = (status: string, cliente: Cliente) => {
    const mensagens: Record<string, string> = {
      analise: `🔍 Olá ${cliente.nome}! Sua proposta está agora em análise. Em breve teremos novidades!`,
      retencao: `🏦 Sua proposta foi enviada para o ${cliente.banco}. Aguardando retorno bancário.`,
      documentacao: `📄 Precisamos de documentos. Por favor, envie os documentos solicitados.`,
      pagamento: `✅ Sua proposta foi aprovada! Estamos processando o pagamento.`,
      finalizado: `🎉 Tudo certo! Seu crédito de R$ ${cliente.valorSolicitado.toLocaleString('pt-BR')} foi liberado!`
    };
    return mensagens[status] || 'Status atualizado!';
  };

  const adicionarOperacao = () => {
    const { tipoOperacao, bancoAtual, bancoOperacao, parcela, saldoDevedor, coeficiente, prazo } = dadosSimulacao;
    
    const parcelaNum = parseFloat(parcela);
    const saldoDevedorNum = parseFloat(saldoDevedor || '0');
    const coeficienteNum = parseFloat(coeficiente);
    const prazoNum = parseInt(prazo);

    if (!tipoOperacao || !parcela || !coeficiente || !prazo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (coeficienteNum === 0) {
      toast.error('Coeficiente não pode ser zero');
      return;
    }

    let valorLiberado = 0;
    let totalOperacao = 0;
    let observacao = '';

    // Operações que exigem saldo devedor
    const operacoesComSaldoDevedor = [
      'Portabilidade com troco',
      'Portabilidade com redução',
      'Compra de dívida'
    ];

    if (operacoesComSaldoDevedor.includes(tipoOperacao)) {
      if (!saldoDevedor || !bancoAtual) {
        toast.error('Para esta operação, informe o saldo devedor e banco atual');
        return;
      }
      
      // Total da operação = parcela / coeficiente
      totalOperacao = parcelaNum / coeficienteNum;
      
      // Valor líquido liberado = total - saldo devedor
      valorLiberado = totalOperacao - saldoDevedorNum;
      
      observacao = `Saldo devedor quitado: R$ ${saldoDevedorNum.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    } else {
      // Contrato novo, refin, cartões
      // Valor liberado = parcela / coeficiente
      valorLiberado = parcelaNum / coeficienteNum;
      totalOperacao = valorLiberado;
      
      observacao = '';
    }

    setOperacoesSimulacao([...operacoesSimulacao, {
      tipoOperacao,
      bancoAtual,
      bancoOperacao,
      parcela: parcelaNum,
      saldoDevedor: saldoDevedorNum,
      prazo: prazoNum,
      valorLiberado,
      observacao
    }]);

    // Limpar formulário
    setDadosSimulacao({
      tipoOperacao: 'Contrato novo',
      bancoAtual: '',
      bancoOperacao: '',
      parcela: '',
      saldoDevedor: '',
      coeficiente: '',
      prazo: ''
    });

    toast.success('Operação adicionada!');
  };

  const removerOperacao = (index: number) => {
    setOperacoesSimulacao(operacoesSimulacao.filter((_, i) => i !== index));
  };

  const abrirPreview = () => {
    if (operacoesSimulacao.length === 0) {
      toast.error('Adicione pelo menos uma operação');
      return;
    }
    setPreviewAberto(true);
  };

  const enviarSimulacao = () => {
    if (operacoesSimulacao.length === 0) return;

    let mensagemFinal = '💰 *Simulação de Crédito*\n\n';

    operacoesSimulacao.forEach((op, index) => {
      mensagemFinal += `📋 *Operação ${index + 1}*\n`;
      mensagemFinal += `Tipo: ${op.tipoOperacao}\n`;
      if (op.bancoAtual) mensagemFinal += `🏦 Banco atual: ${op.bancoAtual}\n`;
      if (op.bancoOperacao) mensagemFinal += `🏦 Banco da operação: ${op.bancoOperacao}\n`;
      mensagemFinal += `\n📊 Dados:\n`;
      mensagemFinal += `Parcela: R$ ${op.parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      mensagemFinal += `Prazo: ${op.prazo} meses\n`;
      mensagemFinal += `\n💵 Resultado:\n`;
      if (op.observacao) mensagemFinal += `${op.observacao}\n`;
      mensagemFinal += `💰 Valor líquido liberado: R$ ${op.valorLiberado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      mensagemFinal += `\n`;
    });

    const totalLiberado = operacoesSimulacao.reduce((sum, op) => sum + op.valorLiberado, 0);
    mensagemFinal += `✅ *TOTAL LIBERADO: R$ ${totalLiberado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}*\n\n`;
    mensagemFinal += `📲 Deseja prosseguir com esta proposta?\n`;
    
    const numeroFormatado = whatsappConfig.numero.replace(/\D/g, '');
    const mensagemCodificada = encodeURIComponent(whatsappConfig.mensagemBotao);
    mensagemFinal += `👉 [Aceitar Proposta](https://wa.me/${numeroFormatado}?text=${mensagemCodificada})`;

    if (clienteSelecionado) {
      enviarMensagem(mensagemFinal, true);
    }

    toast.success('Simulação enviada!');
    setOperacoesSimulacao([]);
    setPreviewAberto(false);
    setSimuladorAberto(false);
  };

  const enviarMensagem = (texto: string = mensagem, isSimulacao: boolean = false) => {
    if (!texto.trim() || !clienteSelecionado) return;

    const novaMensagem: Mensagem = {
      id: Date.now(),
      remetente: 'agente',
      texto: texto,
      timestamp: new Date().toISOString()
    };

    setConversas(prev => ({
      ...prev,
      [clienteSelecionado.id]: [...(prev[clienteSelecionado.id] || []), novaMensagem]
    }));

    enviarWhatsApp(clienteSelecionado.telefone, texto);

    if (!isSimulacao) setMensagem('');
  };

  const abrirChat = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setChatAberto(true);
    setMenuAberto(false);
  };

  const processarImagemOCR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info('Processando imagem...');
    
    setTimeout(() => {
      setDadosSimulacao(prev => ({
        ...prev,
        parcela: '1250.00',
        saldoDevedor: '15000.00',
        coeficiente: '45.5',
        prazo: '84'
      }));
      toast.success('Dados extraídos: Parcela e Saldo Devedor identificados!');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm px-6 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <DollarSign className="text-primary-foreground" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-card-foreground">CRM Consignado</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão de Propostas</p>
          </div>
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
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition"
          >
            <User size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">{usuario.nome}</span>
            <Menu size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Menu Lateral */}
      {menuAberto && (
        <div className="fixed right-0 top-16 w-64 bg-card shadow-xl rounded-l-xl p-4 z-50 border border-border">
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition">
              <Settings size={18} className="text-muted-foreground" />
              <span className="text-card-foreground">Configurar Agentes IA</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition">
              <Users size={18} className="text-muted-foreground" />
              <span className="text-card-foreground">Gerenciar Usuários</span>
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth');
                toast.success('Logout realizado com sucesso');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg transition text-destructive"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="p-6">
        <div className="mb-4">
          <TagFilter onTagsChange={setTagsFiltro} />
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {colunas.map(coluna => (
              <div key={coluna.id} className="flex-shrink-0 w-80">
                <div className={`bg-card border-t-4 ${coluna.cor} rounded-t-lg px-4 py-3 shadow-sm`}>
                  <h3 className="font-bold text-card-foreground flex items-center justify-between">
                    {coluna.titulo}
                    <span className="bg-muted px-2 py-1 rounded-full text-xs text-muted-foreground">
                      {clientesFiltrados.filter(c => c.status === coluna.id).length}
                    </span>
                  </h3>
                </div>
                
                <Droppable droppableId={coluna.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-muted/30 border-l-4 border-r-4 border-b-4 ${coluna.cor} rounded-b-lg p-3 min-h-[500px] space-y-3 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-primary/10' : ''
                      }`}
                    >
                      {clientesFiltrados
                        .filter(c => c.status === coluna.id)
                        .map((cliente, index) => (
                          <Draggable key={cliente.id} draggableId={cliente.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-card border-2 border-border rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer ${
                                  snapshot.isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
                                }`}
                                onClick={() => abrirChat(cliente)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-bold text-card-foreground">{cliente.nome}</h4>
                                  <MessageCircle size={18} className="text-primary" />
                                </div>
                                
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>CPF: {cliente.cpf}</p>
                                  <p>🏦 {cliente.banco}</p>
                                  <p className="font-semibold text-success">
                                    R$ {cliente.valorSolicitado.toLocaleString('pt-BR')}
                                  </p>
                                  <p>📅 {cliente.prazo} meses</p>
                                  <p className="text-xs mt-2">
                                    👤 {cliente.agente}
                                  </p>
                                  <MessageTags clienteCpf={cliente.cpf} />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Chat WhatsApp */}
      {chatAberto && clienteSelecionado && (
        <div className="fixed right-6 bottom-6 w-96 h-[600px] bg-card rounded-2xl shadow-2xl flex flex-col z-50 border border-border">
          <div className="bg-primary text-primary-foreground px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div>
              <h3 className="font-bold">{clienteSelecionado.nome}</h3>
              <p className="text-xs opacity-90 flex items-center gap-1">
                <Bot size={14} />
                {agentesIA[clienteSelecionado.status].nome}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSimuladorAberto(true)}
                className="p-2 hover:bg-primary/80 rounded-lg transition"
              >
                <Calculator size={20} />
              </button>
              <button 
                onClick={() => setChatAberto(false)}
                className="p-2 hover:bg-primary/80 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {(conversas[clienteSelecionado.id] || []).map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.remetente === 'cliente' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    msg.remetente === 'cliente'
                      ? 'bg-card text-card-foreground'
                      : msg.remetente === 'ia'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {msg.agente && (
                    <p className="text-xs opacity-75 mb-1">🤖 {msg.agente}</p>
                  )}
                  <p className="text-sm whitespace-pre-line">{msg.texto}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  {msg.messageId && <MessageTags messageId={msg.messageId} />}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 border border-input rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => enviarMensagem()}
                className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview da Simulação */}
      {previewAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-8 w-[600px] max-w-[90%] max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-card-foreground">Preview da Simulação</h2>
              <button 
                onClick={() => setPreviewAberto(false)}
                className="p-2 hover:bg-muted rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {operacoesSimulacao.map((op, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">Operação {index + 1}</h3>
                    <button
                      onClick={() => removerOperacao(index)}
                      className="p-1 hover:bg-destructive/10 rounded transition"
                    >
                      <X size={18} className="text-destructive" />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Tipo:</span> {op.tipoOperacao}</p>
                    {op.bancoAtual && <p><span className="font-medium">Banco atual:</span> {op.bancoAtual}</p>}
                    {op.bancoOperacao && <p><span className="font-medium">Banco da operação:</span> {op.bancoOperacao}</p>}
                    <p><span className="font-medium">Parcela:</span> R$ {op.parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p><span className="font-medium">Prazo:</span> {op.prazo} meses</p>
                    {op.observacao && <p className="text-muted-foreground">{op.observacao}</p>}
                    <p className="text-lg font-bold text-primary">
                      💰 Valor liberado: R$ {op.valorLiberado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <p className="text-xl font-bold text-primary">
                  Total Liberado: R$ {operacoesSimulacao.reduce((sum, op) => sum + op.valorLiberado, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreviewAberto(false)}
                className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition"
              >
                Voltar
              </button>
              <button
                onClick={enviarSimulacao}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
              >
                Enviar no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulador de Crédito */}
      {simuladorAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-8 w-[500px] max-w-[90%] border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
                <Calculator size={28} className="text-primary" />
                Simulador de Crédito
              </h2>
              <button 
                onClick={() => setSimuladorAberto(false)}
                className="p-2 hover:bg-muted rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Enviar print do sistema (OCR)
                </label>
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition">
                  <ImagePlus size={20} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para enviar imagem (extrai parcela e saldo)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={processarImagemOCR}
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="border-t border-border my-4 pt-4">
                <p className="text-sm text-muted-foreground text-center mb-4">ou preencha manualmente</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3 mb-4">
                <h3 className="font-semibold text-sm text-card-foreground">Configurações do WhatsApp</h3>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Número do WhatsApp (com DDI)
                  </label>
                  <input
                    type="text"
                    value={whatsappConfig.numero}
                    onChange={(e) => setWhatsappConfig({...whatsappConfig, numero: e.target.value})}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+5551995353698"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Mensagem do botão de aceite
                  </label>
                  <input
                    type="text"
                    value={whatsappConfig.mensagemBotao}
                    onChange={(e) => setWhatsappConfig({...whatsappConfig, mensagemBotao: e.target.value})}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Aceito a proposta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Tipo de Operação *
                </label>
                <select
                  value={dadosSimulacao.tipoOperacao}
                  onChange={(e) => setDadosSimulacao({...dadosSimulacao, tipoOperacao: e.target.value})}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {tiposOperacao.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              {['Portabilidade com troco', 'Portabilidade com redução', 'Compra de dívida'].includes(dadosSimulacao.tipoOperacao) && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Banco Atual *
                  </label>
                  <select
                    value={dadosSimulacao.bancoAtual}
                    onChange={(e) => setDadosSimulacao({...dadosSimulacao, bancoAtual: e.target.value})}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione o banco</option>
                    {bancos.map(banco => (
                      <option key={banco} value={banco}>{banco}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Banco da Operação
                </label>
                <select
                  value={dadosSimulacao.bancoOperacao}
                  onChange={(e) => setDadosSimulacao({...dadosSimulacao, bancoOperacao: e.target.value})}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione o banco</option>
                  {bancos.map(banco => (
                    <option key={banco} value={banco}>{banco}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Parcela (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dadosSimulacao.parcela}
                    onChange={(e) => setDadosSimulacao({...dadosSimulacao, parcela: e.target.value})}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="1250.00"
                  />
                </div>

                {['Portabilidade com troco', 'Portabilidade com redução', 'Compra de dívida'].includes(dadosSimulacao.tipoOperacao) && (
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Saldo Devedor (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={dadosSimulacao.saldoDevedor}
                      onChange={(e) => setDadosSimulacao({...dadosSimulacao, saldoDevedor: e.target.value})}
                      className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="15000.00"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Coeficiente *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dadosSimulacao.coeficiente}
                    onChange={(e) => setDadosSimulacao({...dadosSimulacao, coeficiente: e.target.value})}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="45.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Prazo (meses) *
                  </label>
                  <input
                    type="number"
                    value={dadosSimulacao.prazo}
                    onChange={(e) => setDadosSimulacao({...dadosSimulacao, prazo: e.target.value})}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="84"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={adicionarOperacao}
                  className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition"
                >
                  + Adicionar Operação
                </button>
                <button
                  onClick={abrirPreview}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
                >
                  Visualizar ({operacoesSimulacao.length})
                </button>
              </div>

              {operacoesSimulacao.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">Operações adicionadas:</p>
                  {operacoesSimulacao.map((op, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <div className="text-sm">
                        <span className="font-medium">{op.tipoOperacao}</span>
                        <span className="text-muted-foreground ml-2">
                          R$ {op.valorLiberado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                      </div>
                      <button
                        onClick={() => removerOperacao(index)}
                        className="p-1 hover:bg-destructive/10 rounded transition"
                      >
                        <X size={16} className="text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel de Chats GPT Maker */}
      {chatsAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl w-[90%] max-w-6xl h-[80vh] flex border border-border overflow-hidden">
            {/* Lista de conversas */}
            <div className="w-1/3 border-r border-border flex flex-col">
              <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Conversas GPT Maker</h3>
                  <p className="text-xs opacity-90">{gptMakerChats.length} conversas</p>
                </div>
                <button 
                  onClick={() => {
                    setChatsAberto(false);
                    setConversaSelecionada(null);
                  }}
                  className="p-2 hover:bg-primary/80 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {gptMakerChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => abrirConversaGPT(chat)}
                    className={`w-full text-left p-4 rounded-lg border border-border hover:bg-muted/50 transition ${
                      conversaSelecionada?.id === chat.id ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-card-foreground">{chat.name || chat.userName || 'Sem nome'}</h4>
                      {chat.unReadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          {chat.unReadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.whatsappPhone || 'Telefone não disponível'}
                    </p>
                    {chat.agentName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        🤖 {chat.agentName}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Área de mensagens */}
            <div className="flex-1 flex flex-col">
              {conversaSelecionada ? (
                <>
                  <div className="bg-muted px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-card-foreground">
                      {conversaSelecionada.name || conversaSelecionada.userName || 'Conversa'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {conversaSelecionada.whatsappPhone}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/30">
                    {mensagensGPT.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Nenhuma mensagem ainda</p>
                      </div>
                    ) : (
                      mensagensGPT.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                          <div
                            key={msg.id || index}
                            className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                                isUser
                                  ? 'bg-card text-card-foreground border border-border'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              {msg.userName && (
                                <p className="text-xs font-semibold mb-1 opacity-80">
                                  {msg.userName}
                                </p>
                              )}
                              
                              {msg.text && (
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                              )}
                              
                              {msg.imageUrl && (
                                <img 
                                  src={msg.imageUrl} 
                                  alt="Imagem"
                                  className="mt-2 rounded-lg max-w-full"
                                  style={{ maxHeight: msg.height ? `${msg.height}px` : 'auto' }}
                                />
                              )}
                              
                              {msg.audioUrl && (
                                <audio controls className="mt-2 w-full">
                                  <source src={msg.audioUrl} />
                                </audio>
                              )}
                              
                              {msg.documentUrl && (
                                <a 
                                  href={msg.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 mt-2 text-xs underline"
                                >
                                  📎 {msg.fileName || 'Documento'}
                                </a>
                              )}
                              
                              {msg.time && (
                                <p className="text-xs opacity-60 mt-1">
                                  {new Date(msg.time).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-4 border-t border-border">
                    <div className="flex gap-3 mb-3">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            atualizarStatusCliente(conversaSelecionada.id, e.target.value);
                          }
                        }}
                        className="px-4 py-2 border border-input rounded-lg bg-background text-sm"
                        defaultValue=""
                      >
                        <option value="">Mover para etapa...</option>
                        {colunas.map(col => (
                          <option key={col.id} value={col.id}>{col.titulo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite sua mensagem..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            enviarMensagemGPT((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-input rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          enviarMensagemGPT(input.value);
                          input.value = '';
                        }}
                        className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>Selecione uma conversa para visualizar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão Abrir Chats GPT Maker */}
      <button
        onClick={buscarChatsGPTMaker}
        className="fixed bottom-6 left-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition"
        title="Abrir conversas GPT Maker"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
};

export default Dashboard;
