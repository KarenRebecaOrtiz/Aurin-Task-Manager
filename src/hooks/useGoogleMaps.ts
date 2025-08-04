import { useState, useEffect, useRef } from 'react';

interface GoogleMapsServices {
  autocompleteService: google.maps.places.AutocompleteService;
  placesService: google.maps.places.PlacesService;
}

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const servicesRef = useRef<GoogleMapsServices | null>(null);

  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      // Si ya está cargado, no hacer nada
      if (isLoaded && servicesRef.current) {
        return;
      }

      // Si ya está cargando, esperar
      if (isLoading) {
        return;
      }

      // Si ya existe window.google, inicializar servicios
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        try {
          const autocompleteService = new window.google.maps.places.AutocompleteService();
          const placesDiv = document.createElement('div');
          placesDiv.style.display = 'none';
          document.body.appendChild(placesDiv);
          const placesService = new window.google.maps.places.PlacesService(placesDiv);
          
          servicesRef.current = {
            autocompleteService,
            placesService,
          };
          setIsLoaded(true);
          return;
        } catch (error) {
          console.error('Error initializing Google Maps services:', error);
        }
      }

      if (typeof window !== 'undefined' && !window.google) {
        setIsLoading(true);
        
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          // Esperar a que el script existente termine de cargar
          const checkGoogle = () => {
            if (window.google && window.google.maps) {
              try {
                const autocompleteService = new window.google.maps.places.AutocompleteService();
                const placesDiv = document.createElement('div');
                placesDiv.style.display = 'none';
                document.body.appendChild(placesDiv);
                const placesService = new window.google.maps.places.PlacesService(placesDiv);
                
                servicesRef.current = {
                  autocompleteService,
                  placesService,
                };
                setIsLoaded(true);
                setIsLoading(false);
              } catch (error) {
                console.error('Error initializing Google Maps services:', error);
                setIsLoading(false);
              }
            } else {
              setTimeout(checkGoogle, 100);
            }
          };
          checkGoogle();
          return;
        }

        // Crear y cargar el script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          if (window.google && window.google.maps) {
            try {
              const autocompleteService = new window.google.maps.places.AutocompleteService();
              const placesDiv = document.createElement('div');
              placesDiv.style.display = 'none';
              document.body.appendChild(placesDiv);
              const placesService = new window.google.maps.places.PlacesService(placesDiv);
              
              servicesRef.current = {
                autocompleteService,
                placesService,
              };
              setIsLoaded(true);
            } catch (error) {
              console.error('Error initializing Google Maps services:', error);
            }
          }
          setIsLoading(false);
        };
        
        script.onerror = () => {
          console.error('Failed to load Google Maps script');
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
      }
    };

    loadGoogleMapsAPI();
  }, [isLoaded, isLoading]);

  return {
    isLoaded,
    isLoading,
    services: servicesRef.current,
  };
}; 