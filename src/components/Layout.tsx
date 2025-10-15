"use client";

import { Baby, BookOpen, Home, Plus, Menu, X, Users, LogOut, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useGroup } from "@/contexts/GroupContext";
import Image from "next/image";

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Story', href: '/timeline', icon: BookOpen },
  { name: 'Capture', href: '/add', icon: Plus },
];

function UserProfile() {
  const { user, isSignedIn } = useUser();
  const { activeGroup, userGroups, switchGroup } = useGroup();
  const [showDropdown, setShowDropdown] = useState(false);

  // Ensure userGroups is always an array to prevent runtime errors
  const safeUserGroups = Array.isArray(userGroups) ? userGroups : [];

  // Debug logging
  console.log('UserProfile render:', {
    isSignedIn,
    userId: user?.id,
    activeGroupName: activeGroup?.name,
    activeGroup,
    userGroups,
    userGroupsCount: safeUserGroups.length,
  });

  if (!isSignedIn || !user) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md transition-colors hover:bg-gray-100"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 text-sm rounded-full focus:outline-none"
      >
        <Image
          src={user.imageUrl || '/default-avatar.png'}
          alt={user.fullName || 'User'}
          width={32}
          height={32}
          className="rounded-full"
        />
        <div className="hidden lg:block">
          <div className="text-gray-700 font-medium">
            {user.firstName || 'User'}
          </div>
          {activeGroup && (
            <div className="text-xs text-gray-500 truncate max-w-24">
              {activeGroup.name}
            </div>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 sm:w-64 bg-white rounded-md shadow-lg py-1 z-50 border max-w-[calc(100vw-2rem)]">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-gray-500">{user.emailAddresses[0]?.emailAddress}</div>
          </div>
          
          {/* Active Group Section */}
          {activeGroup && (
            <div className="px-4 py-2 border-b bg-gray-50">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Active Group
              </div>
              <div className="text-sm font-medium text-gray-900">
                {activeGroup.name}
              </div>
              <div className="text-xs text-gray-500">
                Role: {activeGroup.role}
              </div>
            </div>
          )}
          
          {/* Group Switching */}
          { (
            <div className="py-1 border-b">
              <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Switch Group
              </div>
              {safeUserGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    switchGroup(group); // Pass the entire group object for consistency
                    setShowDropdown(false);
                  }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-3" />
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-gray-500">{group.role}</div>
                    </div>
                  </div>
                  {activeGroup?.id === group.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
          
          <Link
            href="/groups"
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setShowDropdown(false)}
          >
            <Users className="w-4 h-4 mr-3" />
            Manage Groups
          </Link>
          
          <SignOutButton>
            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      )}
      
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useUser();
  const { activeGroup } = useGroup();

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 lg:h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Baby className="h-6 w-6 lg:h-8 lg:w-8 text-pink-500 mr-2" />
              <span className="font-bold text-base lg:text-lg">💕 WithGrace</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4 lg:space-x-8">
            {isSignedIn ? (
              <>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = isHydrated && pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
                 <UserProfile />
              </>
            ) : (
              <UserProfile />
            )}
          </div>

          {/* Mobile navigation right side */}
          <div className="sm:hidden flex items-center space-x-2">
            {/* User Profile Icon for Mobile */}
            <UserProfile />
            
            {/* Mobile menu button - only show when signed in */}
            {isSignedIn && (
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isSignedIn && (
        <div className={cn(
          "sm:hidden transition-all duration-200 ease-in-out",
          mobileMenuOpen 
            ? "max-h-64 opacity-100" 
            : "max-h-0 opacity-0 overflow-hidden"
        )}>
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isHydrated && pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

function BottomNavigation() {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();
  const { isSignedIn } = useUser();
  
  if (!isSignedIn) return null;
  
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="grid grid-cols-3 py-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = isHydrated && pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mb-1",
                isActive ? "text-blue-600" : "text-gray-400"
              )} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className={cn(
        "max-w-7xl mx-auto sm:pb-6 lg:pb-8",
        isSignedIn ? "pb-20" : "pb-6" // Only add bottom padding for mobile nav when signed in
      )}>
        <div className="py-4 lg:py-6">
          {children}
        </div>
      </main>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  );
}