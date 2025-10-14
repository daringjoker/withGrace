"use client";

import { useState } from "react";
import { UploadButton } from "@/lib/uploadthing";
import { X, Camera } from "lucide-react";
import Image from "next/image";
import type { ImageData } from "@/types";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 5,
  className 
}: ImageUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const removeImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
  };

  const updateImageCaption = (imageId: string, caption: string) => {
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, caption } : img
    );
    onImagesChange(updatedImages);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Error display */}
      {uploadError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {uploadError}
        </div>
      )}

      {/* Existing images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={image.url}
                  alt={image.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              
              {/* Caption input */}
              <input
                type="text"
                placeholder="Add caption..."
                value={image.caption || ""}
                onChange={(e) => updateImageCaption(image.id, e.target.value)}
                className="mt-2 w-full text-xs p-2 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-4">
              Upload up to {maxImages - images.length} more image{maxImages - images.length !== 1 ? 's' : ''}
            </p>
            
            <UploadButton
              endpoint="babyEventImages"
              onClientUploadComplete={(res) => {
                setUploadError(null);
                const newImages: ImageData[] = res.map(file => ({
                  id: crypto.randomUUID(),
                  url: file.url,
                  key: file.key,
                  name: file.name,
                  size: file.size,
                  uploadedAt: new Date().toISOString()
                }));
                onImagesChange([...images, ...newImages]);
              }}
              onUploadError={(error: Error) => {
                console.error("Upload error:", error);
                setUploadError(error.message || "Failed to upload image");
              }}
              appearance={{
                button: "w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors",
                allowedContent: "text-xs text-gray-500 mt-2"
              }}
            />
          </div>
        </div>
      )}

      {/* Image count display */}
      <div className="text-xs text-gray-500 text-center">
        {images.length} of {maxImages} images uploaded
      </div>
    </div>
  );
}