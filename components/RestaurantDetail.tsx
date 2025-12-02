
import React from 'react';
import { X, Calendar, MapPin, Share2, User, Trash2 } from 'lucide-react';
import { Restaurant, Visit } from '../types';
import { getGradeColor, gradeToScore, scoreToGrade } from '../utils/rating';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  currentUserUid?: string;
  onClose: () => void;
  onAddAnotherVisit: () => void;
  onDeleteVisit: (restaurant: Restaurant, visit: Visit) => void;
}

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ 
  restaurant, 
  currentUserUid,
  onClose, 
  onAddAnotherVisit,
  onDeleteVisit
}) => {
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShare = () => {
    const data = JSON.stringify(restaurant, null, 2);
    navigator.clipboard.writeText(data).then(() => {
      alert("Restaurant data copied to clipboard! You can send this to your friend.");
    });
  };

  const handleDelete = (visit: Visit) => {
    if (window.confirm("Are you sure you want to delete this memory? This cannot be undone.")) {
      onDeleteVisit(restaurant, visit);
    }
  };

  // Calculate average grade
  const calculateAverageGrade = () => {
    if (restaurant.visits.length === 0) return 'N/A';
    
    let totalScore = 0;
    restaurant.visits.forEach(v => {
      totalScore += gradeToScore(v.rating);
    });
    
    const avgScore = totalScore / restaurant.visits.length;
    return scoreToGrade(avgScore);
  };

  const avgGrade = calculateAverageGrade();

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-gray-900 border-l border-gray-800 shadow-2xl z-20 flex flex-col transform transition-transform duration-300">
      
      {/* Header */}
      <div className="relative h-48 bg-gray-800 flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
        {restaurant.visits.length > 0 && (
          <img 
            src={restaurant.visits[0].photoDataUrl} 
            className="w-full h-full object-cover opacity-60" 
            alt="Venue" 
          />
        )}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white transition"
        >
          <X size={20} />
        </button>
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <h1 className="text-2xl font-bold text-white leading-tight">{restaurant.name}</h1>
          <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
            <MapPin size={12} />
            <span className="truncate">{restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex border-b border-gray-800 bg-gray-900/50 backdrop-blur flex-shrink-0">
        <div className="flex-1 p-3 text-center border-r border-gray-800">
          <span className="block text-lg font-bold text-white">{restaurant.visits.length}</span>
          <span className="text-xs text-gray-500 uppercase">Visits</span>
        </div>
        <div className="flex-1 p-3 text-center">
          <span className={`block text-lg font-bold ${getGradeColor(avgGrade)}`}>
            {avgGrade}
          </span>
          <span className="text-xs text-gray-500 uppercase">Avg Grade</span>
        </div>
      </div>

      {/* Visits Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Timeline</h3>
            <button onClick={handleShare} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs">
                <Share2 size={12} /> Share
            </button>
        </div>

        {restaurant.visits.length === 0 ? (
           <div className="text-center text-gray-500 py-10">
             <p>No visits recorded.</p>
           </div>
        ) : (
          restaurant.visits.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((visit) => (
            <div key={visit.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm relative group">
              
              {/* Delete Button (Only visible if currentUser matches creator) */}
              {currentUserUid && visit.createdBy === currentUserUid && (
                <button 
                  onClick={() => handleDelete(visit)}
                  className="absolute top-2 right-2 z-10 bg-red-600/80 hover:bg-red-500 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete this memory"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <div className="h-48 w-full relative">
                <img src={visit.photoDataUrl} className="w-full h-full object-cover" alt="Food" />
                {visit.creatorName && (
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                    <User size={10} className="text-gray-300" />
                    <span className="text-[10px] text-white font-medium">Added by {visit.creatorName}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700 font-bold ${getGradeColor(visit.rating)}`}>
                    {visit.rating}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                    <Calendar size={12} />
                    <span>{formatDate(visit.date)}</span>
                  </div>
                </div>
                
                {visit.comment && (
                  <p className="text-gray-300 text-sm mb-3">"{visit.comment}"</p>
                )}

                {visit.aiDescription && (
                  <div className="bg-indigo-900/20 border border-indigo-500/20 p-2 rounded-lg">
                    <p className="text-xs text-indigo-300 italic">✨ {visit.aiDescription}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
        <button 
          onClick={onAddAnotherVisit}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition"
        >
          Add Another Visit Here
        </button>
      </div>
    </div>
  );
};

export default RestaurantDetail;
