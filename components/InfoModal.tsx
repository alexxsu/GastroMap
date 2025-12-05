import React, { useState } from 'react';
import { X, MapPin, Camera } from 'lucide-react';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';
import { useLanguage } from '../hooks/useLanguage';

interface InfoModalProps {
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  // Get translated grade description
  const getTranslatedGradeDesc = (grade: string) => {
    const gradeDescKeys: Record<string, string> = {
      'S': 'gradeSDesc',
      'A': 'gradeADesc',
      'B': 'gradeBDesc',
      'C': 'gradeCDesc',
      'D': 'gradeDDesc',
      'E': 'gradeEDesc',
    };
    return t(gradeDescKeys[grade] as any) || getGradeDescription(grade);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div 
        className={`bg-gray-800 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">{t('aboutTitle')}</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-700">
            <h3 className="text-white font-bold mb-2">{t('howToUse')}</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <Camera size={18} className="text-blue-400 flex-shrink-0" />
                <span>{language === 'zh' ? '上传照片，应用会自动从GPS数据检测位置。' : 'Upload photos. The app auto-detects the location from GPS data.'}</span>
              </li>
              <li className="flex gap-2">
                <MapPin size={18} className="text-green-400 flex-shrink-0" />
                <span>{language === 'zh' ? '体验会被标记在地图上。点击聚合点可以放大查看。' : 'Experiences are pinned to the map. Click clusters to zoom in.'}</span>
              </li>
            </ul>
          </div>

          <div>
             <h3 className="text-white font-bold mb-2">{language === 'zh' ? '评分系统' : 'Rating System'}</h3>
             <div className="grid grid-cols-1 gap-2">
               {GRADES.map(grade => (
                 <div key={grade} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                   <span className={`font-bold w-6 text-center ${getGradeColor(grade)}`}>{grade}</span>
                   <span className="text-xs text-gray-400">{getTranslatedGradeDesc(grade)}</span>
                 </div>
               ))}
             </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-600">{t('version')} 0.9</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;