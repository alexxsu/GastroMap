import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Search, Loader2, X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Coordinates, PlaceResult, Restaurant, Visit } from '../types';
import { getGPSFromImage } from '../utils/exif';
import { compressImage } from '../utils/image';
import { GRADES, getGradeDescription, getGradeColor } from '../utils/rating';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../hooks/useLanguage';
// Import heic2any properly
import heic2any from 'heic2any';

interface AddVisitModalProps {
  mapInstance: google.maps.Map | null;
  currentLocation: Coordinates;
  existingRestaurants: Restaurant[];
  onClose: () => void;
  onSave: (restaurant: Restaurant, visit: Visit) => void;
  onPhotosUploaded?: (hasPhotos: boolean) => void;
  isGuest?: boolean;
  externalIsClosing?: boolean;
}

interface SuggestionItem {
  place_id: string;
  name: string;
  description: string;
  isPrediction: boolean;
  geometry?: { location: any };
}

const AddVisitModal: React.FC<AddVisitModalProps> = ({ 
  mapInstance, 
  currentLocation,
  existingRestaurants, 
  onClose, 
  onSave,
  onPhotosUploaded,
  isGuest,
  externalIsClosing
}) => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isClosing, setIsClosing] = useState(false);

  // Sync with external closing state
  React.useEffect(() => {
    if (externalIsClosing) {
      setIsClosing(true);
    }
  }, [externalIsClosing]);

  // Combined closing state
  const isModalClosing = isClosing || externalIsClosing;

  // Multi-image state
  const [previewBlobs, setPreviewBlobs] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [foundLocation, setFoundLocation] = useState<Coordinates | null>(null);
  
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [rating, setRating] = useState('A');
  const [comment, setComment] = useState('');
  
  // New saving state
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (onPhotosUploaded) {
      onPhotosUploaded(previewUrls.length > 0);
    }
  }, [previewUrls, onPhotosUploaded]);

  const processFile = async (file: File): Promise<Blob> => {
    let fileToProcess: Blob = file;

    // 1. Handle HEIC conversion if necessary
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
        console.error("HEIC conversion failed for file", file.name, err);
        // Fallback to original if HEIC fails (though browser might not show it)
      }
    }

    // 2. Compress the image (Resize to max 1600px, JPEG 80%)
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
      const firstFile = files[0];

      try {
        // 1. Get GPS from the FIRST image only (Must be done on original file before compression strips EXIF)
        const coords = await getGPSFromImage(firstFile);

        // 2. Process ALL images (HEIC -> JPG -> Compress) with individual error handling
        const results = await Promise.allSettled(files.map(f => processFile(f)));

        const successfulBlobs: Blob[] = [];
        let failedCount = 0;

        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            successfulBlobs.push(result.value);
          } else {
            failedCount++;
            console.error(`Failed to process image ${files[i].name}:`, result.reason);
          }
        });

        if (failedCount > 0) {
          alert(`Warning: ${failedCount} of ${files.length} image(s) failed to process. Continuing with ${successfulBlobs.length} successful image(s).`);
        }

        if (successfulBlobs.length === 0) {
          throw new Error('All images failed to process');
        }

        const urls = successfulBlobs.map(b => URL.createObjectURL(b));

        setPreviewBlobs(successfulBlobs);
        setPreviewUrls(urls);
        setIsProcessingImg(false);

        if (coords) {
          setFoundLocation(coords);
          searchNearbyPlaces(coords);
        } else {
          setFoundLocation(null);
          searchNearbyPlaces(currentLocation);
        }
        setStep(2);

      } catch (error) {
        console.error("Error processing images", error);
        alert("Failed to process images. This may be due to:\n- Unsupported image format\n- Corrupted image file\n- Memory issues\n\nPlease try with different photos or take new ones.");
        setIsProcessingImg(false);
      }
    }
  };

  const searchNearbyPlaces = async (loc: Coordinates) => {
    if (!mapInstance) return;
    setIsSearching(true);
    
    try {
      const { PlacesService, PlacesServiceStatus } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const service = new PlacesService(mapInstance);
      const request = {
        location: loc,
        radius: 200,
        type: 'restaurant'
      };

      service.nearbySearch(request, (results, status) => {
        setIsSearching(false);
        if (status === PlacesServiceStatus.OK && results) {
          const items: SuggestionItem[] = results.map(r => ({
            place_id: r.place_id!,
            name: r.name!,
            description: r.vicinity || '',
            isPrediction: false,
            geometry: r.geometry
          }));
          setSuggestions(items);
        } else {
          setSuggestions([]);
        }
      });
    } catch (e) {
      console.error("Error loading Places library", e);
      setIsSearching(false);
    }
  };

  const handleManualSearch = async (query: string) => {
    setManualSearch(query);
    if (query.length < 3) return;

    try {
      const { AutocompleteService, PlacesServiceStatus } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const service = new AutocompleteService();
      
      service.getPlacePredictions({ input: query }, (predictions, status) => {
        if (status === PlacesServiceStatus.OK && predictions) {
          const items: SuggestionItem[] = predictions.map(p => ({
            place_id: p.place_id,
            name: p.structured_formatting.main_text,
            description: p.structured_formatting.secondary_text,
            isPrediction: true
          }));
          setSuggestions(items);
        } else if (status === PlacesServiceStatus.ZERO_RESULTS) {
          setSuggestions([]);
        }
      });
    } catch (e) {
      console.error("Error loading Autocomplete", e);
    }
  };

  const selectPlace = async (item: SuggestionItem) => {
    if (item.isPrediction) {
      if (!mapInstance) return;
      setIsSearching(true);
      try {
        const { PlacesService, PlacesServiceStatus } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        const service = new PlacesService(mapInstance);
        service.getDetails({ placeId: item.place_id }, (place, status) => {
          setIsSearching(false);
          if (status === PlacesServiceStatus.OK && place) {
            setSelectedPlace(place);
            setStep(3);
          } else {
            alert("Could not retrieve details for this location.");
          }
        });
      } catch (e) {
        console.error("Error getting details", e);
        setIsSearching(false);
      }
    } else {
      setSelectedPlace({
        place_id: item.place_id,
        name: item.name,
        vicinity: item.description,
        geometry: item.geometry
      });
      setStep(3);
    }
  };

  const handleSave = async () => {
    if (!selectedPlace || !selectedPlace.geometry?.location || previewBlobs.length === 0) return;
    
    setIsSaving(true);

    try {
      // 1. Upload ALL images to Firebase Storage
      const uploadPromises = previewBlobs.map(async (blob, index) => {
        const filename = `visits/${selectedPlace.place_id}/${Date.now()}_img_${index}.jpg`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, blob);
        return await getDownloadURL(snapshot.ref);
      });

      const downloadURLs = await Promise.all(uploadPromises);

      // 2. Construct Objects
      const newRestaurant: Restaurant = {
        id: selectedPlace.place_id || Math.random().toString(),
        name: selectedPlace.name || 'Unknown Spot',
        address: selectedPlace.vicinity || 'Unknown Address',
        location: {
          lat: selectedPlace.geometry.location.lat(),
          lng: selectedPlace.geometry.location.lng()
        },
        visits: []
      };

      const newVisit: Visit = {
        id: Math.random().toString(),
        date: new Date().toISOString(),
        photoDataUrl: downloadURLs[0], // Keep primary for back-compat
        photos: downloadURLs, // Store all URLs
        rating,
        comment,
      };

      onSave(newRestaurant, newVisit);
      // setIsSaving(false); // No need to set false as modal will close
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload images. Please try again.");
      setIsSaving(false);
    }
  };

  // Carousel helpers
  const nextPreview = () => setCurrentPreviewIndex(prev => (prev + 1) % previewUrls.length);
  const prevPreview = () => setCurrentPreviewIndex(prev => (prev - 1 + previewUrls.length) % previewUrls.length);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-200 ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`bg-gray-800 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isModalClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">
            {step === 1 && t('addMemory')}
            {step === 2 && (language === 'zh' ? '这是哪里？' : 'Where was this?')}
            {step === 3 && (language === 'zh' ? '感觉如何？' : 'How was it?')}
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-600 rounded-xl hover:border-blue-500 hover:bg-gray-700/30 transition cursor-pointer relative">
              {isProcessingImg ? (
                <div className="flex flex-col items-center text-blue-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <span className="text-sm">{language === 'zh' ? `压缩 ${previewUrls.length > 0 ? previewUrls.length : ''} 张图片中...` : `Compressing ${previewUrls.length > 0 ? previewUrls.length : ''} images...`}</span>
                </div>
              ) : (
                <>
                  <input 
                    type="file" 
                    accept="image/*,.heic" 
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <Camera size={48} className="text-gray-400 mb-2" />
                  <p className="text-gray-400 font-medium">{language === 'zh' ? '点击上传照片' : 'Tap to upload photos'}</p>
                  <p className="text-xs text-gray-500 mt-2">{language === 'zh' ? '支持多选 (JPG, PNG, HEIC)' : 'Supports multi-select (JPG, PNG, HEIC)'}</p>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Preview Carousel */}
              {previewUrls.length > 0 && (
                <div className="h-48 w-full rounded-xl overflow-hidden relative border border-gray-600 bg-gray-900 group">
                   <img src={previewUrls[currentPreviewIndex]} className="w-full h-full object-cover" alt="Preview" />
                   
                   {/* GPS Indicator (Always based on 1st img) */}
                   {foundLocation ? (
                     <div className="absolute top-2 right-2 bg-green-600/90 px-2 py-1 rounded text-xs text-white flex items-center gap-1 shadow-lg">
                       <MapPin size={12} /> {language === 'zh' ? '已检测到位置' : 'Location Detected'}
                     </div>
                   ) : (
                      <div className="absolute top-2 right-2 bg-yellow-600/90 px-2 py-1 rounded text-xs text-white flex items-center gap-1 shadow-lg">
                       <MapPin size={12} /> {language === 'zh' ? '无GPS (图片1)' : 'No GPS (Image 1)'}
                     </div>
                   )}

                   {/* Carousel Controls */}
                   {previewUrls.length > 1 && (
                     <>
                       <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); prevPreview(); }} className="bg-black/50 hover:bg-black/70 p-1 rounded-full text-white">
                            <ChevronLeft size={20} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); nextPreview(); }} className="bg-black/50 hover:bg-black/70 p-1 rounded-full text-white">
                            <ChevronRight size={20} />
                          </button>
                       </div>
                       <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                          {previewUrls.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentPreviewIndex ? 'bg-white' : 'bg-white/40'}`} />
                          ))}
                       </div>
                     </>
                   )}
                </div>
              )}

              <div className="space-y-2">
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                   <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">{language === 'zh' ? '搜索或选择' : 'Search or Select'}</label>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={manualSearch}
                       onChange={(e) => handleManualSearch(e.target.value)}
                       placeholder={language === 'zh' ? '手动搜索地点...' : 'Search place manually...'}
                       className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                     />
                     <div className="bg-gray-700 px-3 py-2 rounded flex items-center justify-center">
                        {isSearching ? <Loader2 size={16} className="animate-spin text-blue-400"/> : <Search size={16} />}
                     </div>
                   </div>
                </div>

                <div className="space-y-2">
                  {suggestions.length > 0 ? (
                    suggestions.map((place) => (
                      <button 
                        key={place.place_id}
                        onClick={() => selectPlace(place)}
                        className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition border border-transparent hover:border-gray-500 group"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-white group-hover:text-blue-300 transition">{place.name}</p>
                          {place.isPrediction && <Search size={12} className="text-gray-500 mt-1"/>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{place.description}</p>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="mx-auto mb-2 opacity-50" size={32}/>
                      <p className="text-sm">{language === 'zh' ? '附近没有找到地点' : 'No places found nearby.'}</p>
                      <p className="text-xs">{language === 'zh' ? '请尝试在上方输入名称' : 'Try typing the name above.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && selectedPlace && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-3 bg-gray-700/30 rounded-lg border border-gray-700">
                <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedPlace.name}</h3>
                  <p className="text-sm text-gray-400">{selectedPlace.vicinity}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('rating')}</label>
                <div className="flex gap-2 justify-between">
                  {GRADES.map((grade) => (
                    <button 
                      key={grade} 
                      onClick={() => setRating(grade)}
                      className={`
                        w-12 h-12 rounded-lg font-bold text-lg transition border-2
                        ${rating === grade 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30' 
                          : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600 hover:border-gray-500'}
                      `}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
                <div className={`text-center mt-3 text-sm font-medium transition-colors ${getGradeColor(rating)}`}>
                  {getGradeDescription(rating, language)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{language === 'zh' ? '备注' : 'Notes'}</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={language === 'zh' ? '你吃了什么？感觉如何？' : 'What did you eat? How was the vibe?'}
                  className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isSaving && <Loader2 size={18} className="animate-spin"/>}
                {isSaving 
                  ? (language === 'zh' ? `上传 ${previewBlobs.length} 张照片中...` : `Uploading ${previewBlobs.length} Photos...`)
                  : (language === 'zh' ? '保存体验' : 'Save Experience')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AddVisitModal;