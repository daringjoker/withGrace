"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { FeedingForm } from "@/components/forms/FeedingForm";
import { DiaperForm } from "@/components/forms/DiaperForm";
import { SleepForm } from "@/components/forms/SleepForm";
import { OtherForm } from "@/components/forms/OtherForm";
import { useGroup } from "@/contexts/GroupContext";
import { Users } from "lucide-react";
import Link from "next/link";
import { 
  EventType, 
  FeedingType,
  SleepType,
  OtherEventType,
  type BabyEventWithRelations, 
  type FeedingEventForm,
  type DiaperEventForm,
  type SleepEventForm,
  type OtherEventForm
} from "@/types";

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const { activeGroup, isLoading: groupsLoading } = useGroup()
  const [event, setEvent] = useState<BabyEventWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventId = Array.isArray(params.id) ? params.id[0] : params.id
        const response = await fetch(`/api/events/${eventId}`)
        if (response.ok) {
          const event = await response.json()
          setEvent(event)
        } else {
          setError('💔 We couldn\'t find that precious memory')
        }
      } catch (error) {
        console.error('Error fetching event:', error)
        setError('✨ Something magical went wrong. Please try again!')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchEvent()
    }
  }, [params.id])

  const handleSubmit = async (formData: FeedingEventForm | DiaperEventForm | SleepEventForm | OtherEventForm) => {
    try {
      const eventId = Array.isArray(params.id) ? params.id[0] : params.id
      
      // Log the form data to debug
      console.log('Form data being submitted:', formData)
      
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: event?.type, ...formData }),
      })

      if (response.ok) {
        alert('💕 Memory updated! ✨')
        router.push('/timeline')
      } else {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        alert('💝 Oops! We couldn\'t save those changes right now. Please try again!')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('✨ Something went wrong while saving. Please try again!')
    }
  }

  // Convert API event data to form format
  const createTimestamp = (date: string | Date, time: string) => {
    try {
      // Get the date part (YYYY-MM-DD format)
      const dateObj = new Date(date)
      const dateStr = dateObj.toISOString().split('T')[0]
      
      // Combine date and time, ensuring proper format
      const timestamp = `${dateStr}T${time}:00.000Z`
      
      // Validate the timestamp
      const testDate = new Date(timestamp)
      if (isNaN(testDate.getTime())) {
        // Fallback to current time if invalid
        return new Date().toISOString()
      }
      
      return timestamp
    } catch (error) {
      console.error('Error creating timestamp:', error)
      // Fallback to current time if error
      return new Date().toISOString()
    }
  }

  const getFeedingFormDefaultValues = (event: BabyEventWithRelations) => {
    let dateString: string
    try {
      if (typeof event.date === 'string') {
        // Check if already in YYYY-MM-DD format
        if (event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateString = event.date
        } else {
          // Parse and format
          const parsedDate = new Date(event.date)
          dateString = !isNaN(parsedDate.getTime()) ? format(parsedDate, 'yyyy-MM-dd') : event.date
        }
      } else {
        // Treat as Date object
        dateString = format(event.date as Date, 'yyyy-MM-dd')
      }
    } catch (error) {
      console.error('Error formatting date:', error)
      // Keep original date as string fallback
      dateString = String(event.date)
    }
    
    return {
      date: dateString,
      time: event.time || '00:00', // Don't default to current time!
      notes: event.notes || '',
      feedingType: event.feedingEvent?.feedingType as FeedingType,
      amount: event.feedingEvent?.amount,
      duration: event.feedingEvent?.duration,
      side: event.feedingEvent?.side as 'left' | 'right' | 'both' | undefined,
      images: event.images?.map(img => ({
        id: img.id || crypto.randomUUID(),
        url: img.url,
        key: img.key || '',
        name: img.name || 'image',
        size: img.size || 0,
        uploadedAt: img.uploadedAt || new Date().toISOString(),
        caption: img.caption || ''
      })) || []
    }
  }

  const getDiaperFormDefaultValues = (event: BabyEventWithRelations) => {
    // Preserve original date format if possible
    let dateString: string
    try {
      if (typeof event.date === 'string') {
        // Check if already in YYYY-MM-DD format
        if (event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateString = event.date
        } else {
          // Parse and format
          const parsedDate = new Date(event.date)
          dateString = !isNaN(parsedDate.getTime()) ? format(parsedDate, 'yyyy-MM-dd') : event.date
        }
      } else {
        // Treat as Date object
        dateString = format(event.date as Date, 'yyyy-MM-dd')
      }
    } catch (error) {
      console.error('Error formatting date:', error)
      // Keep original date as string fallback
      dateString = String(event.date)
    }
    
    return {
      date: dateString,
      time: event.time || '00:00', // Don't default to current time!
      notes: event.notes || '',
      wet: event.diaperEvent?.wet || 0,
      dirty: event.diaperEvent?.dirty || 0,
      diaperDetails: {
        color: event.diaperEvent?.color || '',
        consistency: event.diaperEvent?.consistency || ''
      },
      images: event.images?.map(img => ({
        id: img.id || crypto.randomUUID(),
        url: img.url,
        key: img.key || '',
        name: img.name || 'image',
        size: img.size || 0,
        uploadedAt: img.uploadedAt || new Date().toISOString(),
        caption: img.caption || ''
      })) || []
    }
  }

  const getSleepFormDefaultValues = (event: BabyEventWithRelations) => {
    // Preserve original date format if possible
    let dateString: string
    try {
      if (typeof event.date === 'string') {
        // Check if already in YYYY-MM-DD format
        if (event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateString = event.date
        } else {
          // Parse and format
          const parsedDate = new Date(event.date)
          dateString = !isNaN(parsedDate.getTime()) ? format(parsedDate, 'yyyy-MM-dd') : event.date
        }
      } else {
        // Treat as Date object
        dateString = format(event.date as Date, 'yyyy-MM-dd')
      }
    } catch (error) {
      console.error('Error formatting date:', error)
      // Keep original date as string fallback
      dateString = String(event.date)
    }
    
    return {
      date: dateString,
      time: event.time || '00:00', // Don't default to current time!
      notes: event.notes || '',
      duration: event.sleepEvent?.duration,
      sleepType: event.sleepEvent?.sleepType as SleepType,
      startTime: event.sleepEvent?.startTime || '',
      endTime: event.sleepEvent?.endTime || '',
      images: event.images?.map(img => ({
        id: img.id || crypto.randomUUID(),
        url: img.url,
        key: img.key || '',
        name: img.name || 'image',
        size: img.size || 0,
        uploadedAt: img.uploadedAt || new Date().toISOString(),
        caption: img.caption || ''
      })) || []
    }
  }

  const getOtherFormDefaultValues = (event: BabyEventWithRelations) => {
    // Preserve original date format if possible
    let dateString: string
    try {
      if (typeof event.date === 'string') {
        // Check if already in YYYY-MM-DD format
        if (event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateString = event.date
        } else {
          // Parse and format
          const parsedDate = new Date(event.date)
          dateString = !isNaN(parsedDate.getTime()) ? format(parsedDate, 'yyyy-MM-dd') : event.date
        }
      } else {
        // Treat as Date object
        dateString = format(event.date as Date, 'yyyy-MM-dd')
      }
    } catch (error) {
      console.error('Error formatting date:', error)
      // Keep original date as string fallback
      dateString = String(event.date)
    }
    
    return {
      date: dateString,
      time: event.time || '00:00', // Don't default to current time!
      notes: event.notes || '',
      eventType: event.otherEvent?.eventType as OtherEventType,
      description: event.otherEvent?.description || '',
      images: event.images?.map(img => ({
        id: img.id || crypto.randomUUID(),
        url: img.url,
        key: img.key || '',
        name: img.name || 'image',
        size: img.size || 0,
        uploadedAt: img.uploadedAt || new Date().toISOString(),
        caption: img.caption || ''
      })) || []
    }
  }

  // Show loading state while groups are loading
  if (groupsLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-gray-600">Loading your groups...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no active group
  if (!activeGroup) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-6xl">👶</div>
            <h1 className="text-xl font-bold text-gray-900">No Active Group</h1>
            <p className="text-gray-600">You need to select an active group to edit events.</p>
            <Link href="/groups">
              <Button className="inline-flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Manage Groups
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check edit permissions
  if (!activeGroup.permissions.canEdit) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h1 className="text-xl font-bold text-gray-900">No Edit Permission</h1>
            <p className="text-gray-600">
              You don&apos;t have permission to edit events in &quot;{activeGroup.name}&quot;.
            </p>
            <Link href="/groups">
              <Button className="inline-flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Switch Groups
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-gray-600">Loading your precious memory...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-2xl mb-2">💔</div>
            <p className="text-gray-600 mb-4">{error || 'Memory not found'}</p>
            <Button onClick={() => router.push('/timeline')}>
              📖 Back to Your Story
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <Button 
          variant="secondary" 
          onClick={() => router.push('/timeline')}
          className="mb-4"
        >
          ← 📖 Back to Story
        </Button>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">💝 Update Your Memory</h1>
        <p className="text-gray-600">Edit this precious moment and keep your story perfect ✨</p>
      </div>
      
      {event.type === EventType.FEEDING && (
        <FeedingForm 
          onSubmit={handleSubmit} 
          defaultValues={getFeedingFormDefaultValues(event)}
          submitLabel="💕 Update Memory"
        />
      )}
      {event.type === EventType.DIAPER && (
        <DiaperForm 
          onSubmit={handleSubmit} 
          defaultValues={getDiaperFormDefaultValues(event)}
          submitLabel="💕 Update Memory"
        />
      )}
      {event.type === EventType.SLEEP && (
        <SleepForm 
          onSubmit={handleSubmit} 
          defaultValues={getSleepFormDefaultValues(event)}
          submitLabel="💕 Update Memory"
        />
      )}
      {event.type === EventType.OTHER && (
        <OtherForm 
          onSubmit={handleSubmit} 
          defaultValues={getOtherFormDefaultValues(event)}
          submitLabel="💕 Update Memory"
        />
      )}
    </div>
  )
}