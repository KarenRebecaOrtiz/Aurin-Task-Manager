'use client';

import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from '../styles/ChatSidebar.module.scss';
import { loadEmojiData, type Emoji, type EmojiCategoryValue, type EmojisByCategory } from './emoji-picker-helper';

interface EmojiSelectorProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

const emojiCategories = {
  'Smileys & Emotion': '😀',
  'People & Body': '🙋',
  Component: '🧩',
  'Animals & Nature': '🐶',
  'Food & Drink': '🍕',
  'Travel & Places': '🗽',
  Activities: '⚽',
  Objects: '💡',
  Symbols: '♻️',
  Flags: '🇺🇳',
} as const;

export function EmojiSelector({ onEmojiSelect, disabled }: EmojiSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emojiData, setEmojiData] = useState<EmojisByCategory>();
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState<string>('😀');
  const [allEmojis, setAllEmojis] = useState<Emoji[]>([]);
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
  const EMOJIS_PER_PAGE = 24;

  useEffect(() => {
    async function loadData() {
      try {
        const data = await loadEmojiData();
        if (!data) throw new Error('Failed to load emoji data');
        setEmojiData(data);

        const categories = Object.keys(data.emojis);
        const initialPages: Record<string, number> = {};
        categories.forEach((category) => {
          initialPages[category] = 0;
        });
        setCategoryPages(initialPages);

        const flatEmojis: Emoji[] = [];
        Object.values(data.emojis).forEach((emojisInCategory) => {
          flatEmojis.push(...emojisInCategory);
        });
        setAllEmojis(flatEmojis);
        setLoading(false);
      } catch (error) {
        console.error('[EmojiSelector] Error loading emoji data:', error);
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return [];
    return allEmojis.filter(
      (emoji) =>
        emoji.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emoji.emoji.includes(searchQuery),
    );
  }, [allEmojis, searchQuery]);

  const getCurrentPageEmojis = (category: string): Emoji[] => {
    const _category = category as EmojiCategoryValue;
    if (!emojiData?.emojis[_category]) return [];
    const currentPage = categoryPages[category] || 0;
    const startIndex = currentPage * EMOJIS_PER_PAGE;
    const endIndex = startIndex + EMOJIS_PER_PAGE;
    return emojiData.emojis[_category].slice(startIndex, endIndex);
  };

  const getTotalPages = (category: string): number => {
    const _category = category as EmojiCategoryValue;
    if (!emojiData?.emojis[_category]) return 0;
    return Math.ceil(emojiData.emojis[_category].length / EMOJIS_PER_PAGE);
  };

  const handleNextPage = (category: string) => {
    const totalPages = getTotalPages(category);
    const currentPage = categoryPages[category] || 0;
    if (currentPage < totalPages - 1) {
      setCategoryPages({ ...categoryPages, [category]: currentPage + 1 });
    }
  };

  const handlePrevPage = (category: string) => {
    const currentPage = categoryPages[category] || 0;
    if (currentPage > 0) {
      setCategoryPages({ ...categoryPages, [category]: currentPage - 1 });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={styles.imageButton}
          disabled={disabled}
          aria-label="Seleccionar emoji"
        >
          <Smile size={16} className={styles.iconInvert} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={`${styles.deletePopup} w-[320px] p-0`}
        align="end"
        sideOffset={8}
      >
        <Command>
          <CommandInput
            placeholder="Buscar emojis..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className={styles.input}
          />
          <CommandList className="max-h-[350px]">
            {loading ? (
              <div className="flex items-center justify-center p-4">Cargando emojis...</div>
            ) : searchQuery ? (
              <>
                {filteredEmojis.length === 0 ? (
                  <CommandEmpty>No se encontraron emojis.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    <div className="grid grid-cols-6 items-center gap-1 p-2">
                      {filteredEmojis.slice(0, 24).map((emoji) => (
                        <div
                          key={emoji.emoji}
                          role="button"
                          title={emoji.name}
                          onClick={() => {
                            onEmojiSelect(emoji.emoji);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex h-12 w-12 cursor-pointer items-center justify-center rounded',
                            'hover:bg-[#e2e8f0] dark:hover:bg-[#2c2c2f]',
                            'relative text-2xl',
                          )}
                        >
                          {emoji.emoji}
                        </div>
                      ))}
                    </div>
                    {filteredEmojis.length > 24 && (
                      <div className="text-gray-500 dark:text-gray-400 flex items-center justify-center p-2 text-sm">
                        Mostrando primeros 24 resultados.
                      </div>
                    )}
                  </CommandGroup>
                )}
              </>
            ) : (
              <Tabs
                defaultValue={currentCategory}
                onValueChange={setCurrentCategory}
                className="w-full"
              >
                <TabsList className="flex h-auto w-full justify-between px-1 py-1 bg-[#f1f5f9] dark:bg-[#1f1f20]">
                  {Object.keys(emojiData?.emojis ?? {}).map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="flex h-10 w-10 items-center justify-center px-1 py-1 text-2xl data-[state=active]:bg-[#e2e8f0] dark:data-[state=active]:bg-[#2c2c2f]"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.keys(emojiData?.emojis ?? {}).map((category) => (
                  <TabsContent key={category} value={category} className="m-0">
                    <CommandGroup>
                      <div className="grid grid-cols-6 gap-1 p-2">
                        {getCurrentPageEmojis(category).map((emoji) => (
                          <div
                            key={emoji.emoji}
                            role="button"
                            title={emoji.name}
                            onClick={() => {
                              onEmojiSelect(emoji.emoji);
                              setOpen(false);
                            }}
                            className={cn(
                              'flex h-12 w-12 cursor-pointer items-center justify-center rounded',
                              'hover:bg-[#e2e8f0] dark:hover:bg-[#2c2c2f]',
                              'relative text-2xl',
                            )}
                          >
                            {emoji.emoji}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t p-2">
                        <button
                          onClick={() => handlePrevPage(category)}
                          disabled={categoryPages[category] === 0}
                          className="hover:bg-[#e2e8f0] dark:hover:bg-[#2c2c2f] rounded-md p-1 disabled:opacity-50"
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          Página {(categoryPages[category] || 0) + 1} de {getTotalPages(category)}
                        </span>
                        <button
                          onClick={() => handleNextPage(category)}
                          disabled={(categoryPages[category] || 0) >= getTotalPages(category) - 1}
                          className="hover:bg-[#e2e8f0] dark:hover:bg-[#2c2c2f] rounded-md p-1 disabled:opacity-50"
                          aria-label="Página siguiente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </CommandGroup>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
