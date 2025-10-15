"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Plus, Milk, Baby, Clock, Edit, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatsCharts } from "@/components/StatsCharts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useGroup } from "@/contexts/GroupContext";

interface DailyStats {
  date: string;
  totalFeedings: number;
  totalAmount?: number;
  totalDiapers: number;
  wetDiapers: number;
  dirtyDiapers: number;
  totalSleep?: number;
  totalEvents: number;
}

interface RecentEvent {
  id: string;
  type: string;
  time: string;
  date: string;
  feedingEvent?: {
    feedingType: string;
    amount?: number;
    duration?: number;
    side?: string;
  };
  diaperEvent?: {
    wet: number;
    dirty: number;
  };
  sleepEvent?: {
    sleepType: string;
    duration?: number;
  };
}

export default function Home() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { activeGroup, userGroups, isLoading: groupsLoading, switchGroup } = useGroup();
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGroups, setHasGroups] = useState<boolean | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; eventId?: string; eventType?: string }>({
    isOpen: false
  });

  // Ensure userGroups is always an array to prevent runtime errors
  const safeUserGroups = Array.isArray(userGroups) ? userGroups : [];

  // Debug logging
  console.log('Home page render:', {
    isLoaded,
    userId: user?.id,
    activeGroup: activeGroup?.name,
    userGroupsCount: safeUserGroups.length,
    groupsLoading,
    hasGroups
  });

  // Check for user groups on initial load
  useEffect(() => {
    if (isLoaded && user) {
      checkUserGroups();
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (hasGroups && activeGroup?.id) {
      fetchDashboardData();
    }
  }, [hasGroups, activeGroup?.id]);

  const checkUserGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        const userHasGroups = data.success && data.data.groups.length > 0;
        setHasGroups(userHasGroups);
        
        if (!userHasGroups) {
          router.push('/setup');
        }
      }
    } catch (error) {
      console.error('Error checking user groups:', error);
      setHasGroups(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Only fetch data if we have an active group
      if (!activeGroup?.id) {
        console.log('No active group, skipping dashboard data fetch');
        setIsLoading(false);
        return;
      }

      // Fetch today's stats for the active group
      const statsRes = await fetch(`/api/stats?days=1&groupId=${activeGroup.id}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data.dailyStats.length > 0) {
          setTodayStats(statsData.data.dailyStats[0]);
        }
      }

      // Fetch recent events for the active group
      const eventsRes = await fetch(`/api/events?limit=5&groupId=${activeGroup.id}`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (eventsData.success) {
          setRecentEvents(eventsData.data.events);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'feeding':
        return <Milk className="w-4 h-4" />;
      case 'diaper':
        return <Baby className="w-4 h-4" />;
      case 'sleep':
        return <Clock className="w-4 h-4" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const getEventDescription = (event: RecentEvent) => {
    switch (event.type) {
      case 'feeding':
        const feeding = event.feedingEvent;
        if (!feeding) return 'Feeding';
        
        let desc = feeding.feedingType.replace('_', ' ');
        if (feeding.amount) desc += ` - ${feeding.amount}ml`;
        if (feeding.duration) desc += ` - ${feeding.duration}min`;
        if (feeding.side) desc += ` (${feeding.side})`;
        return desc;
        
      case 'diaper':
        const diaper = event.diaperEvent;
        if (!diaper) return 'Diaper change';
        
        const parts = [];
        if (diaper.wet > 0) parts.push(`${diaper.wet} wet`);
        if (diaper.dirty > 0) parts.push(`${diaper.dirty} dirty`);
        return `Diaper: ${parts.join(', ')}`;
        
      case 'sleep':
        const sleep = event.sleepEvent;
        if (!sleep) return 'Sleep';
        
        let sleepDesc = sleep.sleepType.replace('_', ' ');
        if (sleep.duration) sleepDesc += ` - ${sleep.duration}min`;
        return sleepDesc;
        
      default:
        return event.type;
    }
  };

  const handleEdit = (eventId: string) => {
    router.push(`/edit/${eventId}`);
  };

  const handleDeleteClick = (eventId: string, eventType: string) => {
    setDeleteDialog({
      isOpen: true,
      eventId,
      eventType
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.eventId) return;

    try {
      const response = await fetch(`/api/events/${deleteDialog.eventId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove event from local state and refresh dashboard data
        setRecentEvents(prev => prev.filter(event => event.id !== deleteDialog.eventId));
        setDeleteDialog({ isOpen: false });
        // Refresh dashboard stats
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`💔 We couldn't remove that moment right now. ${error.error || 'Please try again in a moment'} 💕`);
      }
    } catch (error) {
      alert('💔 Something went wrong removing that memory. Please try again! 💕');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false });
  };

  // Show loading while checking authentication and groups
  if (!isLoaded || hasGroups === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">👶</div>
          <div className="text-lg text-gray-600 mb-2">Setting up your baby&apos;s journey...</div>
          <div className="animate-pulse text-sm text-gray-400">Just a moment! ✨</div>
        </div>
      </div>
    );
  }

  // Show group selection grid when no active group is selected
  if (hasGroups && !activeGroup?.id && !groupsLoading) {
    return (
      <div className="px-4 lg:px-0">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">👥</div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Select Your Baby&apos;s Group
          </h1>
          <p className="text-gray-600 text-sm lg:text-base max-w-2xl mx-auto">
            Choose which group you&apos;d like to view and track precious moments for ✨
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto">
          {safeUserGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => {
                console.log('Selecting group:', group.name);
                setIsLoading(true);
                switchGroup(group);
              }}
              className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md hover:border-blue-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-left group active:scale-95"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-2xl">
                  {group.name.includes('👶') || group.name.includes('🍼') || group.name.includes('💕') 
                    ? '�' : '🍼'}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  group.role === 'owner' 
                    ? 'bg-purple-100 text-purple-800' 
                    : group.role === 'admin'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {group.role}
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {group.name}
              </h3>
              
              {group.description && (
                <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {group.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  <span>{group.stats.memberCount} member{group.stats.memberCount !== 1 ? 's' : ''}</span>
                </div>
                <div>
                  {group.stats.eventCount} moment{group.stats.eventCount !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="text-xs text-gray-400 border-t pt-2 mb-3">
                Owner: {group.owner.name}
              </div>
              
              <div className="text-xs text-blue-600 font-medium group-hover:text-blue-700">
                Click to select →
              </div>
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/groups">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Manage Groups
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (isLoading && hasGroups) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header - Mobile optimized */}
      <div className="text-center px-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          💕 Your Baby&apos;s Daily Journey
        </h1>
        <p className="text-gray-600 text-sm lg:text-base max-w-2xl mx-auto">
          Capturing precious moments and sweet milestones with love ✨
        </p>
      </div>

      {/* Quick Add Button - Mobile sticky */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Link href="/add">
          <Button className="w-14 h-14 rounded-full shadow-lg">
            <Plus className="w-6 h-6" />
          </Button>
        </Link>
      </div>

      {/* Quick Stats - Mobile optimized grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 px-4 lg:px-0">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="text-xl lg:text-2xl font-bold text-blue-600 mb-1">
            {todayStats?.totalFeedings || 0}
          </div>
          <div className="text-xs lg:text-sm text-gray-600">🍼 Feeding Sessions</div>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="text-xl lg:text-2xl font-bold text-green-600 mb-1">
            {todayStats?.totalDiapers || 0}
          </div>
          <div className="text-xs lg:text-sm text-gray-600">👶 Fresh Diapers</div>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="text-xl lg:text-2xl font-bold text-purple-600 mb-1">
            {todayStats?.totalSleep ? `${Math.floor(todayStats.totalSleep / 60)}h` : '0h'}
          </div>
          <div className="text-xs lg:text-sm text-gray-600">😴 Sweet Dreams</div>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border">
          <div className="text-xl lg:text-2xl font-bold text-orange-600 mb-1">
            {todayStats?.totalEvents || 0}
          </div>
          <div className="text-xs lg:text-sm text-gray-600">💝 Precious Moments</div>
        </div>
      </div>

      {/* Recent Activity - Mobile optimized */}
      <div className="bg-white mx-4 lg:mx-0 p-4 lg:p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">🌟 Recent Sweet Moments</h2>
          <div className="hidden lg:block">
            <Link href="/add">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Moment
              </Button>
            </Link>
          </div>
        </div>
        
        {recentEvents.length === 0 ? (
          <div className="text-center py-8 lg:py-12">
            <div className="mb-4">
              <Baby className="w-12 h-12 text-gray-300 mx-auto" />
            </div>
            <p className="text-gray-500 mb-2">Ready to start your journey? 🌟</p>
            <p className="text-sm text-gray-400 mb-4">
                                You&apos;re doing amazing! 💕 No events yet - ready to capture your first beautiful moment?
            </p>
            <div className="lg:hidden">
              <Link href="/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Capture First Moment
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 text-gray-500">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getEventDescription(event)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(event.date), 'MMM d')} at {formatTime(event.time)}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(event.id)}
                    className="p-1.5 hover:bg-gray-200"
                  >
                    <Edit className="w-3 h-3 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(event.id, event.type)}
                    className="p-1.5 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-center pt-2">
              <Link href="/timeline">
                <Button variant="outline" size="sm">
                  See All Sweet Moments ✨
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <StatsCharts className="mx-4 lg:mx-0" />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="💕 Remove this precious moment?"
        message={`This ${deleteDialog.eventType} memory will be removed from your baby's story. Are you sure you'd like to do this? 💔`}
        confirmText="Yes, remove it"
        cancelText="Keep it safe"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
