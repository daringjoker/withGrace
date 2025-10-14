import { format, parseISO, addMinutes } from "date-fns";
import { Edit, Trash2, Clock, Calendar, FileText, Camera, Award, Droplets, Utensils, MapPin, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { TimelineEvent, getEventTitle, getEventDetails, getEventColor, getEventIcon } from "./TimelineUtils";
import { EventType } from "@/types";

interface EventModalProps {
  selectedEvent: TimelineEvent | null;
  onClose: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string, eventTitle: string) => void;
}

export function EventModal({ selectedEvent, onClose, onEdit, onDelete }: EventModalProps) {
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; filename: string; index: number } | null>(null);
  
  const handleEdit = () => {
    if (!selectedEvent) return;
    onEdit(selectedEvent.id);
  };

  const handleDelete = () => {
    if (!selectedEvent) return;
    onDelete(selectedEvent.id, getEventTitle(selectedEvent));
    onClose();
  };

  const handleImageClick = (image: { url: string; filename: string }, index: number) => {
    setFullscreenImage({ ...image, index });
  };

  const handleFullscreenClose = () => {
    setFullscreenImage(null);
  };

  const handlePrevImage = () => {
    if (!fullscreenImage || !selectedEvent?.images) return;
    const prevIndex = fullscreenImage.index > 0 ? fullscreenImage.index - 1 : selectedEvent.images.length - 1;
    const prevImage = selectedEvent.images[prevIndex];
    setFullscreenImage({ url: prevImage.url, filename: prevImage.filename, index: prevIndex });
  };

  const handleNextImage = () => {
    if (!fullscreenImage || !selectedEvent?.images) return;
    const nextIndex = fullscreenImage.index < selectedEvent.images.length - 1 ? fullscreenImage.index + 1 : 0;
    const nextImage = selectedEvent.images[nextIndex];
    setFullscreenImage({ url: nextImage.url, filename: nextImage.filename, index: nextIndex });
  };

  // Keyboard navigation for fullscreen images
  useEffect(() => {
    if (!fullscreenImage) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleFullscreenClose();
          break;
        case 'ArrowLeft':
          handlePrevImage();
          break;
        case 'ArrowRight':
          handleNextImage();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  // Early return after all hooks
  if (!selectedEvent) return null;

  const eventColor = getEventColor(selectedEvent.type);
  const IconComponent = getEventIcon(selectedEvent.type);
  const eventDate = parseISO(selectedEvent.date);
  const eventTime = new Date(`2000-01-01T${selectedEvent.time}`);
  
  // Calculate duration info for events
  const getDurationInfo = () => {
    if (selectedEvent.type === EventType.SLEEP && selectedEvent.sleepEvent?.duration) {
      const durationMinutes = selectedEvent.sleepEvent.duration;
      const endTime = addMinutes(eventTime, durationMinutes);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      return {
        duration: durationMinutes,
        durationText: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        startTime: format(eventTime, 'h:mm a'),
        endTime: format(endTime, 'h:mm a'),
        isLongDuration: durationMinutes > 60
      };
    }
    
    if (selectedEvent.type === EventType.FEEDING && selectedEvent.feedingEvent?.duration) {
      const durationMinutes = selectedEvent.feedingEvent.duration;
      const endTime = addMinutes(eventTime, durationMinutes);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      return {
        duration: durationMinutes,
        durationText: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        startTime: format(eventTime, 'h:mm a'),
        endTime: format(endTime, 'h:mm a'),
        isLongDuration: durationMinutes > 60
      };
    }
    
    return null;
  };

  const durationInfo = getDurationInfo();

  const getDetailedEventInfo = () => {
    switch (selectedEvent.type) {
      case EventType.FEEDING:
        const feeding = selectedEvent.feedingEvent;
        if (!feeding) return null;
        
        return (
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
            <div className="flex items-center gap-2 mb-3">
              <Utensils className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Feeding Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{feeding.feedingType.replace('_', ' ')}</span>
              </div>
              {feeding.amount && (
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{feeding.amount}ml</span>
                </div>
              )}
              {feeding.side && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-gray-600">Side:</span>
                  <span className="font-medium capitalize">{feeding.side}</span>
                </div>
              )}
            </div>
          </div>
        );
        
      case EventType.DIAPER:
        const diaper = selectedEvent.diaperEvent;
        if (!diaper) return null;
        
        return (
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Diaper Change Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              {diaper.wet > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-yellow-700">{diaper.wet}</span>
                  </div>
                  <span className="text-gray-600">Wet diaper{diaper.wet > 1 ? 's' : ''}</span>
                </div>
              )}
              {diaper.dirty > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-orange-700">{diaper.dirty}</span>
                  </div>
                  <span className="text-gray-600">Dirty diaper{diaper.dirty > 1 ? 's' : ''}</span>
                </div>
              )}
              {diaper.color && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0"></div>
                  <span className="text-gray-600">Color:</span>
                  <span className="font-medium capitalize">{diaper.color}</span>
                </div>
              )}
              {diaper.texture && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></div>
                  <span className="text-gray-600">Texture:</span>
                  <span className="font-medium capitalize">{diaper.texture}</span>
                </div>
              )}
            </div>
          </div>
        );
        
      case EventType.SLEEP:
        const sleep = selectedEvent.sleepEvent;
        if (!sleep) return null;
        
        return (
          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Sleep Details</h3>
            </div>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{sleep.sleepType.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        );
        
      case EventType.OTHER:
        const other = selectedEvent.otherEvent;
        if (!other) return null;
        
        return (
          <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Activity Details</h3>
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span className="text-gray-600">Activity:</span>
                <span className="font-medium capitalize">{other.eventType.replace('_', ' ')}</span>
              </div>
              <p className="text-gray-700 ml-4">{other.description}</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl lg:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-auto border border-gray-200">
        {/* Header */}
        <div className="relative p-4 sm:p-6 pb-3 sm:pb-4" style={{ backgroundColor: `${eventColor}10` }}>
          {/* Mobile: Stack layout, Desktop: Side by side */}
          <div className="space-y-4 sm:space-y-0">
            {/* Top row: Icon, title, and action buttons */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ backgroundColor: eventColor }}
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-1 leading-tight">
                    {getEventTitle(selectedEvent)}
                  </h2>
                  {/* Mobile: Stack date/time, Desktop: Horizontal */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{format(eventDate, 'EEE, MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      {durationInfo ? (
                        durationInfo.isLongDuration ? (
                          <span className="truncate">{durationInfo.startTime} - {durationInfo.endTime}</span>
                        ) : (
                          <span>{durationInfo.startTime}</span>
                        )
                      ) : (
                        format(eventTime, 'h:mm a')
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons - Icons only, positioned next to close button */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button
                  onClick={handleEdit}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors duration-200"
                  title="Edit Memory"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors duration-200"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors duration-200"
                  title="Close"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Duration indicator for long events */}
          {durationInfo && durationInfo.isLongDuration && (
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-white bg-opacity-80 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-semibold" style={{ color: eventColor }}>
                    {durationInfo.durationText}
                  </span>
                </div>
                <div className="hidden sm:block text-gray-400">•</div>
                <span className="text-gray-600 text-xs">
                  {durationInfo.startTime} → {durationInfo.endTime}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Event-specific details */}
          {getDetailedEventInfo()}
          
          {/* Duration info for shorter events */}
          {durationInfo && !durationInfo.isLongDuration && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-2 sm:p-3">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Duration:</span>
              <span className="font-medium" style={{ color: eventColor }}>
                {durationInfo.durationText}
              </span>
            </div>
          )}

          {/* Notes */}
          {selectedEvent.notes && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <h3 className="font-medium text-gray-700">Notes</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed italic break-words">
                &ldquo;{selectedEvent.notes}&rdquo;
              </p>
            </div>
          )}

          {/* Images */}
          {selectedEvent.images && selectedEvent.images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Camera className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <h3 className="font-medium text-gray-700">
                  Photos ({selectedEvent.images.length})
                </h3>
                <span className="text-xs text-gray-500 ml-2">
                  Click to expand
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                {selectedEvent.images.map((image, index) => (
                  <div 
                    key={index} 
                    className="group relative cursor-pointer"
                    onClick={() => handleImageClick(image, index)}
                  >
                    <Image
                      src={image.url}
                      alt={image.filename || 'Event photo'}
                      width={200}
                      height={150}
                      className="w-full h-24 sm:h-32 object-cover rounded-md sm:rounded-lg shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105"
                      onError={(e) => {
                        console.error('Image failed to load:', image.url);
                        // Fallback to a regular img tag or placeholder
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzllYTNhOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                      }}
                      unoptimized={image.url.includes('utfs.io')} // Skip optimization for UploadThing images
                    />
                    {/* Click to expand indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-20 rounded-md sm:rounded-lg">
                      <div className="text-white text-xs sm:text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                        Click to expand
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60]">
          {/* Close button */}
          <button
            onClick={handleFullscreenClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation buttons (only show if multiple images) */}
          {selectedEvent.images && selectedEvent.images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
              >
                <ChevronLeft className="w-12 h-12" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
              >
                <ChevronRight className="w-12 h-12" />
              </button>
            </>
          )}

          {/* Image counter */}
          {selectedEvent.images && selectedEvent.images.length > 1 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
              {fullscreenImage.index + 1} of {selectedEvent.images.length}
            </div>
          )}

          {/* Main image */}
          <div className="relative max-w-full max-h-full p-4">
            <Image
              src={fullscreenImage.url}
              alt={fullscreenImage.filename || 'Event photo'}
              width={1200}
              height={900}
              className="max-w-full max-h-full object-contain"
              unoptimized={fullscreenImage.url.includes('utfs.io')}
              onError={(e) => {
                console.error('Fullscreen image failed to load:', fullscreenImage.url);
              }}
            />
            
            {/* Image caption */}
            {fullscreenImage.filename && (
              <div className="absolute bottom-0 left-0 right-0 text-white text-sm bg-black bg-opacity-50 p-2 text-center">
                {fullscreenImage.filename}
              </div>
            )}
          </div>

          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={handleFullscreenClose}
          />
        </div>
      )}
    </div>
  );
}