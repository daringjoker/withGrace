"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RadioButtonGroup } from "@/components/ui/RadioButtonGroup";
import { ImageUpload } from "@/components/ImageUpload";
import { SleepType, type SleepEventForm, type ImageData } from "@/types";
import { format, parse, differenceInMinutes } from "date-fns";
import { Moon, Sun, Clock } from "lucide-react";

interface SleepFormProps {
  onSubmit: (data: SleepEventForm) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<SleepEventForm & { timestamp: string; sleepType: string }>;
  submitLabel?: string;
}

export function SleepForm({ onSubmit, isLoading = false, defaultValues, submitLabel = 'Save Sleep' }: SleepFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<SleepEventForm>(() => {
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
        sleepType: (defaultValues.sleepType as SleepType) || SleepType.NAP,
        startTime: defaultValues.startTime || '',
        endTime: defaultValues.endTime || '',
        duration: defaultValues.duration,
        notes: defaultValues.notes || '',
        images: defaultValues.images || []
      };
    }
    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      sleepType: SleepType.NAP,
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

    if (!formData.sleepType) {
      newErrors.sleepType = 'Sleep type is required';
    }

    // Validate start and end times if both are provided
    if (formData.startTime && formData.endTime) {
      const startDateTime = parse(`${formData.date} ${formData.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const endDateTime = parse(`${formData.date} ${formData.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
      
      if (endDateTime <= startDateTime) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    // Require either duration OR start/end times
    if (!formData.duration && (!formData.startTime || !formData.endTime)) {
      newErrors.duration = 'Please provide either duration or start/end times';
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
      // Auto-calculate duration if start/end times are provided
      const finalFormData = { ...formData };
      if (formData.startTime && formData.endTime && !formData.duration) {
        const startDateTime = parse(`${formData.date} ${formData.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
        const endDateTime = parse(`${formData.date} ${formData.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
        finalFormData.duration = differenceInMinutes(endDateTime, startDateTime);
      }

      await onSubmit(finalFormData);
      
      // Reset form after successful submission
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        sleepType: SleepType.NAP,
        images: []
      });
      setErrors({});
    } catch {
      setErrors({ submit: 'Failed to save sleep record. Please try again.' });
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
            📅 When did dreamland happen? *
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
            <p className="text-red-600 text-sm mt-1">💕 Please pick the date of this peaceful sleep</p>
          )}
        </div>

        {/* Time */}
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
            ⏰ When did sleepy time begin? *
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
            <p className="text-red-600 text-sm mt-1">💕 When did baby start their sleep?</p>
          )}
        </div>
      </div>

      {/* Sleep Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          😴 What kind of sleepy adventure was this? *
        </label>
        <RadioButtonGroup
          name="sleepType"
          value={formData.sleepType}
          onChange={(value) => setFormData(prev => ({ ...prev, sleepType: value as SleepType }))}
          cols={2}
          options={[
            {
              value: SleepType.NAP,
              label: "☀️ Quick Nap",
              description: "Sweet daytime dreams",
              icon: <Sun className="w-5 h-5" />
            },
            {
              value: SleepType.NIGHT_SLEEP,
              label: "🌙 Night Sleep",
              description: "Long peaceful slumber",
              icon: <Moon className="w-5 h-5" />
            },
            {
              value: SleepType.LONG_NAP,
              label: "⏰ Power Nap",
              description: "Extended recharge time",
              icon: <Clock className="w-5 h-5" />
            }
          ]}
        />
        {errors.sleepType && (
          <p className="text-red-600 text-sm mt-2">💕 What type of sleep was this?</p>
        )}
      </div>

      {/* Duration or Start/End Times */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              😴 When did dreams begin?
            </label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              placeholder="When sleepy time started"
            />
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
              🌅 When did baby wake up?
            </label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              placeholder="When those sweet eyes opened"
              className={errors.endTime ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.endTime && (
              <p className="text-red-600 text-sm mt-1">💕 Wake up time should be after sleep time</p>
            )}
          </div>
        </div>

        <div className="text-center">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">OR</span>
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            ⏱️ How long in dreamland? (minutes)
          </label>
          <Input
            id="duration"
            type="number"
            min="0"
            step="5"
            value={formData.duration || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              duration: e.target.value ? parseInt(e.target.value) : undefined 
            }))}
            placeholder="Minutes of peaceful sleep"
            className={errors.duration ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          />
          {errors.duration && (
            <p className="text-red-600 text-sm mt-1">💕 Please tell us how long baby slept or when they started/ended</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          💭 Any sweet dreams to remember?
        </label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="How did baby sleep? Any cute positions or sounds? 😴✨"
          rows={3}
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          📸 Capture those peaceful moments
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Sweet sleeping photos or cozy sleep environment shots 😇💤
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
          {isLoading ? '😴 Saving sweet dreams...' : `✨ ${submitLabel}`}
        </Button>
      </div>
    </form>
  );
}