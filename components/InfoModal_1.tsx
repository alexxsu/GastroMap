import React, { useState } from 'react';
import { X, MapPin, Camera, Sparkles, ChevronRight } from 'lucide-react';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';
import { useLanguage } from '../hooks/useLanguage';

interface InfoModalProps {
  onClose: () => void;
}

const APP_VERSION = '0.1.0';

interface VersionNote {
  version: string;
  date: string;
  title: string;
  titleZh: string;
  notes: string[];
  notesZh: string[];
}

const VERSION_HISTORY: VersionNote[] = [
  {
    version: '0.1.0',
    date: '2024-12',
    title: 'First Official Release',
    titleZh: '首个正式版本',
    notes: [
      'Official release of TraceBook',
      'Interactive map for tracking food experiences',
      'Photo upload with GPS location detection',
      'Grade-based rating system (S-E)',
      'Private and shared maps support',
      'Multi-language support (English/Chinese)',
      'Interactive tutorial for new users',
      'Filter and search functionality',
      'Statistics and history views'
    ],
    notesZh: [
      'TraceBook 正式发布',
      '交互式地图记录美食体验',
      '照片上传自动检测GPS位置',
      '等级评分系统 (S-E)',
      '支持私人和共享地图',
      '多语言支持 (中文/英文)',
      '新用户交互式教程',
      '筛选和搜索功能',
      '统计和历史记录视图'
    ]
  }
];

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [showVersionNotes, setShowVersionNotes] = useState(false);

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
            <button
              onClick={() => setShowVersionNotes(true)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 mx-auto group"
            >
              <span>{t('version')} {APP_VERSION}</span>
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Version Notes Modal */}
      {showVersionNotes && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowVersionNotes(false)}
        >
          <div 
            className="bg-gray-800 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-900/50 to-purple-900/50">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">{language === 'zh' ? '版本更新记录' : 'Version History'}</h2>
              </div>
              <button 
                onClick={() => setShowVersionNotes(false)} 
                className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {VERSION_HISTORY.map((release) => (
                <div key={release.version} className="bg-gray-700/40 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-sm font-bold rounded-lg">
                        v{release.version}
                      </span>
                      <span className="text-xs text-gray-500">{release.date}</span>
                    </div>
                  </div>
                  <h3 className="text-white font-medium mb-2">
                    {language === 'zh' ? release.titleZh : release.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {(language === 'zh' ? release.notesZh : release.notes).map((note, idx) => (
                      <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900/50">
              <button
                onClick={() => setShowVersionNotes(false)}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                {language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoModal;