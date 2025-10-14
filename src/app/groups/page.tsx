"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, Plus, Settings, Share, Crown, Eye, Edit, UserPlus, Trash2 } from 'lucide-react';
import { useGroup } from '@/contexts/GroupContext';

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

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  permissions: {
    canRead: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  joinedAt: string;
  isOwner: boolean;
  user: {
    id: string;
    clerkId: string;
    email: string;
    name: string | null;
    imageUrl: string | null;
  };
}

export default function GroupsPage() {
  const { user } = useUser();
  const { refreshGroups, switchGroup, activeGroup } = useGroup();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [shareDialog, setShareDialog] = useState<{ isOpen: boolean; group?: UserGroup }>({ isOpen: false });
  const [manageDialog, setManageDialog] = useState<{ isOpen: boolean; group?: UserGroup }>({ isOpen: false });
  const [membersDialog, setMembersDialog] = useState<{ isOpen: boolean; group?: UserGroup; members: GroupMember[] }>({ isOpen: false, members: [] });
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.success ? data.data.groups : []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewGroup({ name: '', description: '' });
        console.log('Groups page: Group created successfully, refreshing group context...');
        fetchGroups();
        await refreshGroups(); // Update global group state
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleShare = (group: UserGroup) => {
    setShareDialog({ isOpen: true, group });
  };

  const handleManage = (group: UserGroup) => {
    setManageDialog({ isOpen: true, group });
  };

  const copyInviteCode = (groupId: string) => {
    // For now, use the group ID as invite code
    // In production, you'd have proper invite codes
    navigator.clipboard.writeText(groupId);
    alert('Invite code copied to clipboard! 📋');
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (response.ok) {
        const members = await response.json();
        return members;
      } else {
        console.error('Failed to fetch members');
        return [];
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  };

  const handleManageMembers = async (group: UserGroup) => {
    const members = await fetchGroupMembers(group.id);
    setMembersDialog({ isOpen: true, group, members });
  };

  const handleUpdateMember = async (memberId: string, role: string, permissions: any) => {
    if (!membersDialog.group) return;

    try {
      const response = await fetch(`/api/groups/${membersDialog.group.id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role, permissions }),
      });

      if (response.ok) {
        // Refresh members list
        const members = await fetchGroupMembers(membersDialog.group.id);
        setMembersDialog(prev => ({ ...prev, members }));
        setEditingMember(null);
        
        // Check if the updated member is the current user and refresh context if so
        const updatedMember = members.find((m: GroupMember) => m.id === memberId);
        if (updatedMember?.user.clerkId === user?.id) {
          console.log('Groups page: Current user permissions updated, refreshing group context...');
          await refreshGroups(); // Update global group state for current user
        }
        
        alert('Member updated successfully! ✅');
      } else {
        const error = await response.json();
        alert(`Failed to update member: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!membersDialog.group) return;

    if (confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      try {
        const response = await fetch(`/api/groups/${membersDialog.group.id}/members`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId }),
        });

        if (response.ok) {
          // Refresh members list
          const members = await fetchGroupMembers(membersDialog.group.id);
          setMembersDialog(prev => ({ ...prev, members }));
          alert('Member removed successfully! 🗑️');
        } else {
          const error = await response.json();
          alert(`Failed to remove member: ${error.error}`);
        }
      } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member');
      }
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to leave "${groupName}"? You'll lose access to all group memories.`)) {
      try {
        const response = await fetch(`/api/groups/${groupId}/leave`, {
          method: 'POST',
        });

        if (response.ok) {
          // Refresh groups list
          console.log('Groups page: Left group successfully, refreshing group context...');
          fetchGroups();
          await refreshGroups(); // Update global group state
          setManageDialog({ isOpen: false });
          alert('Successfully left the group! 👋');
        } else {
          const error = await response.json();
          alert(`Failed to leave group: ${error.error}`);
        }
      } catch (error) {
        console.error('Error leaving group:', error);
        alert('Failed to leave group');
      }
    }
  };

  const handleSetAsActive = (group: UserGroup) => {
    try {
      console.log('Groups page: Setting group as active:', group.name);
      switchGroup(group); // Pass the entire group object instead of just ID
      setManageDialog({ isOpen: false });
      alert(`"${group.name}" is now your active group! 🎯`);
    } catch (error) {
      console.error('Error setting group as active:', error);
      alert('Failed to set group as active');
    }
  };

  const getPermissionIcon = (permissions: UserGroup['permissions']) => {
    if (permissions.canDelete && permissions.canEdit) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (permissions.canEdit || permissions.canAdd) return <Edit className="w-4 h-4 text-blue-500" />;
    return <Eye className="w-4 h-4 text-gray-500" />;
  };

  const getPermissionText = (role: string, permissions: UserGroup['permissions']) => {
    if (role === 'admin' || (permissions.canDelete && permissions.canEdit)) return 'Admin';
    if (permissions.canEdit || permissions.canAdd) return 'Editor';
    return 'Viewer';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👨‍👩‍👧‍👦 Family Groups
          </h1>
          <p className="text-gray-600">
            Manage your family groups and sharing permissions
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Group
        </Button>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Create New Family Group
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <Input
                type="text"
                placeholder="e.g., The Smith Family"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                type="text"
                placeholder="Tell us about your family..."
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroup.name.trim()}
              >
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Groups Yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create or join a family group to start sharing baby moments
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      {getPermissionIcon(group.permissions)}
                      <span className="text-sm text-gray-500">
                        {getPermissionText(group.role, group.permissions)}
                      </span>
                    </div>
                  </div>
                  
                  {group.description && (
                    <p className="text-gray-600 mb-3">{group.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.stats.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📖</span>
                      <span>{group.stats.eventCount} memories</span>
                    </div>
                    <div>
                      Owner: {group.owner.name || 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 lg:mt-0">
                  {group.permissions.canShare && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(group)}
                    >
                      <Share className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  )}
                  
                  {(group.role === 'admin' || group.permissions.canDelete) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManage(group)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Dialog */}
      {shareDialog.isOpen && shareDialog.group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Share "{shareDialog.group.name}"
              </h3>
              <button
                onClick={() => setShareDialog({ isOpen: false })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Code
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={shareDialog.group.id}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => copyInviteCode(shareDialog.group!.id)}
                    variant="outline"
                    size="sm"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Share this code with family members to invite them to your group
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  💡 How to invite someone:
                </h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Copy the invite code above</li>
                  <li>2. Share it with your family member</li>
                  <li>3. They can use it on the setup page to join your group</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShareDialog({ isOpen: false })}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Dialog */}
      {manageDialog.isOpen && manageDialog.group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage "{manageDialog.group.name}"
              </h3>
              <button
                onClick={() => setManageDialog({ isOpen: false })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Group Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Members:</span>
                    <span className="font-medium">{manageDialog.group.stats.memberCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Memories:</span>
                    <span className="font-medium">{manageDialog.group.stats.eventCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Owner:</span>
                    <span className="font-medium">{manageDialog.group.owner.name || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleShare(manageDialog.group!)}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share Invite Code
                  </Button>

                  {/* Set as Active Button */}
                  {activeGroup?.id !== manageDialog.group!.id ? (
                    <Button
                      onClick={() => handleSetAsActive(manageDialog.group!)}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Set as Active Group
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-blue-50 text-blue-700 cursor-default"
                      disabled
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Currently Active
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handleManageMembers(manageDialog.group!)}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Manage Members
                  </Button>
                  
                  {/* Only show leave button if user is not the owner */}
                  {manageDialog.group!.owner.id !== user?.id && (
                    <Button
                      onClick={() => handleLeaveGroup(manageDialog.group!.id, manageDialog.group!.name)}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Leave Group
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setManageDialog({ isOpen: false })}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Management Dialog */}
      {membersDialog.isOpen && membersDialog.group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Members - "{membersDialog.group.name}"
              </h3>
              <button
                onClick={() => setMembersDialog({ isOpen: false, members: [] })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {membersDialog.members.map((member) => (
                <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {member.user.imageUrl ? (
                        <img
                          src={member.user.imageUrl}
                          alt={member.user.name || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {member.user.name || 'Unknown User'}
                          </p>
                          {member.isOwner && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.user.email}</p>
                        <p className="text-xs text-gray-400">
                          Joined: {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {editingMember?.id === member.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={editingMember.role}
                            onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            onClick={() => handleUpdateMember(
                              editingMember.id, 
                              editingMember.role, 
                              editingMember.permissions
                            )}
                            size="sm"
                            className="text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingMember(null)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                          
                          {/* Only show edit/remove for non-owners and if current user has permissions */}
                          {!member.isOwner && (membersDialog.group?.owner.id === user?.id || 
                            membersDialog.group?.permissions.canShare) && (
                            <>
                              <Button
                                onClick={() => setEditingMember(member)}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleRemoveMember(member.id, member.user.name || 'User')}
                                variant="outline"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Permissions display */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.canRead && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Read</span>
                      )}
                      {member.permissions.canAdd && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Add</span>
                      )}
                      {member.permissions.canEdit && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Edit</span>
                      )}
                      {member.permissions.canDelete && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Delete</span>
                      )}
                      {member.permissions.canShare && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Share</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {membersDialog.members.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No members found.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setMembersDialog({ isOpen: false, members: [] })}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}