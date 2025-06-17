'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './EmojiSelector.module.scss';
import emojiData from 'public/emojis-by-category.json';

interface EmojiSelectorProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  value?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

interface Emoji {
  code: string[];
  emoji: string;
  name: string;
}

interface EmojiCategory {
  [category: string]: Emoji[];
}

const EMOJI_CATEGORIES: EmojiCategory = emojiData.emojis;
const EMOJIS_PER_PAGE = 24; // 6 columns × 4 rows
const CATEGORY_ICONS: Record<string, string> = {
  'Smileys & Emotion': '😀',
  'People & Body': '👋',
  'Animals & Nature': '🐵',
  'Food & Drink': '🍇',
  'Travel & Places': '🌍',
  Activities: '🎃',
  Objects: '👓',
  Symbols: '🏧',
  Flags: '🏁',
};

export function EmojiSelector({ onEmojiSelect, disabled, value, containerRef }: EmojiSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Smileys & Emotion');
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const isInteractingRef = useRef(false);

  useEffect(() => {
    console.log('[EmojiSelector] containerRef:', containerRef?.current);
  }, [containerRef]);

  // Initialize category pages
  useEffect(() => {
    const categories = Object.keys(EMOJI_CATEGORIES).filter((category) => category !== 'Component');
    const initialPages: Record<string, number> = {};
    categories.forEach((category) => {
      initialPages[category] = 0;
    });
    setCategoryPages(initialPages);
  }, []);

  // Update portal position
  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current && containerRef?.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const popoverHeight = 320; // Height after removing search input
        setPortalPosition({
          top: triggerRect.top - containerRect.top - popoverHeight - 8,
          left: triggerRect.left - containerRect.left + triggerRect.width / 2 - 160,
        });
      } else {
        console.warn('[EmojiSelector] containerRef or triggerRef not available, using default position');
        setPortalPosition({ top: 0, left: 0 });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [containerRef, open]);

  // Handle hover and interaction states
  const handleMouseEnterTrigger = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleMouseEnterPortal = () => {
    isInteractingRef.current = true;
  };

  const handleMouseLeave = () => {
    isInteractingRef.current = false;
    setTimeout(() => {
      if (!isInteractingRef.current && !portalRef.current?.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 100);
  };

  // Get current page emojis for a category
  const getCurrentPageEmojis = (category: string): Emoji[] => {
    if (!EMOJI_CATEGORIES[category]) return [];
    const currentPage = categoryPages[category] || 0;
    const startIndex = currentPage * EMOJIS_PER_PAGE;
    const endIndex = startIndex + EMOJIS_PER_PAGE;
    return EMOJI_CATEGORIES[category].slice(startIndex, endIndex);
  };

  // Calculate total pages for a category
  const getTotalPages = (category: string): number => {
    if (!EMOJI_CATEGORIES[category]) return 0;
    return Math.ceil(EMOJI_CATEGORIES[category].length / EMOJIS_PER_PAGE);
  };

  // Handle page navigation
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

  // Portal content
  const portalContent = open ? (
    <div
      className={`${styles.popover} ${open ? styles.popoverOpen : styles.popoverClosed}`}
      ref={portalRef}
      style={{
        top: `${portalPosition.top}px`,
        left: `${portalPosition.left}px`,
      }}
      onMouseEnter={handleMouseEnterPortal}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.tabsList}>
        {Object.keys(CATEGORY_ICONS).map((category) => (
          <button
            key={category}
            type="button"
            className={`${styles.tabTrigger} ${activeCategory === category ? styles.active : ''}`}
            onClick={() => setActiveCategory(category)}
            aria-label={`Seleccionar categoría ${category}`}
          >
            {CATEGORY_ICONS[category] || '❓'}
          </button>
        ))}
      </div>
      <div className={styles.emojiContainer}>
        {Object.keys(CATEGORY_ICONS).map((category) => (
          <div
            key={category}
            className={`${styles.categorySection} ${activeCategory === category ? styles.active : ''}`}
          >
            <div className={styles.grid}>
              {getCurrentPageEmojis(category).map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.emojiButton} ${value === emoji.emoji ? styles.selected : ''}`}
                  onClick={() => {
                    onEmojiSelect(emoji.emoji);
                    setOpen(false);
                  }}
                  title={emoji.name}
                  aria-label={`Seleccionar emoji ${emoji.name}`}
                >
                  <span className={styles.emoji}>{emoji.emoji}</span>
                  {value === emoji.emoji && (
                    <Image
                      src="/icons/check.svg"
                      alt="Seleccionado"
                      width={12}
                      height={12}
                      className={styles.checkIcon}
                    />
                  )}
                </button>
              ))}
            </div>
            {getTotalPages(category) > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  onClick={() => handlePrevPage(category)}
                  disabled={categoryPages[category] === 0}
                  className={styles.paginationButton}
                  aria-label="Página anterior"
                >
                  <Image
                    src="/chevron-left.svg"
                    alt="Anterior"
                    width={16}
                    height={16}
                    className={styles.paginationIcon}
                  />
                </button>
                <span className={styles.pageInfo}>
                  Página {(categoryPages[category] || 0) + 1} de {getTotalPages(category)}
                </span>
                <button
                  type="button"
                  onClick={() => handleNextPage(category)}
                  disabled={categoryPages[category] >= getTotalPages(category) - 1}
                  className={styles.paginationButton}
                  aria-label="Página siguiente"
                >
                  <Image
                    src="/chevron-right.svg"
                    alt="Siguiente"
                    width={16}
                    height={16}
                    className={styles.paginationIcon}
                  />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={styles.container}>
        <button
          type="button"
          style={{ border: 'transparent' }}
          className={styles.button}
          disabled={disabled}
          aria-label="Seleccionar emoji"
          aria-expanded={open}
          ref={triggerRef}
          onMouseEnter={handleMouseEnterTrigger}
          onMouseLeave={handleMouseLeave}
        >
          <Image
            src="/smile-plus.svg"
            alt="Emoji"
            width={16}
            height={16}
            className={styles.iconInvert}
          />
        </button>
      </div>
      {containerRef?.current ? (
        createPortal(portalContent, containerRef.current)
      ) : (
        createPortal(portalContent, document.body)
      )}
    </>
  );
}
