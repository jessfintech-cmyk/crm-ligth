import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface MessageTagsProps {
  messageId?: string;
  clienteCpf?: string;
}

const MessageTags: React.FC<MessageTagsProps> = ({ messageId, clienteCpf }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarTags = async () => {
      try {
        if (messageId) {
          // Carregar tags de uma mensagem específica
          const { data, error } = await supabase
            .from('message_tags')
            .select('tags(id, nome, cor)')
            .eq('message_id', messageId);

          if (error) {
            console.error('Erro ao carregar tags:', error);
            return;
          }

          if (data) {
            const tagsFormatadas = data
              .filter(item => item.tags)
              .map(item => item.tags as unknown as Tag);
            setTags(tagsFormatadas);
          }
        } else if (clienteCpf) {
          // Carregar todas as tags das mensagens de um cliente
          const { data: mensagens, error: mensagensError } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('cliente_cpf', clienteCpf);

          if (mensagensError || !mensagens) {
            console.error('Erro ao buscar mensagens:', mensagensError);
            return;
          }

          const mensagemIds = mensagens.map(m => m.id);

          if (mensagemIds.length === 0) {
            setTags([]);
            return;
          }

          const { data, error } = await supabase
            .from('message_tags')
            .select('tags(id, nome, cor)')
            .in('message_id', mensagemIds);

          if (error) {
            console.error('Erro ao carregar tags:', error);
            return;
          }

          if (data) {
            // Remover duplicatas
            const tagsUnicas = new Map<string, Tag>();
            data.forEach(item => {
              if (item.tags) {
                const tag = item.tags as unknown as Tag;
                tagsUnicas.set(tag.id, tag);
              }
            });
            setTags(Array.from(tagsUnicas.values()));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar tags:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarTags();

    // Escutar novas tags em tempo real
    const channel = supabase
      .channel('message_tags_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_tags'
        },
        () => {
          carregarTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, clienteCpf]);

  if (loading || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          style={{
            backgroundColor: tag.cor + '20',
            color: tag.cor,
            borderColor: tag.cor
          }}
          className="text-xs px-2 py-0 border"
        >
          {tag.nome}
        </Badge>
      ))}
    </div>
  );
};

export default MessageTags;
