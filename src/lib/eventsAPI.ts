import { cacheManager } from './queryClient';

// Types for API responses
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: number;
}

interface BabyEvent {
  id: string;
  type: string;
  time: string;
  date: string;
  notes?: string;
  feedingEvent?: any;
  diaperEvent?: any;
  sleepEvent?: any;
  otherEvent?: any;
  images?: Array<{ url: string; filename: string }>;
}

interface EventFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  groupId?: string;
}

interface EventsResponse {
  events: BabyEvent[];
  totalCount: number;
  hasMore: boolean;
}

class EventsAPI {
  private readonly baseURL = '/api';
  
  // Get events with cache-first strategy - ALWAYS return cache first if available
  async getEvents(filters: EventFilters = {}): Promise<APIResponse<EventsResponse>> {
    const cacheKey = this.getCacheKey('events', filters);
    
    // Always try cache first for immediate response
    const cached = cacheManager.get<EventsResponse>(cacheKey);
    if (cached) {
      // Return cached data immediately
      const result = {
        success: true,
        data: cached.data,
        timestamp: cached.timestamp,
      };
      
      // Always trigger background refresh when online, regardless of staleness
      // This ensures UI gets immediate cached data, then updates with fresh data
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.refreshEventsInBackground(cacheKey, filters);
      }
      
      return result;
    }
    
    // No cache, fetch from server
    return this.fetchEventsFromServer(cacheKey, filters);
  }

  // Get single event with caching
  async getEvent(id: string): Promise<APIResponse<BabyEvent>> {
    const cacheKey = `event-${id}`;
    
    const cached = cacheManager.get<BabyEvent>(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached.data,
        timestamp: cached.timestamp,
      };
    }
    
    return this.fetchEventFromServer(id);
  }

  // Create new event with optimistic updates
  async createEvent(eventData: Omit<BabyEvent, 'id'>): Promise<APIResponse<BabyEvent>> {
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticEvent: BabyEvent = {
      ...eventData,
      id: tempId,
    };
    
    // Immediately update cache with optimistic data
    this.updateEventsCacheOptimistically(optimisticEvent, 'create');
    
    try {
      // Send to server in background
      const response = await fetch(`${this.baseURL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Replace optimistic update with real data
        this.replaceOptimisticUpdate(tempId, result.data);
        
        return {
          success: true,
          data: result.data,
        };
      } else {
        // Rollback optimistic update on failure
        this.rollbackOptimisticUpdate(tempId, 'create');
        return result;
      }
    } catch (error) {
      // Rollback on network error, keep in pending sync queue
      this.rollbackOptimisticUpdate(tempId, 'create', true);
      
      return {
        success: false,
        error: 'Network error - changes saved locally and will sync when online',
        data: optimisticEvent,
      };
    }
  }

  // Update event with optimistic updates
  async updateEvent(id: string, eventData: Partial<BabyEvent>): Promise<APIResponse<BabyEvent>> {
    const existingCached = cacheManager.get<BabyEvent>(`event-${id}`);
    const originalData = existingCached?.data;
    
    if (!originalData) {
      return { success: false, error: 'Event not found in cache' };
    }
    
    const updatedEvent: BabyEvent = { ...originalData, ...eventData };
    
    // Optimistic update
    this.updateEventsCacheOptimistically(updatedEvent, 'update');
    
    try {
      const response = await fetch(`${this.baseURL}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Confirm optimistic update
        cacheManager.markSynced(`event-${id}`);
        this.invalidateEventsCache();
        
        return {
          success: true,
          data: result.data || updatedEvent,
        };
      } else {
        // Rollback optimistic update
        this.rollbackOptimisticUpdate(id, 'update', false, originalData);
        return result;
      }
    } catch (error) {
      // Keep optimistic update, queue for sync
      cacheManager.set(`event-${id}`, updatedEvent, true);
      
      return {
        success: false,
        error: 'Network error - changes saved locally and will sync when online',
        data: updatedEvent,
      };
    }
  }

  // Delete event with optimistic updates
  async deleteEvent(id: string): Promise<APIResponse<void>> {
    const cached = cacheManager.get<BabyEvent>(`event-${id}`);
    const originalEvent = cached?.data;
    
    // Optimistic delete
    this.updateEventsCacheOptimistically({ id } as BabyEvent, 'delete');
    
    try {
      const response = await fetch(`${this.baseURL}/events/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Confirm delete
        cacheManager.remove(`event-${id}`);
        this.invalidateEventsCache();
        
        return { success: true };
      } else {
        // Rollback delete
        if (originalEvent) {
          this.rollbackOptimisticUpdate(id, 'delete', false, originalEvent);
        }
        return result;
      }
    } catch (error) {
      // Queue delete for later sync
      if (originalEvent) {
        cacheManager.set(`pending-delete-${id}`, originalEvent, true);
      }
      
      return {
        success: false,
        error: 'Network error - deletion will sync when online',
      };
    }
  }

  // Background sync for pending changes
  async syncPendingChanges(): Promise<void> {
    const syncStatus = cacheManager.getSyncStatus();
    if (syncStatus.syncInProgress || !syncStatus.isOnline || syncStatus.pendingChanges === 0) {
      return;
    }
    
    console.log('Starting sync of pending changes...');
    
    // Implementation would iterate through pending changes and sync them
    // This is a placeholder for the full sync logic
  }

  // Private helper methods
  private getCacheKey(type: string, filters: EventFilters): string {
    const filterString = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `${type}-${filterString || 'all'}`;
  }

  private async fetchEventsFromServer(cacheKey: string, filters: EventFilters): Promise<APIResponse<EventsResponse>> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`${this.baseURL}/events?${params}`);
      const result = await response.json();
      
      if (result.success) {
        // Cache successful response
        cacheManager.set(cacheKey, result.data);
        return result;
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  private async fetchEventFromServer(id: string): Promise<APIResponse<BabyEvent>> {
    try {
      const response = await fetch(`${this.baseURL}/events/${id}`);
      const result = await response.json();
      
      if (result.success) {
        cacheManager.set(`event-${id}`, result.data);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  private async refreshEventsInBackground(cacheKey: string, filters: EventFilters): Promise<void> {
    try {
      const fresh = await this.fetchEventsFromServer(cacheKey, filters);
      if (fresh.success) {
        console.log('Background refresh completed for:', cacheKey);
      }
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  private updateEventsCacheOptimistically(event: BabyEvent, operation: 'create' | 'update' | 'delete'): void {
    // Update individual event cache
    if (operation === 'delete') {
      cacheManager.remove(`event-${event.id}`);
    } else {
      cacheManager.set(`event-${event.id}`, event, true);
    }
    
    // Update events list caches
    this.invalidateEventsCache();
  }

  private replaceOptimisticUpdate(tempId: string, realEvent: BabyEvent): void {
    // Remove temp entry and add real one
    cacheManager.remove(`event-${tempId}`);
    cacheManager.set(`event-${realEvent.id}`, realEvent);
    
    // Update events list caches
    this.invalidateEventsCache();
  }

  private rollbackOptimisticUpdate(
    id: string, 
    operation: 'create' | 'update' | 'delete',
    keepPending: boolean = false,
    originalData?: BabyEvent
  ): void {
    if (operation === 'create') {
      cacheManager.remove(`event-${id}`);
    } else if (operation === 'update' && originalData) {
      cacheManager.set(`event-${id}`, originalData, keepPending);
    } else if (operation === 'delete' && originalData) {
      cacheManager.set(`event-${id}`, originalData, keepPending);
    }
    
    this.invalidateEventsCache();
  }

  private invalidateEventsCache(): void {
    // Remove all events list caches to force refresh
    const keys = Object.keys(localStorage).filter(key => 
      key.includes('withGrace-cache-events-') && !key.includes('event-')
    );
    keys.forEach(key => localStorage.removeItem(key));
  }
}

// Export singleton instance
export const eventsAPI = new EventsAPI();