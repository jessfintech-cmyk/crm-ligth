import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface TagFilterProps {
  onTagsChange: (tagIds: string[]) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ onTagsChange }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const carregarTags = async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao carregar tags:', error);
        return;
      }

      if (data) {
        setTags(data);
      }
    };

    carregarTags();
  }, []);

  const toggleTag = (tagId: string) => {
    const newSelected = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    setSelectedTags(newSelected);
    onTagsChange(newSelected);
  };

  const limparFiltros = () => {
    setSelectedTags([]);
    onTagsChange([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
          selectedTags.length > 0
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-card-foreground border-border hover:bg-muted'
        }`}
      >
        <Filter size={18} />
        <span className="font-medium">Filtrar por Tags</span>
        {selectedTags.length > 0 && (
          <span className="bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-bold">
            {selectedTags.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-card-foreground">Filtrar por Tags</h3>
              {selectedTags.length > 0 && (
                <button
                  onClick={limparFiltros}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X size={14} />
                  Limpar
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    style={{
                      backgroundColor: isSelected ? tag.cor : 'transparent',
                      color: isSelected ? '#fff' : tag.cor,
                      borderColor: tag.cor,
                      cursor: 'pointer'
                    }}
                    className="px-3 py-1.5 text-sm border-2 hover:opacity-80 transition"
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.nome}
                  </Badge>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TagFilter;
