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

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [activeGroup, setActiveGroup] = useState<UserGroup | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    console.log('GroupProvider: Setting client to true');
    setIsClient(true);
  }, []);

  // Fetch user's groups
  const fetchGroups = async () => {
    if (!isSignedIn || !isClient) {
      setUserGroups([]);
      setActiveGroup(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching groups for user:', user?.id);
      const response = await fetch('/api/groups');
      console.log('Groups API response status:', response.status);
      
      if (response.ok) {
        const groups = await response.json();
        console.log('Fetched groups:', groups);
        setUserGroups(groups);
        
        // Check if current active group is still valid
        const currentActiveGroupStillExists = activeGroup && groups.find((g: UserGroup) => g.id === activeGroup.id);
        if (activeGroup && !currentActiveGroupStillExists) {
          console.log('Current active group no longer exists, will select new one');
        }
        
        // Handle active group selection with localStorage persistence
        let targetGroup = null;
        
        if (groups.length === 0) {
          console.log('No groups found for user');
          targetGroup = null;
        } else if (groups.length === 1) {
          // If user has only one group, automatically select it (always, regardless of current state)
          targetGroup = groups[0];
          console.log('Auto-selecting single group (forced):', targetGroup.name);
          // Force selection even if it's already the active group to ensure persistence
        } else if (groups.length > 1) {
          // If user has multiple groups, try to use stored preference
          let storedGroupId = null;
          try {
            storedGroupId = localStorage.getItem('activeGroupId');
            console.log('Stored group ID:', storedGroupId);
          } catch (error) {
            console.warn('Failed to access localStorage:', error);
          }
          
          if (storedGroupId) {
            targetGroup = groups.find((g: UserGroup) => g.id === storedGroupId);
            if (targetGroup) {
              console.log('Restored group from localStorage:', targetGroup.name);
            } else {
              console.log('Stored group not found, selecting first available');
              targetGroup = groups[0];
            }
          } else {
            // No stored preference, select first group
            targetGroup = groups[0];
            console.log('No stored preference, selecting first group:', targetGroup.name);
          }
        }
        
        // Set the active group and persist to localStorage
        if (targetGroup) {
          setActiveGroup(targetGroup);
          try {
            localStorage.setItem('activeGroupId', targetGroup.id);
          } catch (error) {
            console.warn('Failed to save active group to localStorage:', error);
          }
        } else {
          // Clear stored group if no groups available
          setActiveGroup(null);
          try {
            localStorage.removeItem('activeGroupId');
          } catch (error) {
            console.warn('Failed to remove active group from localStorage:', error);
          }
        }
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch groups:', response.status, errorData);
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

    // Set active group
    setActiveGroup(targetGroup);
    try {
      localStorage.setItem('activeGroupId', targetGroupId);
      console.log('Switched to group:', targetGroup.name);
    } catch (error) {
      console.warn('Failed to save group selection to localStorage:', error);
    }
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
        fetchGroups();
      } else {
        console.log('GroupProvider: User not signed in, clearing groups');
        setUserGroups([]);
        setActiveGroup(null);
        setIsLoading(false);
        try {
          localStorage.removeItem('activeGroupId');
        } catch (error) {
          console.warn('Failed to remove active group from localStorage on sign out:', error);
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