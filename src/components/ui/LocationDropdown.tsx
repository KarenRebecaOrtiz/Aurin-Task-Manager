'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { PersonalLocation } from '../ConfigPage';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import styles from './LocationDropdown.module.scss';
import { motion, AnimatePresence } from 'framer-motion';

// Componente del mapa
const LocationMap: React.FC<{ location: PersonalLocation }> = ({ location }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const circleInstance = useRef<google.maps.Circle | null>(null);
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google) return;

    // Crear el mapa
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: location.lat, lng: location.lng },
      zoom: 16, // Aumentado para mejor vista
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      gestureHandling: 'none', // Deshabilita el zoom con gestos
      draggable: false, // Deshabilita el arrastre del mapa
      scrollwheel: false, // Deshabilita el zoom con scroll
      disableDoubleClickZoom: true, // Deshabilita el zoom con doble clic
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    mapInstance.current = map;

    // Crear el marcador
    const marker = new window.google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: map,
      title: location.name,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, // Aumentado para mejor visibilidad
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3 // Aumentado para mejor visibilidad
      }
    });

    markerInstance.current = marker;

    // Crear el círculo del radio
    const circle = new window.google.maps.Circle({
      strokeColor: '#3b82f6',
      strokeOpacity: 0.4, // Aumentado para mejor visibilidad
      strokeWeight: 3, // Aumentado para mejor visibilidad
      fillColor: '#3b82f6',
      fillOpacity: 0.15, // Aumentado para mejor visibilidad
      map: map,
      center: { lat: location.lat, lng: location.lng },
      radius: location.radius // 50 metros
    });

    circleInstance.current = circle;

    return () => {
      if (markerInstance.current) {
        markerInstance.current.setMap(null);
      }
      if (circleInstance.current) {
        circleInstance.current.setMap(null);
      }
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, [location, isLoaded]);

  return (
    <div className={styles.mapContainer}>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
};

export interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

// Type guard para convertir QueryAutocompletePrediction a LocationSuggestion
const convertToLocationSuggestion = (prediction: google.maps.places.QueryAutocompletePrediction): LocationSuggestion => ({
  place_id: prediction.place_id || '',
  description: prediction.description,
  structured_formatting: undefined
});

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
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

      services.autocompleteService.getPlacePredictions(request, (predictions: google.maps.places.QueryAutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.map(convertToLocationSuggestion));
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

    services.placesService.getDetails(request, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
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



  const handleEditName = useCallback(() => {
    if (value && label !== 'Casa') {
      setIsEditingName(true);
      setEditingName(value.name);
    }
  }, [value, label]);

  const handleSaveName = useCallback(() => {
    if (value && editingName.trim()) {
      const updatedLocation = {
        ...value,
        name: editingName.trim()
      };
      onChange(updatedLocation);
      setIsEditingName(false);
      setEditingName('');
    }
  }, [value, editingName, onChange]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingName(false);
    setEditingName('');
  }, []);

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
        {label === 'Casa' && (
          <Image src="/house.svg" alt="Casa" width={16} height={16} className={styles.labelIcon} />
        )}
        {label === 'Ubicación Secundaria' && (
          <Image src="/map-pin-plus-inside.svg" alt="Ubicación" width={16} height={16} className={styles.labelIcon} />
        )}
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
          {isEditingName ? (
            <div className={styles.nameEditContainer}>
              <input
                ref={nameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className={styles.nameInput}
                placeholder="Nombre de la ubicación"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveName();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                onBlur={handleSaveName}
                autoFocus
              />
            </div>
          ) : (
            <div className={styles.locationNameContainer}>
              <div className={styles.locationName}>{value.name}</div>
              {!disabled && label !== 'Casa' && (
                <button
                  type="button"
                  onClick={handleEditName}
                  className={styles.editNameButton}
                  title="Editar nombre"
                >
                  <Image src="/pencil.svg" alt="Editar" width={12} height={12} />
                </button>
              )}
            </div>
          )}
          <div className={styles.locationAddress}>{value.address}</div>
          <div className={styles.locationCoords}>
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </div>
          <LocationMap location={value} />
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