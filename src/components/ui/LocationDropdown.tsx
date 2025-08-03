'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { PersonalLocation } from '../ConfigPage';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import styles from './LocationDropdown.module.scss';
import { motion, AnimatePresence } from 'framer-motion';

export interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationDropdownProps {
  value?: PersonalLocation;
  onChange: (location: PersonalLocation | undefined) => void;
  placeholder?: string;
  label: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({
  value,
  onChange,
  placeholder = "Buscar ubicación...",
  label,
  disabled = false,
  className = "",
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, isLoading: isGoogleLoading, services } = useGoogleMaps();

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

  const handleSearchChange = useCallback(async (query: string) => {
    setSearchTerm(query);
    setSuggestions([]);

    if (!query.trim() || query.length < 3) {
      return;
    }

    if (!isLoaded || !services?.autocompleteService) {
      console.warn('Google Maps Autocomplete service not available');
      return;
    }

    try {
      const request = {
        input: query,
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'mx' },
      };

      services.autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      });
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [isLoaded, services]);

  const handleSuggestionClick = useCallback((suggestion: LocationSuggestion) => {
    if (!isLoaded || !services?.placesService) {
      console.warn('Google Maps Places service not available');
      return;
    }

    const request = {
      placeId: suggestion.place_id,
      fields: ['name', 'formatted_address', 'geometry'],
    };

    services.placesService.getDetails(request, (place: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const location: PersonalLocation = {
          name: label === 'Casa' ? 'Casa' : value?.name || 'Ubicación Secundaria',
          address: place.formatted_address || suggestion.description,
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
          radius: 50,
        };
        onChange(location);
        setSearchTerm(place.formatted_address || suggestion.description);
        setIsOpen(false);
      }
    });
  }, [label, value, onChange, isLoaded, services]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onChange(undefined);
    setSuggestions([]);
    setIsOpen(false);
  }, [onChange]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[0]);
    }
  }, [suggestions, handleSuggestionClick]);

  const getDisplayText = () => {
    if (value) {
      return value.address;
    }
    return placeholder;
  };

  return (
    <div className={`${styles.locationDropdown} ${className}`} ref={wrapperRef}>
      <div className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </div>

      <button
        type="button"
        className={`${styles.selectButton} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className={styles.buttonContent}>
          <span className={styles.selectedText}>{getDisplayText()}</span>
        </div>
        <Image src="/chevron-down.svg" alt="arrow" width={16} height={16} />
      </button>

      {value && (
        <div className={styles.locationInfo}>
          <div className={styles.locationName}>{value.name}</div>
          <div className={styles.locationAddress}>{value.address}</div>
          <div className={styles.locationCoords}>
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              title="Limpiar ubicación"
            >
              ×
            </button>
          )}
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
            <div className={styles.searchContainer}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                className={styles.searchInput}
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {isGoogleLoading && (
                <div className={styles.loadingIndicator}>
                  <div className={styles.spinner}></div>
                </div>
              )}
            </div>
            
            <div className={styles.itemsContainer}>
              {suggestions.length > 0 ? (
                suggestions.map(suggestion => (
                  <div
                    key={suggestion.place_id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={styles.item}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.itemText}>
                        <span className={styles.itemName}>
                          {suggestion.structured_formatting?.main_text || suggestion.description}
                        </span>
                        {suggestion.structured_formatting?.secondary_text && (
                          <span className={styles.itemSubtitle}>
                            {suggestion.structured_formatting.secondary_text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <span>
                    {searchTerm.length < 3 
                      ? "Escribe al menos 3 caracteres para buscar"
                      : "No se encontraron ubicaciones"
                    }
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationDropdown; 