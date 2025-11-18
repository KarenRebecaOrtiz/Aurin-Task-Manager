"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { dropdownAnimations } from "@/modules/shared/components/molecules/Dropdown/animations";
import styles from "./crystal-searchable-dropdown.module.scss";

export interface CrystalDropdownItem {
  id: string;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  disabled?: boolean;
  svgIcon?: string;
}

export interface CrystalSearchableDropdownProps {
  items: CrystalDropdownItem[];
  selectedItems?: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
  error?: string;
}

const CrystalSearchableDropdown = React.forwardRef<HTMLDivElement, CrystalSearchableDropdownProps>(
  (
    {
      items,
      selectedItems = [],
      onSelectionChange,
      label,
      placeholder = "Seleccionar...",
      searchPlaceholder = "Buscar...",
      disabled = false,
      multiple = false,
      maxItems,
      emptyMessage = "No hay elementos disponibles",
      className = "",
      error,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const generatedId = React.useId();

    const selectedItemsData = items.filter((item) => selectedItems.includes(item.id));
    const hasSelection = selectedItems.length > 0;

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm("");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    React.useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen]);

    const filteredItems = items.filter(
      (item) =>
        !item.disabled &&
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const handleItemClick = React.useCallback(
      (itemId: string) => {
        if (multiple) {
          const isSelected = selectedItems.includes(itemId);
          let newSelection: string[];

          if (isSelected) {
            newSelection = selectedItems.filter((id) => id !== itemId);
          } else {
            if (maxItems && selectedItems.length >= maxItems) {
              return;
            }
            newSelection = [...selectedItems, itemId];
          }

          onSelectionChange(newSelection);
        } else {
          onSelectionChange([itemId]);
          setIsOpen(false);
          setSearchTerm("");
        }
      },
      [multiple, selectedItems, onSelectionChange, maxItems]
    );

    const handleRemoveItem = React.useCallback(
      (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelection = selectedItems.filter((id) => id !== itemId);
        onSelectionChange(newSelection);
      },
      [selectedItems, onSelectionChange]
    );

    const handleSearchKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
          setIsOpen(false);
          setSearchTerm("");
        } else if (e.key === "Enter" && filteredItems.length > 0) {
          e.preventDefault();
          handleItemClick(filteredItems[0].id);
        }
      },
      [filteredItems, handleItemClick]
    );

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

    return (
      <div className={`${styles.container} ${className}`} ref={ref}>
        {label && (
          <label htmlFor={generatedId} className={styles.label}>
            {label}
          </label>
        )}

        <div className={styles.dropdownWrapper} ref={wrapperRef}>
          <button
            id={generatedId}
            type="button"
            className={`${styles.trigger} ${error ? styles.error : ''}`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <div className={styles.triggerContent}>
              {hasSelection && !multiple && selectedItemsData[0]?.imageUrl && (
                <Image
                  src={selectedItemsData[0].imageUrl}
                  alt={selectedItemsData[0].name}
                  width={24}
                  height={24}
                  className="rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = "/empty-image.png";
                  }}
                />
              )}
              {hasSelection && !multiple && selectedItemsData[0]?.svgIcon && (
                <div
                  className="w-6 h-6"
                  dangerouslySetInnerHTML={{ __html: selectedItemsData[0].svgIcon }}
                />
              )}
              <span className={`${styles.triggerText} ${!hasSelection ? styles.placeholder : ''}`}>
                {getDisplayText()}
              </span>
            </div>
            <Image
              src="/chevron-down.svg"
              alt="arrow"
              width={16}
              height={16}
              className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
            />
          </button>

          {hasSelection && multiple && (
            <div className={styles.selectedTags}>
              {selectedItemsData.map((item) => (
                <div key={item.id} className={styles.tag}>
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={16}
                      height={16}
                      className={styles.tagImage}
                      onError={(e) => {
                        e.currentTarget.src = "/empty-image.png";
                      }}
                    />
                  )}
                  {item.svgIcon && (
                    <div className={styles.tagSvg} dangerouslySetInnerHTML={{ __html: item.svgIcon }} />
                  )}
                  <span className={styles.tagText}>{item.name}</span>
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={(e) => handleRemoveItem(item.id, e)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {isOpen && (
              <motion.div {...dropdownAnimations.menu} className={styles.menu} role="listbox">
                <div className={styles.searchContainer}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>

                <div className={styles.itemsContainer}>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => {
                      const isSelected = selectedItems.includes(item.id);
                      return (
                        <motion.div
                          key={item.id}
                          {...dropdownAnimations.item(idx)}
                          onClick={() => handleItemClick(item.id)}
                          className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                          role="option"
                          aria-selected={isSelected}
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
                                  e.currentTarget.src = "/empty-image.png";
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
                          </div>
                        </motion.div>
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

        {error && (
          <span className={styles.errorText} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
CrystalSearchableDropdown.displayName = "CrystalSearchableDropdown";

export { CrystalSearchableDropdown };
