import { useState, useEffect, useRef, useCallback } from 'react';
import { Restaurant } from '../types';

interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Restaurant[];
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  isSearchClosing: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  closeSearch: () => void;
  handleSearchSelect: (restaurant: Restaurant, mapInstance: google.maps.Map | null, onSelect: (r: Restaurant) => void) => void;
}

export function useSearch(restaurants: Restaurant[]): UseSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter results based on query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const results = restaurants.filter(r =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.address.toLowerCase().includes(lowerQuery)
      );
      setSearchResults(results);
    }
  }, [searchQuery, restaurants]);

  // Auto-focus search input when activated
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchFocused]);

  const closeSearch = useCallback(() => {
    if (!isSearchFocused && !searchQuery) return;
    setIsSearchClosing(true);
    setTimeout(() => {
      setSearchQuery('');
      setIsSearchFocused(false);
      setIsSearchClosing(false);
    }, 150);
  }, [isSearchFocused, searchQuery]);

  const handleSearchSelect = useCallback((
    restaurant: Restaurant,
    mapInstance: google.maps.Map | null,
    onSelect: (r: Restaurant) => void
  ) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);

    if (mapInstance) {
      mapInstance.setCenter(restaurant.location);
      mapInstance.setZoom(16);
    }

    onSelect(restaurant);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchFocused,
    setIsSearchFocused,
    isSearchClosing,
    searchInputRef,
    closeSearch,
    handleSearchSelect
  };
}
