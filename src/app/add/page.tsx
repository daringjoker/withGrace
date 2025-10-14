"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedingForm } from "@/components/forms/FeedingForm";
import { DiaperForm } from "@/components/forms/DiaperForm";
import { SleepForm } from "@/components/forms/SleepForm";
import { OtherForm } from "@/components/forms/OtherForm";
import { Milk, Baby, Moon, Heart, Users } from "lucide-react";
import { EventType, type FeedingEventForm, type DiaperEventForm, type SleepEventForm, type OtherEventForm } from "@/types";
import { useGroup } from "@/contexts/GroupContext";
import Link from "next/link";

const eventTypes = [
  { 
    type: EventType.FEEDING, 
    label: '🍼 Feeding Time', 
    icon: Milk, 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Capture those precious feeding moments with love 💕'
  },
  { 
    type: EventType.DIAPER, 
    label: '👶 Fresh & Clean', 
    icon: Baby, 
    color: 'bg-green-100 text-green-700 border-green-200',
    description: 'Keep track of diaper changes for a happy baby ✨'
  },
  { 
    type: EventType.SLEEP, 
    label: '😴 Sweet Dreams', 
    icon: Moon, 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Record peaceful naps and nighttime slumber 🌙'
  },
  { 
    type: EventType.OTHER, 
    label: '💝 Special Moments', 
    icon: Heart, 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Bath time, milestones, giggles, and magical moments 🌟'
  }
];

export default function AddEventPage() {
  const { activeGroup, userGroups, isLoading: groupsLoading } = useGroup();
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ensure userGroups is always an array to prevent runtime errors
  const safeUserGroups = Array.isArray(userGroups) ? userGroups : [];

  // Debug logging
  console.log('AddEventPage render:', {
    activeGroup: activeGroup?.name,
    userGroupsCount: safeUserGroups.length,
    groupsLoading,
    userGroups: safeUserGroups.map(g => ({ id: g.id, name: g.name }))
  });

  const handleSubmit = async (data: FeedingEventForm | DiaperEventForm | SleepEventForm | OtherEventForm) => {
    if (!activeGroup) {
      alert('Please select an active group first! 👶');
      return;
    }

    if (!activeGroup.permissions.canAdd) {
      alert('You do not have permission to add events to this group! �');
      return;
    }

    setIsLoading(true);
    try {
      const eventData = {
        type: selectedEventType,
        groupId: activeGroup.id,
        ...data,
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reset form
        setSelectedEventType(null);
        alert('Beautiful moment saved! 💕 Your memory is now treasured forever ✨');
      } else {
        throw new Error(result.error || 'Failed to save event');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Oops! We couldn\'t save that moment right now. Please try again! 💝');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (groupsLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your groups...</p>
      </div>
    );
  }

  // Show message if no active group or no add permissions
  if (!activeGroup) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-6xl">👶</div>
        <h1 className="text-2xl font-bold text-gray-900">
          No Active Group
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          You need to select an active group to capture moments. 
          {safeUserGroups.length === 0 ? 'Create or join a group first!' : `You have ${safeUserGroups.length} group(s) but none is active.`}
        </p>
        <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded">
          Debug: Groups loaded: {safeUserGroups.length}, Loading: {groupsLoading ? 'Yes' : 'No'}
          {safeUserGroups.length > 0 && (
            <div>Groups: {safeUserGroups.map(g => g.name).join(', ')}</div>
          )}
        </div>
        <Link href="/groups">
          <Button className="inline-flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Manage Groups
          </Button>
        </Link>
      </div>
    );
  }

  // Show message if no add permissions
  if (!activeGroup.permissions.canAdd) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900">
          No Add Permission
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          You don&apos;t have permission to add events to &quot;{activeGroup.name}&quot;. 
          Contact the group admin to update your permissions.
        </p>
        <Link href="/groups">
          <Button className="inline-flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Switch Groups
          </Button>
        </Link>
      </div>
    );
  }

  if (!selectedEventType) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ✨ Capture a Sweet Moment
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            What beautiful moment would you like to remember today? 💕
          </p>
        </div>

        {/* Active Group Display */}
        <div className="max-w-md mx-auto text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-600 mb-1">Adding to:</p>
            <p className="font-medium text-blue-900">{activeGroup.name}</p>
            <p className="text-xs text-blue-600">
              Role: {activeGroup.role} | Switch groups from your profile
            </p>
          </div>
        </div>

        {/* Event Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {eventTypes.map((eventType) => {
            const Icon = eventType.icon;
            return (
              <button
                key={eventType.type}
                onClick={() => setSelectedEventType(eventType.type)}
                className={`p-6 rounded-xl border-2 text-left transition-all hover:scale-105 hover:shadow-lg ${eventType.color}`}
              >
                <div className="flex items-start space-x-4">
                  <Icon className="w-8 h-8 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{eventType.label}</h3>
                    <p className="text-sm opacity-75">{eventType.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setSelectedEventType(null)}
          className="mb-4"
        >
          ← Back to Choose Moment
        </Button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {eventTypes.find(t => t.type === selectedEventType)?.label}
          </h1>
          <p className="text-gray-600">
            Share the details of this precious moment. Fields with * are required, but every detail helps! 🌟
          </p>
        </div>

        {/* Render appropriate form based on selected type */}
        {selectedEventType === EventType.FEEDING && (
          <FeedingForm onSubmit={handleSubmit} isLoading={isLoading} />
        )}
        {selectedEventType === EventType.DIAPER && (
          <DiaperForm onSubmit={handleSubmit} isLoading={isLoading} />
        )}
        {selectedEventType === EventType.SLEEP && (
          <SleepForm onSubmit={handleSubmit} isLoading={isLoading} />
        )}
        {selectedEventType === EventType.OTHER && (
          <OtherForm onSubmit={handleSubmit} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}