"use client";

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Users, Plus, UserPlus } from 'lucide-react';
import { useGroup } from '@/contexts/GroupContext';

export default function SetupPage() {
  const { user } = useUser();
  const router = useRouter();
  const { refreshGroups } = useGroup();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    groupName: '',
    groupDescription: '',
    inviteCode: ''
  });

  const handleCreateGroup = async () => {
    if (!formData.groupName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.groupName,
          description: formData.groupDescription
        })
      });

      if (response.ok) {
        console.log('Setup page: Group created successfully, refreshing group context...');
        await refreshGroups(); // Update global group state
        router.push('/');
      } else {
        console.error('Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!formData.inviteCode.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: formData.inviteCode
        })
      });

      if (response.ok) {
        console.log('Setup page: Joined group successfully, refreshing group context...');
        await refreshGroups(); // Update global group state
        router.push('/');
      } else {
        console.error('Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen flex items-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName}! 🎉
          </h1>
          <p className="text-gray-600 text-lg">
            Let's get you set up to start tracking your baby's journey
          </p>
        </div>

        {!mode && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create New Group */}
            <div className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                 onClick={() => setMode('create')}>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Create New Family Group
                </h3>
                <p className="text-gray-600 mb-4">
                  Start a new group for your family to track your baby's activities together
                </p>
                <Button variant="outline" className="w-full">
                  Create Group
                </Button>
              </div>
            </div>

            {/* Join Existing Group */}
            <div className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer"
                 onClick={() => setMode('join')}>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Join Existing Group
                </h3>
                <p className="text-gray-600 mb-4">
                  Join a family group that's already been created by someone else
                </p>
                <Button variant="outline" className="w-full">
                  Join Group
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Group Form */}
        {mode === 'create' && (
          <div className="bg-white p-8 rounded-xl border shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Create Your Family Group
              </h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., The Smith Family, Baby Emma's Journey"
                  value={formData.groupName}
                  onChange={(e) => setFormData({...formData, groupName: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <Textarea
                  placeholder="Tell us about your baby or family..."
                  value={formData.groupDescription}
                  onChange={(e) => setFormData({...formData, groupDescription: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setMode(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!formData.groupName.trim() || loading}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Join Group Form */}
        {mode === 'join' && (
          <div className="bg-white p-8 rounded-xl border shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Join a Family Group
              </h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Code *
                </label>
                <Input
                  type="text"
                  placeholder="Enter the invite code shared with you"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({...formData, inviteCode: e.target.value})}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ask the group creator for their invite code
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setMode(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoinGroup}
                  disabled={!formData.inviteCode.trim() || loading}
                  className="flex-1"
                >
                  {loading ? 'Joining...' : 'Join Group'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}