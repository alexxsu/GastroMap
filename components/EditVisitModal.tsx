
import React, { useState, useEffect } from 'react';
import { X, Loader2, Camera, Trash2, Save } from 'lucide-react';
import { Visit, Restaurant } from '../types';
import { GRADES } from '../utils/rating';
import { compressImage } from '../utils/image';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';
import { useLanguage } from '../hooks/useLanguage';

interface EditVisitModalProps {
  visit: Visit;
  restaurant: Restaurant;
  onClose: () => void;
  onSave: (restaurantId: string, oldVisit: Visit, newVisit: Visit) => void;
}

const EditVisitModal: React.FC<EditVisitModalProps> = ({ 
  visit, 
  restaurant, 
  onClose, 
  onSave 
}) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(visit.rating);
  const [comment, setComment] = useState(visit.comment);
  const [isClosing, setIsClosing] = useState(false);
  
  // Manage existing photos and new photos separately initially
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl]
  );
  
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]); // Blob URLs for preview
  
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newPreviews]);

  const processFile = async (file: File): Promise<Blob> => {
    let fileToProcess: Blob = file;
    
    // 1. Convert HEIC
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
    if (isHeic) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });
        fileToProcess = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (err) {
        console.error("HEIC conversion failed", err);
      }
    }

    // 2. Compress
    try {
      return await compressImage(fileToProcess);
    } catch (err) {
      console.error("Compression failed", err);
      return fileToProcess;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingImg(true);
      const files = Array.from(e.target.files) as File[];
      
      try {
        // Process HEIC and Compress
        const blobs = await Promise.all(files.map(f => processFile(f)));
        
        // Convert back to File objects for state (optional, but consistent) or keep as Blobs
        const filesToUpload = blobs.map((b, i) => new File([b], files[i].name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
        const previewUrls = blobs.map(b => URL.createObjectURL(b));

        setNewFiles(prev => [...prev, ...filesToUpload]);
        setNewPreviews(prev => [...prev, ...previewUrls]);
      } catch (error) {
        console.error("Error processing images", error);
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (existingPhotos.length === 0 && newFiles.length === 0) {
      alert("You must have at least one photo.");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Upload New Photos
      const uploadPromises = newFiles.map(async (file, index) => {
        const filename = `visits/${restaurant.id}/${Date.now()}_edit_${index}.jpg`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // 2. Combine URLs
      const finalPhotos = [...existingPhotos, ...uploadedUrls];

      // 3. Construct Updated Visit
      const updatedVisit: Visit = {
        ...visit,
        rating,
        comment,
        photos: finalPhotos,
        photoDataUrl: finalPhotos[0], // Ensure primary photo is updated
      };

      onSave(restaurant.id, visit, updatedVisit);

    } catch (error) {
      console.error("Failed to update visit:", error);
      alert("Failed to update. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`bg-gray-800 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">Edit Experience</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Photos Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Photos</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Existing Photos */}
              {existingPhotos.map((url, i) => (
                <div key={`existing-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-600">
                  <img src={url} alt="Existing" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeExistingPhoto(i)}
                    className="absolute top-1 right-1 bg-red-600/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* New Photos Preview */}
              {newPreviews.map((url, i) => (
                <div key={`new-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-green-600/50">
                   <img src={url} alt="New" className="w-full h-full object-cover opacity-80" />
                   <div className="absolute inset-0 border-2 border-green-500/30 pointer-events-none"></div>
                   <button 
                    onClick={() => removeNewPhoto(i)}
                    className="absolute top-1 right-1 bg-red-600/80 p-1 rounded-full text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* Add Button */}
              <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 hover:bg-gray-700/30 transition cursor-pointer">
                 {isProcessingImg ? (
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                 ) : (
                   <>
                     <Camera size={24} className="text-gray-400" />
                     <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                     <input 
                      type="file" 
                      accept="image/*,.heic" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileChange} 
                     />
                   </>
                 )}
              </label>
            </div>
          </div>

          {/* Rating Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Grade</label>
            <div className="flex gap-2 justify-between">
              {GRADES.map((g) => (
                <button 
                  key={g} 
                  onClick={() => setRating(g)}
                  className={`
                    w-10 h-10 rounded-lg font-bold text-lg transition border-2
                    ${rating === g 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30' 
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:border-gray-500'}
                  `}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('notes')}</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('updateComment')}
              className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
            {isSaving ? t('updating') : t('saveChanges')}
          </button>

        </div>
      </div>
    </div>
  );
};

export default EditVisitModal;
