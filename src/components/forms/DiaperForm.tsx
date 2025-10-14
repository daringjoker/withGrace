"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RadioButtonGroup } from "@/components/ui/RadioButtonGroup";
import { ImageUpload } from "@/components/ImageUpload";
import { type DiaperEventForm, type ImageData } from "@/types";
import { format } from "date-fns";
import { Droplet, Baby } from "lucide-react";

interface DiaperFormProps {
  onSubmit: (data: DiaperEventForm) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<DiaperEventForm & { timestamp: string; type: string; consistency: string; color: string }>;
  submitLabel?: string;
}

export function DiaperForm({ onSubmit, isLoading = false, defaultValues, submitLabel = 'Save Diaper Change' }: DiaperFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<DiaperEventForm>(() => {
    if (defaultValues) {
      let timestamp: Date;
      try {
        timestamp = defaultValues.timestamp ? new Date(defaultValues.timestamp) : new Date()
        // Check if the date is valid
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date()
        }
      } catch (error) {
        console.error('Invalid timestamp in defaultValues:', defaultValues.timestamp)
        timestamp = new Date()
      }
      
      return {
        date: format(timestamp, 'yyyy-MM-dd'),
        time: format(timestamp, 'HH:mm'),
        wet: defaultValues.wet || 0,
        dirty: defaultValues.dirty || 0,
        diaperDetails: {
          color: defaultValues.color || '',
          consistency: defaultValues.consistency || '',
          texture: ''
        },
        notes: defaultValues.notes || '',
        images: defaultValues.images || []
      }
    }
    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      wet: 1,
      dirty: 0,
      images: []
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    if (formData.wet === 0 && formData.dirty === 0) {
      newErrors.type = 'Please select at least wet or dirty diaper';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      
      // Reset form after successful submission
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        wet: 1,
        dirty: 0,
        images: []
      });
      setErrors({});
    } catch {
      setErrors({ submit: 'Failed to save diaper change. Please try again.' });
    }
  };

  const handleImagesChange = (images: ImageData[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            📅 When did this diaper adventure happen? *
          </label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
            className={errors.date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1">💕 Please pick the date of this diaper change</p>
          )}
        </div>

        {/* Time */}
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
            ⏰ What time was cleanup time? *
          </label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            required
            className={errors.time ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          />
          {errors.time && (
            <p className="text-red-600 text-sm mt-1">💕 When did baby need a fresh diaper?</p>
          )}
        </div>
      </div>

      {/* Diaper Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          👶 What kind of surprise did baby leave? *
        </label>
        <RadioButtonGroup
          name="diaperType"
          value={formData.wet && formData.dirty ? 'both' : formData.wet ? 'wet' : formData.dirty ? 'dirty' : 'wet'}
          onChange={(value) => setFormData(prev => ({ 
            ...prev, 
            wet: value === 'wet' || value === 'both' ? 1 : 0,
            dirty: value === 'dirty' || value === 'both' ? 1 : 0
          }))}
          cols={3}
          options={[
            {
              value: "wet",
              label: "💧 Just Wet",
              description: "A little dampness",
              icon: <Droplet className="w-5 h-5" />
            },
            {
              value: "dirty",
              label: "💩 Messy One", 
              description: "Time for a thorough cleanup",
              icon: <Baby className="w-5 h-5" />
            },
            {
              value: "both",
              label: "💧💩 Full Package",
              description: "The works - wet and messy",
              icon: <div className="flex space-x-1"><Droplet className="w-4 h-4" /><Baby className="w-4 h-4" /></div>
            }
          ]}
        />
        {errors.type && (
          <p className="text-red-600 text-sm mt-2">💕 What type of diaper change was needed?</p>
        )}
      </div>

      {/* Diaper Details */}
      {formData.dirty > 0 && (
        <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700">💩 Tell us about baby&apos;s creation (helpful for health tracking!)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Color */}
            <div>
              <label htmlFor="color" className="block text-xs font-medium text-gray-600 mb-1">
                🎨 Color
              </label>
              <Input
                id="color"
                type="text"
                value={formData.diaperDetails?.color || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  diaperDetails: { 
                    ...prev.diaperDetails, 
                    color: e.target.value 
                  } 
                }))}
                placeholder="e.g., mustard yellow, green, brown"
              />
            </div>

            {/* Texture */}
            <div>
              <label htmlFor="texture" className="block text-xs font-medium text-gray-600 mb-1">
                ✨ Texture
              </label>
              <Input
                id="texture"
                type="text"
                value={formData.diaperDetails?.texture || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  diaperDetails: { 
                    ...prev.diaperDetails, 
                    texture: e.target.value 
                  } 
                }))}
                placeholder="e.g., seedy, smooth, cottage cheese-like"
              />
            </div>

            {/* Consistency */}
            <div>
              <label htmlFor="consistency" className="block text-xs font-medium text-gray-600 mb-1">
                🥄 Consistency
              </label>
              <Input
                id="consistency"
                type="text"
                value={formData.diaperDetails?.consistency || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  diaperDetails: { 
                    ...prev.diaperDetails, 
                    consistency: e.target.value 
                  } 
                }))}
                placeholder="e.g., soft, firm, runny, pasty"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          💭 Any notes about this diaper adventure?
        </label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="How did baby handle the change? Any reactions or cute moments? 😊"
          rows={3}
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          📸 Document for health tracking
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Photos can be super helpful for tracking changes or sharing with your pediatrician 👩‍⚕️✨
        </p>
        <ImageUpload
          images={formData.images || []}
          onImagesChange={handleImagesChange}
          maxImages={3}
        />
      </div>

      {/* Submit Button */}
      <div className="flex flex-col items-end space-y-2">
        {errors.submit && (
          <p className="text-red-600 text-sm">{errors.submit}</p>
        )}
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? '🧷 Saving this fresh moment...' : `✨ ${submitLabel}`}
        </Button>
      </div>
    </form>
  );
}