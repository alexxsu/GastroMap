import { useState, useMemo, useCallback } from 'react';
import { Restaurant } from '../types';
import { calculateAverageGrade, GRADES } from '../utils/rating';

interface UseFilterReturn {
  selectedGrades: string[];
  isFilterOpen: boolean;
  isFilterClosing: boolean;
  filteredRestaurants: Restaurant[];
  toggleGradeFilter: (grade: string) => void;
  selectAllGrades: () => void;
  clearAllGrades: () => void;
  handleFilterToggle: () => void;
  closeFilter: () => void;
}

export function useFilter(restaurants: Restaurant[]): UseFilterReturn {
  const [selectedGrades, setSelectedGrades] = useState<string[]>(GRADES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const avgGrade = calculateAverageGrade(r.visits);
      return selectedGrades.includes(avgGrade);
    });
  }, [restaurants, selectedGrades]);

  const toggleGradeFilter = useCallback((grade: string) => {
    setSelectedGrades(prev =>
      prev.includes(grade)
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  }, []);

  const selectAllGrades = useCallback(() => {
    setSelectedGrades(GRADES);
  }, []);

  const clearAllGrades = useCallback(() => {
    setSelectedGrades([]);
  }, []);

  const closeFilter = useCallback(() => {
    setIsFilterClosing(true);
    setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 200);
  }, []);

  const handleFilterToggle = useCallback(() => {
    if (isFilterOpen) {
      closeFilter();
    } else {
      setIsFilterOpen(true);
    }
  }, [isFilterOpen, closeFilter]);

  return {
    selectedGrades,
    isFilterOpen,
    isFilterClosing,
    filteredRestaurants,
    toggleGradeFilter,
    selectAllGrades,
    clearAllGrades,
    handleFilterToggle,
    closeFilter
  };
}
