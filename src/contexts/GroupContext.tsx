"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface UserGroup {
  id: string;
  name: string;
  description: string;
  role: string;
  permissions: {
    canRead: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  owner: {
    id: string;
    name: string;
  };
  stats: {
    memberCount: number;
    eventCount: number;
  };
  joinedAt: string;
}

interface GroupContextType {
  activeGroup: UserGroup | null;
  userGroups: UserGroup[];
  isLoading: boolean;
  switchGroup: (groupIdOrGroup: string | UserGroup) => void;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

// Helper function to safely load from localStorage
const loadFromLocalStorage = (key: string, defaultValue: any = null) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [activeGroup, setActiveGroup] = useState<UserGroup | null>(() => 
    loadFromLocalStorage('activeGroup', null)
  );
  const [userGroups, setUserGroups] = useState<UserGroup[]>(() => 
    loadFromLocalStorage('userGroups', [])
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Set client to true and log initial state
  useEffect(() => {
    console.log('GroupProvider: Setting client to true');
    console.log('Initial state from localStorage:', {
      userGroups: userGroups.length,
      activeGroup: activeGroup?.name,
    });
    setIsClient(true);
  }, []);

  // Fetch user's groups and preferences
  const fetchGroups = async () => {
    if (!isSignedIn || !isClient) {
      setUserGroups([]);
      setActiveGroup(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching groups and preferences for user:', user?.id);
      
      // Fetch both groups and user preferences in parallel
      const [groupsResponse, preferencesResponse] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/user/preferences')
      ]);
      
      console.log('Groups API response status:', groupsResponse.status);
      console.log('Preferences API response status:', preferencesResponse.status);
      
      if (groupsResponse.ok) {
        const groups = await groupsResponse.json();
        console.log('Fetched groups:', groups);
        const groupsData = groups.data?.groups || [];
        setUserGroups(groupsData);
        
        // Store groups to localStorage
        try {
          localStorage.setItem('userGroups', JSON.stringify(groupsData));
          console.log('Stored groups to localStorage:', groupsData.length);
        } catch (error) {
          console.warn('Failed to store groups to localStorage:', error);
        }
        
        // Handle user preferences for active group
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          console.log('Fetched preferences:', preferencesData);
          
          if (preferencesData.success && preferencesData.data.activeGroup) {
            const activeGroupFromDB = preferencesData.data.activeGroup;
            console.log('Setting active group from database:', activeGroupFromDB.name);
            setActiveGroup(activeGroupFromDB);
            
            // Sync with localStorage as backup
            try {
              localStorage.setItem('activeGroupId', activeGroupFromDB.id);
              localStorage.setItem('activeGroup', JSON.stringify(activeGroupFromDB));
            } catch (error) {
              console.warn('Failed to sync active group to localStorage:', error);
            }
          } else if (groups.length > 0) {
            // If no active group in preferences but user has groups, the API will set the most recent one
            console.log('No active group in preferences, API should have set most recent group');
            // Refetch preferences to get the updated active group
            const updatedPreferencesResponse = await fetch('/api/user/preferences');
            if (updatedPreferencesResponse.ok) {
              const updatedPreferences = await updatedPreferencesResponse.json();
              if (updatedPreferences.success && updatedPreferences.data.activeGroup) {
                const autoSelectedGroup = updatedPreferences.data.activeGroup;
                console.log('Auto-selected group from database:', autoSelectedGroup.name);
                setActiveGroup(autoSelectedGroup);
                
                try {
                  localStorage.setItem('activeGroupId', autoSelectedGroup.id);
                  localStorage.setItem('activeGroup', JSON.stringify(autoSelectedGroup));
                } catch (error) {
                  console.warn('Failed to sync auto-selected group to localStorage:', error);
                }
              }
            }
          } else {
            console.log('No groups available for user');
            setActiveGroup(null);
            try {
              localStorage.removeItem('activeGroupId');
              localStorage.removeItem('activeGroup');
              localStorage.removeItem('userGroups');
            } catch (error) {
              console.warn('Failed to remove group data from localStorage:', error);
            }
          }
        } else {
          // Preferences API failed, fall back to localStorage + first group logic
          console.warn('Preferences API failed, falling back to localStorage');
          let fallbackGroup = null;
          
          // Try localStorage first
          try {
            const storedGroupId = localStorage.getItem('activeGroupId');
            if (storedGroupId) {
              fallbackGroup = groups.find((g: UserGroup) => g.id === storedGroupId);
              console.log('Found group in localStorage:', fallbackGroup?.name);
            }
          } catch (error) {
            console.warn('Failed to access localStorage:', error);
          }
          
          // If no localStorage or group not found, use first available group
          if (!fallbackGroup && groups.length > 0) {
            fallbackGroup = groups[0];
            console.log('Using first available group as fallback:', fallbackGroup.name);
          }
          
          if (fallbackGroup) {
            setActiveGroup(fallbackGroup);
            // Try to update database preferences in background
            fetch('/api/user/preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activeGroupId: fallbackGroup.id })
            }).catch(error => {
              console.warn('Failed to sync group selection to database:', error);
            });
          } else {
            setActiveGroup(null);
          }
        }
      } else {
        const errorData = await groupsResponse.text();
        console.error('Failed to fetch groups:', groupsResponse.status, errorData);
        setUserGroups([]);
        setActiveGroup(null);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setUserGroups([]);
      setActiveGroup(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch active group
  const switchGroup = (groupIdOrGroup: string | UserGroup) => {
    let targetGroup: UserGroup | undefined;
    let targetGroupId: string;

    if (typeof groupIdOrGroup === 'string') {
      // Handle string ID
      targetGroupId = groupIdOrGroup;
      const safeUserGroups = Array.isArray(userGroups) ? userGroups : [];
      targetGroup = safeUserGroups.find(g => g.id === targetGroupId);
      
      if (!targetGroup) {
        console.error('Group not found for ID:', targetGroupId, 'Available groups:', safeUserGroups.map(g => ({id: g.id, name: g.name})));
        // Try to refresh groups and then retry
        console.log('Refreshing groups and retrying...');
        refreshGroups();
        return;
      }
    } else {
      // Handle group object directly
      targetGroup = groupIdOrGroup;
      targetGroupId = targetGroup.id;
      console.log('Switching to group object:', targetGroup.name);
    }

    // Set active group immediately for responsive UI
    setActiveGroup(targetGroup);
    console.log('Switched to group:', targetGroup.name);

    // Persist to database (primary) and localStorage (backup) asynchronously
    Promise.all([
      // Update database preferences
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeGroupId: targetGroupId })
      }).then(response => {
        if (!response.ok) {
          console.warn('Failed to update active group in database:', response.status);
        } else {
          console.log('Successfully updated active group in database');
        }
        return response;
      }),
      
      // Update localStorage as backup
      (async () => {
        try {
          localStorage.setItem('activeGroupId', targetGroupId);
          localStorage.setItem('activeGroup', JSON.stringify(targetGroup));
          console.log('Successfully updated active group in localStorage');
        } catch (error) {
          console.warn('Failed to save group selection to localStorage:', error);
        }
      })()
    ]).catch(error => {
      console.warn('Error during group switch persistence:', error);
      // UI already updated, so this is non-blocking
    });
  };

  // Refresh groups (for use after creating/joining new groups)
  const refreshGroups = async () => {
    setIsLoading(true);
    await fetchGroups();
  };

  useEffect(() => {
    console.log('GroupProvider useEffect:', { isClient, isSignedIn, user: user?.id });
    if (isClient) {
      if (isSignedIn) {
        console.log('GroupProvider: Calling fetchGroups');
        // If we already have data from localStorage, reduce loading state immediately
        if (userGroups.length > 0) {
          setIsLoading(false);
        }
        fetchGroups();
      } else {
        console.log('GroupProvider: User not signed in, clearing groups');
        setUserGroups([]);
        setActiveGroup(null);
        setIsLoading(false);
        try {
          localStorage.removeItem('activeGroupId');
          localStorage.removeItem('activeGroup');
          localStorage.removeItem('userGroups');
        } catch (error) {
          console.warn('Failed to remove group data from localStorage on sign out:', error);
        }
      }
    }
  }, [isSignedIn, isClient]);

  // Debug user state
  useEffect(() => {
    console.log('GroupProvider: User state changed:', { 
      isSignedIn, 
      userId: user?.id, 
      userGroups: Array.isArray(userGroups) ? userGroups.length : 0,
      activeGroup: activeGroup?.name 
    });
  }, [isSignedIn, user?.id, userGroups, activeGroup]);

  // Additional effect to handle group changes and ensure single group is always active
  useEffect(() => {
    const safeUserGroups = Array.isArray(userGroups) ? userGroups : [];
    if (isClient && safeUserGroups.length === 1 && (!activeGroup || activeGroup.id !== safeUserGroups[0].id)) {
      console.log('Detected single group, ensuring it is active:', safeUserGroups[0].name);
      setActiveGroup(safeUserGroups[0]);
      try {
        localStorage.setItem('activeGroupId', safeUserGroups[0].id);
        localStorage.setItem('activeGroup', JSON.stringify(safeUserGroups[0]));
      } catch (error) {
        console.warn('Failed to save single group to localStorage:', error);
      }
    }
  }, [userGroups, activeGroup, isClient]);

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        userGroups,
        isLoading,
        switchGroup,
        refreshGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}