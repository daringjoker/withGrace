"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RadioButtonGroup } from "@/components/ui/RadioButtonGroup";
import { ImageUpload } from "@/components/ImageUpload";
import { FeedingType, type FeedingEventForm, type ImageData } from "@/types";
import { format } from "date-fns";
import { Milk, Baby, FlaskConical, Zap } from "lucide-react";

interface FeedingFormProps {
  onSubmit: (data: FeedingEventForm) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<FeedingEventForm & { timestamp: string; method: string }>;
  submitLabel?: string;
}

export function FeedingForm({ onSubmit, isLoading = false, defaultValues, submitLabel = 'Save Feeding' }: FeedingFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FeedingEventForm>(() => {
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
        feedingType: (defaultValues.method === 'breastfeeding' ? FeedingType.BREASTFED : 
                     defaultValues.method === 'expressed_breast_milk' ? FeedingType.EXPRESSED_BREAST_MILK :
                     defaultValues.method === 'formula' ? FeedingType.FORMULA : FeedingType.MIXED) || FeedingType.BREASTFED,
        amount: defaultValues.amount ? parseInt(defaultValues.amount.toString()) : undefined,
        duration: defaultValues.duration ? parseInt(defaultValues.duration.toString()) : undefined,
        side: defaultValues.side as 'left' | 'right' | 'both' | undefined,
        notes: defaultValues.notes || '',
        images: defaultValues.images || []
      }
    }
    return {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      feedingType: FeedingType.BREASTFED,
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

    if (requiresAmount && (!formData.amount || formData.amount <= 0)) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    }

    if (requiresDuration && (!formData.duration || formData.duration <= 0)) {
      newErrors.duration = 'Duration is required and must be greater than 0';
    }

    if (formData.feedingType === FeedingType.BREASTFED && !formData.side) {
      newErrors.side = 'Please select which side was used for breastfeeding';
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
        feedingType: FeedingType.BREASTFED,
        images: []
      });
      setErrors({});
    } catch {
      setErrors({ submit: 'Failed to save feeding. Please try again.' });
    }
  };

  const handleImagesChange = (images: ImageData[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const requiresAmount = formData.feedingType !== FeedingType.BREASTFED;
  const requiresDuration = formData.feedingType === FeedingType.BREASTFED || formData.feedingType === FeedingType.MIXED;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            📅 When was this sweet moment? *
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
            <p className="text-red-600 text-sm mt-1">💕 Please pick the date of this precious moment</p>
          )}
        </div>

        {/* Time */}
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
            ⏰ What time was feeding? *
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
            <p className="text-red-600 text-sm mt-1">💕 When did this feeding happen?</p>
          )}
        </div>
      </div>

      {/* Feeding Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          🍼 How did baby have their meal?
        </label>
        <RadioButtonGroup
          name="feedingType"
          value={formData.feedingType}
          onChange={(value) => setFormData(prev => ({ 
            ...prev, 
            feedingType: value as FeedingType,
            // Reset fields when changing type
            amount: undefined,
            duration: undefined,
            side: undefined
          }))}
          cols={2}
          options={[
            {
              value: FeedingType.BREASTFED,
              label: "🤱 Breastfeeding",
              description: "Bonding time at the breast",
              icon: <Baby className="w-5 h-5" />
            },
            {
              value: FeedingType.EXPRESSED_BREAST_MILK,
              label: "🍼 Pumped Milk",
              description: "Liquid gold in a bottle",
              icon: <Milk className="w-5 h-5" />
            },
            {
              value: FeedingType.FORMULA,
              label: "🥛 Formula",
              description: "Nourishing formula feeding",
              icon: <FlaskConical className="w-5 h-5" />
            },
            {
              value: FeedingType.MIXED,
              label: "🤱🍼 Mixed Feeding",
              description: "Best of both worlds",
              icon: <Zap className="w-5 h-5" />
            }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount (for bottles) */}
        {requiresAmount && (
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              🥛 How much liquid gold? (ml) *
            </label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="5"
              value={formData.amount || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                amount: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              placeholder="Amount in ml (every drop counts!)"
              className={errors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-red-600 text-sm mt-1">💕 How much did baby have?</p>
            )}
          </div>
        )}

        {/* Duration (for breastfeeding) */}
        {requiresDuration && (
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              ⏱️ How long was this bonding time? (minutes) *
            </label>
            <Input
              id="duration"
              type="number"
              min="0"
              step="1"
              value={formData.duration || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                duration: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              placeholder="Minutes of precious bonding time"
              className={errors.duration ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {errors.duration && (
              <p className="text-red-600 text-sm mt-1">💕 How many minutes of sweet feeding time?</p>
            )}
          </div>
        )}
      </div>

      {/* Side (for breastfeeding) */}
      {formData.feedingType === FeedingType.BREASTFED && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            🤱 Which side had the honor? *
          </label>
          <RadioButtonGroup
            name="side"
            value={formData.side || ''}
            onChange={(value) => setFormData(prev => ({ 
              ...prev, 
              side: value as 'left' | 'right' | 'both' || undefined
            }))}
            cols={3}
            options={[
              {
                value: "left",
                label: "👈 Left Side",
                description: "Left breast had the honor"
              },
              {
                value: "right", 
                label: "👉 Right Side",
                description: "Right breast was chosen"
              },
              {
                value: "both",
                label: "🤗 Both Sides",
                description: "Double the bonding time"
              }
            ]}
          />
          {errors.side && (
            <p className="text-red-600 text-sm mt-2">💕 Which side did baby choose today?</p>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          💭 Any sweet memories to capture?
        </label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="How did baby do? Any cute moments during feeding? ✨"
          rows={3}
        />
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          📸 Capture this precious moment
        </label>
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
          {isLoading ? '💕 Saving this precious moment...' : `✨ ${submitLabel}`}
        </Button>
      </div>
    </form>
  );
}