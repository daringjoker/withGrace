import { useState, useEffect, useCallback, useRef } from 'react';
import { eventsAPI } from '@/lib/eventsAPI';
import { cacheManager } from '@/lib/queryClient';

interface UseEventsOptions {
  filters?: {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  };
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseEventsResult {
  events: any[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  isStale: boolean;
  isSyncing: boolean;
  refetch: () => Promise<void>;
  createEvent: (eventData: any) => Promise<void>;
  updateEvent: (id: string, eventData: any) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  syncStatus: {
    lastSync: number;
    pendingChanges: number;
    isOnline: boolean;
    syncInProgress: boolean;
  };
}

export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const { filters = {}, enabled = true, refetchInterval = 0 } = options;
  
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Get sync status
  const [syncStatus, setSyncStatus] = useState(cacheManager.getSyncStatus());

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = () => {
      setSyncStatus(cacheManager.getSyncStatus());
    };

    const interval = setInterval(updateSyncStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch events function - optimized for cache-first immediate rendering
  const fetchEvents = useCallback(async (showLoading: boolean = false) => {
    if (!enabled) return;
    
    // Only show loading for initial fetch when no cached data exists
    const cacheKey = `events-${JSON.stringify(filters)}`;
    const cached = cacheManager.get(cacheKey);
    const hasCache = cached?.data;
    
    if (showLoading && !hasCache) {
      setIsLoading(true);
    }
    setIsError(false);
    setError(null);
    
    try {
      const response = await eventsAPI.getEvents(filters);
      
      if (!mountedRef.current) return;
      
      if (response.success && response.data) {
        setEvents(response.data.events || []);
        setIsStale(response.timestamp ? Date.now() - response.timestamp > 1000 * 60 * 5 : false);
        setIsError(false);
        setError(null);
      } else {
        setIsError(true);
        setError(response.error || 'Failed to fetch events');
        
        // Try to use cached data even on error
        const fallbackCached = cacheManager.get(`events-${JSON.stringify(filters)}`);
        if (fallbackCached?.data && typeof fallbackCached.data === 'object' && 'events' in fallbackCached.data) {
          setEvents(Array.isArray(fallbackCached.data.events) ? fallbackCached.data.events : []);
          setIsStale(true);
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      setIsError(true);
      setError(err instanceof Error ? err.message : 'Network error');
      
      // Try to use cached data on network error
      const fallbackCached = cacheManager.get(`events-${JSON.stringify(filters)}`);
      if (fallbackCached?.data && typeof fallbackCached.data === 'object' && 'events' in fallbackCached.data) {
        setEvents(Array.isArray(fallbackCached.data.events) ? fallbackCached.data.events : []);
        setIsStale(true);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, filters]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchEvents(true);
  }, [fetchEvents]);

  // Create event with optimistic updates
  const createEvent = useCallback(async (eventData: any) => {
    setIsSyncing(true);
    
    try {
      const response = await eventsAPI.createEvent(eventData);
      
      if (response.success) {
        // Refresh events list to show new event
        await fetchEvents(false);
      } else {
        setError(response.error || 'Failed to create event');
        
        // Still refresh to show optimistic update
        await fetchEvents(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      
      // Refresh to show optimistic update
      await fetchEvents(false);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchEvents]);

  // Update event with optimistic updates
  const updateEvent = useCallback(async (id: string, eventData: any) => {
    setIsSyncing(true);
    
    try {
      const response = await eventsAPI.updateEvent(id, eventData);
      
      if (response.success) {
        await fetchEvents(false);
      } else {
        setError(response.error || 'Failed to update event');
        await fetchEvents(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      await fetchEvents(false);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchEvents]);

  // Delete event with optimistic updates
  const deleteEvent = useCallback(async (id: string) => {
    setIsSyncing(true);
    
    try {
      const response = await eventsAPI.deleteEvent(id);
      
      if (response.success) {
        await fetchEvents(false);
      } else {
        setError(response.error || 'Failed to delete event');
        await fetchEvents(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      await fetchEvents(false);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchEvents]);

  // Background sync function
  const performBackgroundSync = useCallback(async () => {
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      await eventsAPI.syncPendingChanges();
      await fetchEvents(false);
    } catch (err) {
      console.warn('Background sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchEvents, isSyncing]);

  // Initial fetch
  useEffect(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  // Setup refetch interval
  useEffect(() => {
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        if ((typeof navigator === 'undefined' || navigator.onLine) && !isLoading && !isSyncing) {
          fetchEvents(false);
        }
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, fetchEvents, isLoading, isSyncing]);

  // Setup online event listeners for background sync
  useEffect(() => {
    const handleOnline = () => {
      // Delay to let network stabilize
      setTimeout(performBackgroundSync, 1000);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [performBackgroundSync]);

  // Setup page visibility change for background sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (typeof navigator === 'undefined' || navigator.onLine)) {
        // Refresh when page becomes visible
        setTimeout(() => fetchEvents(false), 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchEvents]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    events,
    isLoading,
    isError,
    error,
    isStale,
    isSyncing,
    refetch,
    createEvent,
    updateEvent,
    deleteEvent,
    syncStatus,
  };
}

// Hook for individual event
export function useEvent(id: string, enabled: boolean = true) {
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!enabled || !id) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await eventsAPI.getEvent(id);

      if (response.success && response.data) {
        setEvent(response.data);
        setIsError(false);
        setError(null);
      } else {
        setIsError(true);
        setError(response.error || 'Failed to fetch event');
      }
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return {
    event,
    isLoading,
    isError,
    error,
    refetch: fetchEvent,
  };
}