import React, { useEffect, useRef, useState } from 'react';

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className, style }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_PLACES_KEY;
    console.log('Google Places API Key present:', !!apiKey, apiKey ? apiKey.slice(0,8)+'...' : 'MISSING');
    if (!apiKey) return;

    // Load Google Maps script if not already loaded
    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      // Script already loading, wait for it
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          setLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => { console.log('Google Maps script loaded'); setLoaded(true); };
    script.onerror = (e) => console.error('Google Maps script failed to load', e);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    console.log('Autocomplete effect, loaded:', loaded, 'input:', !!inputRef.current);
    if (!loaded || !inputRef.current) return;
    console.log('Initializing autocomplete...');
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.address_components) return;

      let streetNumber = '', route = '', city = '', state = '', zip = '';
      for (const comp of place.address_components) {
        const type = comp.types[0];
        if (type === 'street_number') streetNumber = comp.long_name;
        if (type === 'route') route = comp.long_name;
        if (type === 'locality') city = comp.long_name;
        if (type === 'administrative_area_level_1') state = comp.short_name;
        if (type === 'postal_code') zip = comp.long_name;
      }

      const street = [streetNumber, route].filter(Boolean).join(' ');
      if (onSelect) onSelect({ street, city, state, zip });
      if (onChange) onChange(street);
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [loaded]);

  return (
    <input
      ref={inputRef}
      className={className || 'form-input'}
      style={style}
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder || 'Start typing an address...'}
      autoComplete="off"
    />
  );
}
