'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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
const RECENT_EMOJIS_KEY = 'recent-emojis';
const MAX_RECENT_EMOJIS = 12;

const CATEGORY_ICONS: Record<string, string> = {
  'Recent': '🕒',
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

// Helper function to get recent emojis from localStorage
const getRecentEmojis = (): Emoji[] => {
  if (typeof window === 'undefined') return [];
  try {
    const recent = localStorage.getItem(RECENT_EMOJIS_KEY);
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

// Helper function to save emoji to recent
const saveRecentEmoji = (emoji: Emoji) => {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentEmojis();
    const filtered = recent.filter(e => e.emoji !== emoji.emoji);
    const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

export function EmojiSelector({ onEmojiSelect, disabled, value, containerRef }: EmojiSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Recent');
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
  const [recentEmojis, setRecentEmojis] = useState<Emoji[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const isInteractingRef = useRef(false);

  // Load recent emojis on mount
  useEffect(() => {
    setRecentEmojis(getRecentEmojis());
  }, []);

  // Initialize category pages
  useEffect(() => {
    const categories = Object.keys(CATEGORY_ICONS).filter((category) => category !== 'Component');
    const initialPages: Record<string, number> = {};
    categories.forEach((category) => {
      initialPages[category] = 0;
    });
    setCategoryPages(initialPages);
  }, []);

  // Update portal position with overflow handling
  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current && containerRef?.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const popoverHeight = 350; // Height with min-height
        const popoverWidth = 320;
        
        // Calculate initial position
        let top = triggerRect.top - containerRect.top - popoverHeight - 8;
        let left = triggerRect.left - containerRect.left + triggerRect.width / 2 - popoverWidth / 2;
        
        // Handle overflow - if it goes above, show below
        if (top < 0) {
          top = triggerRect.bottom - containerRect.top + 8;
        }
        
        // Handle horizontal overflow
        if (left < 0) {
          left = 8;
        } else if (left + popoverWidth > containerRect.width) {
          left = containerRect.width - popoverWidth - 8;
        }
        
        setPortalPosition({ top, left });
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
    if (category === 'Recent') {
      return recentEmojis;
    }
    if (!EMOJI_CATEGORIES[category]) return [];
    const currentPage = categoryPages[category] || 0;
    const startIndex = currentPage * EMOJIS_PER_PAGE;
    const endIndex = startIndex + EMOJIS_PER_PAGE;
    return EMOJI_CATEGORIES[category].slice(startIndex, endIndex);
  };

  // Calculate total pages for a category
  const getTotalPages = (category: string): number => {
    if (category === 'Recent') return 0;
    if (!EMOJI_CATEGORIES[category]) return 0;
    return Math.ceil(EMOJI_CATEGORIES[category].length / EMOJIS_PER_PAGE);
  };

  // Handle page navigation with swipe
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

  // Handle emoji selection with recent emojis
  const handleEmojiSelect = (emoji: Emoji) => {
    onEmojiSelect(emoji.emoji);
    saveRecentEmoji(emoji);
    setRecentEmojis(getRecentEmojis());
    setOpen(false);
  };

  // Handle swipe gestures
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, category: string) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      handlePrevPage(category);
    } else if (info.offset.x < -swipeThreshold) {
      handleNextPage(category);
    }
  };

  // Animation variants
  const popoverVariants = {
    closed: {
      opacity: 0,
      scale: 0.95,
      y: -10,
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
  };

  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  // Portal content
  const portalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.popover}
          ref={portalRef}
          style={{
            top: `${portalPosition.top}px`,
            left: `${portalPosition.left}px`,
          }}
          onMouseEnter={handleMouseEnterPortal}
          onMouseLeave={handleMouseLeave}
          variants={popoverVariants}
          initial="closed"
          animate="open"
          exit="closed"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <div className={styles.tabsList}>
            {Object.keys(CATEGORY_ICONS).map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.tabTrigger} ${activeCategory === category ? styles.active : ''}`}
                onClick={() => setActiveCategory(category)}
                aria-label={category}
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
                {category === 'Recent' && recentEmojis.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No hay emojis recientes</p>
                    <p className={styles.searchHint}>Los emojis que uses aparecerán aquí</p>
                  </div>
                ) : (
                  <motion.div
                    key={`${category}-${categoryPages[category] || 0}`}
                    className={styles.pageContainer}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(event, info) => handleDragEnd(event, info, category)}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <div className={styles.grid}>
                      {getCurrentPageEmojis(category).map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`${styles.emojiButton} ${value === emoji.emoji ? styles.selected : ''}`}
                          onClick={() => handleEmojiSelect(emoji)}
                          title={emoji.name || emoji.emoji}
                          aria-label={emoji.name || emoji.emoji}
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
                  </motion.div>
                )}
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
        </motion.div>
      )}
    </AnimatePresence>
  );

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
          title="Seleccionar emoji"
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
