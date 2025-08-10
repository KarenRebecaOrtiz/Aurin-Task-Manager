'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './TagDropdown.module.scss';
import { motion, AnimatePresence } from 'framer-motion';

export interface TagItem {
  id: string;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  disabled?: boolean;
  svgIcon?: string;
  type: 'user' | 'ai'; // Nuevo para diferenciar usuarios de IA
}

interface TagDropdownProps {
  items: TagItem[];
  selectedItems?: string[];
  onSelectionChange: (selected: {id: string, type: 'user' | 'ai'}[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
  isOpenDefault?: boolean;
  hideSearch?: boolean;
  containerClassName?: string;
  mentionType?: 'user' | 'ai'; // Filtrar por tipo específico
}

const TagDropdown: React.FC<TagDropdownProps> = ({
  items,
  selectedItems = [],
  onSelectionChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  multiple = false,
  maxItems,
  emptyMessage = "No hay elementos disponibles",
  className = "",
  isOpenDefault = false,
  hideSearch = false,
  containerClassName = "",
  mentionType,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItemsData = items.filter(item => selectedItems.includes(item.id));
  const hasSelection = selectedItems.length > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredItems = items.filter(item =>
    // Filtrar por tipo si se especifica
    (mentionType ? item.type === mentionType : true) &&
    !item.disabled && (
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const handleItemClick = useCallback((itemId: string, itemType: 'user' | 'ai') => {
    if (multiple) {
      const isSelected = selectedItems.includes(itemId);
      let newSelection: string[];
      
      if (isSelected) {
        newSelection = selectedItems.filter(id => id !== itemId);
      } else {
        if (maxItems && selectedItems.length >= maxItems) {
          return; // Don't add more items if max reached
        }
        newSelection = [...selectedItems, itemId];
      }
      
      // Convertir IDs a objetos con tipo para onSelectionChange
      const selectedWithTypes = newSelection.map(id => {
        const item = items.find(i => i.id === id);
        return { id, type: item?.type || 'user' };
      });
      
      onSelectionChange(selectedWithTypes);
    } else {
      onSelectionChange([{id: itemId, type: itemType}]);
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [multiple, selectedItems, onSelectionChange, maxItems, items]);

  const handleRemoveItem = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = selectedItems.filter(id => id !== itemId);
    
    // Convertir IDs a objetos con tipo para onSelectionChange
    const selectedWithTypes = newSelection.map(id => {
      const item = items.find(i => i.id === id);
      return { id, type: item?.type || 'user' };
    });
    
    onSelectionChange(selectedWithTypes);
  }, [selectedItems, onSelectionChange, items]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredItems.length > 0) {
      e.preventDefault();
      const firstItem = filteredItems[0];
      handleItemClick(firstItem.id, firstItem.type);
    }
  }, [filteredItems, handleItemClick]);

  const getDisplayText = () => {
    if (!hasSelection) return placeholder;
    
    if (multiple) {
      if (selectedItemsData.length === 1) {
        return selectedItemsData[0].name;
      } else if (selectedItemsData.length > 1) {
        return `${selectedItemsData.length} elementos seleccionados`;
      }
    } else {
      return selectedItemsData[0]?.name || placeholder;
    }
    
    return placeholder;
  };

  const getTypeBadge = (type: 'user' | 'ai') => {
    if (type === 'ai') {
      return (
        <div className={styles.aiBadge}>
          <span>AI</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${styles.tagDropdown} ${className} ${containerClassName}`} ref={wrapperRef}>
      {!isOpenDefault && (
        <button
          type="button"
          className={`${styles.selectButton} ${disabled ? styles.disabled : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <div className={styles.buttonContent}>
            {hasSelection && !multiple && selectedItemsData[0]?.imageUrl && (
              <Image
                src={selectedItemsData[0].imageUrl}
                alt={selectedItemsData[0].name}
                width={24}
                height={24}
                className={styles.selectedImage}
                onError={(e) => {
                  e.currentTarget.src = '/empty-image.png';
                }}
              />
            )}
            {hasSelection && !multiple && selectedItemsData[0]?.svgIcon && (
              <div 
                className={styles.selectedSvg}
                dangerouslySetInnerHTML={{ __html: selectedItemsData[0].svgIcon }}
              />
            )}
            <span className={styles.selectedText}>{getDisplayText()}</span>
            {hasSelection && !multiple && selectedItemsData[0]?.type && (
              getTypeBadge(selectedItemsData[0].type)
            )}
          </div>
          <Image src="/chevron-down.svg" alt="arrow" width={16} height={16} />
        </button>
      )}
      
      {hasSelection && multiple && (
        <div className={styles.selectedTags}>
          {selectedItemsData.map(item => (
            <div key={item.id} className={styles.tag}>
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={16}
                  height={16}
                  className={styles.tagImage}
                  onError={(e) => {
                    e.currentTarget.src = '/empty-image.png';
                  }}
                />
              )}
              {item.svgIcon && (
                <div 
                  className={styles.tagSvg}
                  dangerouslySetInnerHTML={{ __html: item.svgIcon }}
                />
              )}
              <span className={styles.tagText}>{item.name}</span>
              {getTypeBadge(item.type)}
              <button
                type="button"
                className={styles.tagRemove}
                onClick={(e) => handleRemoveItem(item.id, e)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={styles.dropdown}
          >
            {!hideSearch && (
              <div className={styles.searchContainer}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            )}
            
            <div className={styles.itemsContainer}>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item.id, item.type)}
                      className={`${styles.item} ${isSelected || (!hasSelection && idx === 0) ? styles.selected : ''} ${item.disabled ? styles.disabled : ''}`}
                    >
                      <div className={styles.itemContent}>
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={32}
                            height={32}
                            className={styles.itemImage}
                            onError={(e) => {
                              e.currentTarget.src = '/empty-image.png';
                            }}
                          />
                        )}
                        {item.svgIcon && (
                          <div 
                            className={styles.itemSvg}
                            dangerouslySetInnerHTML={{ __html: item.svgIcon }}
                          />
                        )}
                        <div className={styles.itemText}>
                          <span className={styles.itemName}>{item.name}</span>
                          {item.subtitle && (
                            <span className={styles.itemSubtitle}>{item.subtitle}</span>
                          )}
                        </div>
                        {getTypeBadge(item.type)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <span>{emptyMessage}</span>
                </div>
              )}
            </div>
            
            {maxItems && selectedItems.length >= maxItems && (
              <div className={styles.maxItemsWarning}>
                Máximo {maxItems} elementos permitidos
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TagDropdown;
