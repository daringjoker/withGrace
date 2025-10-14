"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RadioButtonGroup } from "@/components/ui/RadioButtonGroup";
import { ImageUpload } from "@/components/ImageUpload";
import { OtherEventType, type OtherEventForm, type ImageData } from "@/types";
import { format } from "date-fns";
import { Bath, Stethoscope, AlertCircle, Trophy, HandHeart } from "lucide-react";

interface OtherFormProps {
  onSubmit: (data: OtherEventForm) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<OtherEventForm & { timestamp: string; activity: string }>;
  submitLabel?: string;
}

export function OtherForm({ onSubmit, isLoading = false, defaultValues, submitLabel = 'Save Event' }: OtherFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<OtherEventForm>(() => {
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
        eventType: (defaultValues.activity as OtherEventType) || OtherEventType.MILESTONE,
        description: defaultValues.description || '',
        notes: defaultValues.notes || '',
        images: defaultValues.images || []
      };
    }
    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      eventType: OtherEventType.MILESTONE,
      description: '',
      images: []
    };
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    if (!formData.eventType) {
      newErrors.eventType = 'Event type is required';
    }

    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = 'Description is required';
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
        eventType: OtherEventType.MILESTONE,
        description: '',
        images: []
      });
      setErrors({});
    } catch {
      setErrors({ submit: 'Failed to save event. Please try again.' });
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
            📅 When did this special moment happen? *
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
            <p className="text-red-600 text-sm mt-1">💕 Please pick the date of this special moment</p>
          )}
        </div>

        {/* Time */}
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
            ⏰ What time was this magical moment? *
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
            <p className="text-red-600 text-sm mt-1">💕 When did this special moment happen?</p>
          )}
        </div>
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          ✨ What kind of special moment was this? *
        </label>
        <RadioButtonGroup
          name="eventType"
          value={formData.eventType}
          onChange={(value) => setFormData(prev => ({ ...prev, eventType: value as OtherEventType }))}
          cols={2}
          options={[
            {
              value: OtherEventType.MILESTONE,
              label: "🎉 Milestone",
              description: "First smile, roll over, magical firsts!",
              icon: <Trophy className="w-5 h-5" />
            },
            {
              value: OtherEventType.BATH,
              label: "🛁 Bath Time",
              description: "Splashy fun and clean bubbles",
              icon: <Bath className="w-5 h-5" />
            },
            {
              value: OtherEventType.DOCTOR_VISIT,
              label: "👩‍⚕️ Doctor Visit",
              description: "Checkups and growing healthy",
              icon: <Stethoscope className="w-5 h-5" />
            },
            {
              value: OtherEventType.SYMPTOM,
              label: "🤒 Not Feeling Great",
              description: "When baby needs extra love",
              icon: <AlertCircle className="w-5 h-5" />
            },
            {
              value: OtherEventType.MASSAGE,
              label: "👐 Massage Time",
              description: "Gentle touches and bonding",
              icon: <HandHeart className="w-5 h-5" />
            }
          ]}
        />
        {errors.eventType && (
          <p className="text-red-600 text-sm mt-2">💕 What type of special moment was this?</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          💫 Tell us about this moment *
        </label>
        <Input
          id="description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What made this moment special? ✨"
          required
          className={errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
        {errors.description && (
          <p className="text-red-600 text-sm mt-1">💕 Please describe this special moment</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          💭 Any extra sweet details?
        </label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Share any adorable details or how baby reacted! 🥰"
          rows={3}
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          📸 Capture this special memory
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Preserve these precious moments with photos! 💕 Perfect for milestones and memories ✨
        </p>
        <ImageUpload
          images={formData.images || []}
          onImagesChange={handleImagesChange}
          maxImages={5}
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
          {isLoading ? '💝 Saving this precious memory...' : `✨ ${submitLabel}`}
        </Button>
      </div>
    </form>
  );
}