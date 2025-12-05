
import { Visit } from '../types';

export const GRADES = ['S', 'A', 'B', 'C', 'D', 'E'];

export const gradeToScore = (grade: string): number => {
  switch (grade.toUpperCase()) {
    case 'S': return 5;
    case 'A': return 4;
    case 'B': return 3;
    case 'C': return 2;
    case 'D': return 1;
    case 'E': return 0;
    default: return 0;
  }
};

export const scoreToGrade = (score: number): string => {
  if (score >= 4.5) return 'S';
  if (score >= 3.5) return 'A';
  if (score >= 2.5) return 'B';
  if (score >= 1.5) return 'C';
  if (score >= 0.5) return 'D';
  return 'E';
};

export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'S': return 'text-purple-400';
    case 'A': return 'text-green-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-yellow-400';
    case 'D': return 'text-orange-400';
    case 'E': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export const getGradeDescription = (grade: string, language: string = 'en'): string => {
  if (language === 'zh') {
    switch (grade) {
      case 'S': return '神级';
      case 'A': return '优秀';
      case 'B': return '良好';
      case 'C': return '一般';
      case 'D': return '糟糕';
      case 'E': return '噩梦';
      default: return '';
    }
  }
  switch (grade) {
    case 'S': return 'God';
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'OK';
    case 'D': return 'Terrible';
    case 'E': return 'Nightmare';
    default: return '';
  }
};

export const calculateAverageGrade = (visits: Visit[]): string => {
  if (!visits || visits.length === 0) return 'N/A';
  let totalScore = 0;
  visits.forEach(v => {
    totalScore += gradeToScore(v.rating);
  });
  const avgScore = totalScore / visits.length;
  return scoreToGrade(avgScore);
};
