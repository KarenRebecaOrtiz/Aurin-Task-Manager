'use client';

import { useRef, useEffect } from 'react';
import { PersonalLocation } from '../ConfigPage';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import styles from './LocationMap.module.scss';

interface LocationMapProps {
  location: PersonalLocation;
}

const LocationMap: React.FC<LocationMapProps> = ({ location }) => {
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
      zoom: 16,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      gestureHandling: 'none',
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
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
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    markerInstance.current = marker;

    // Crear el círculo del radio
    const circle = new window.google.maps.Circle({
      strokeColor: '#3b82f6',
      strokeOpacity: 0.4,
      strokeWeight: 3,
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      map: map,
      center: { lat: location.lat, lng: location.lng },
      radius: location.radius
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

export default LocationMap;
