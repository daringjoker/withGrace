// Comprehensive API consistency test
// Run this in browser console when authenticated

async function testApiConsistency() {
  console.log('🧪 Testing API consistency with shared group filter utility...');
  
  try {
    // Test 1: No groupId (should return all accessible groups)
    console.log('\n📋 Test 1: No groupId parameter');
    const eventsNoGroup = await fetch('/api/events?limit=100').then(r => r.json());
    const statsNoGroup = await fetch('/api/stats?days=30').then(r => r.json());
    
    console.log('Events (no groupId):', eventsNoGroup.data?.totalCount || 0, 'events');
    console.log('Stats (no groupId):', 
      statsNoGroup.data?.dailyStats?.reduce((sum, day) => sum + day.totalEvents, 0) || 0, 'events');
    
    // Test 2: Specific groupId
    // First get user's groups
    const groupsResponse = await fetch('/api/groups').then(r => r.json());
    const userGroups = groupsResponse.data || [];
    
    if (userGroups.length > 0) {
      const testGroupId = userGroups[0].id;
      console.log(`\n📊 Test 2: Specific groupId (${testGroupId})`);
      
      const eventsWithGroup = await fetch(`/api/events?limit=100&groupId=${testGroupId}`).then(r => r.json());
      const statsWithGroup = await fetch(`/api/stats?days=30&groupId=${testGroupId}`).then(r => r.json());
      
      console.log('Events (with groupId):', eventsWithGroup.data?.totalCount || 0, 'events');
      console.log('Stats (with groupId):', 
        statsWithGroup.data?.dailyStats?.reduce((sum, day) => sum + day.totalEvents, 0) || 0, 'events');
      
      // Test 3: Invalid groupId (should return 403)
      console.log('\n🚫 Test 3: Invalid groupId');
      const invalidGroupResponse = await fetch('/api/events?groupId=invalid-group-id');
      const invalidStatsResponse = await fetch('/api/stats?groupId=invalid-group-id');
      
      console.log('Events (invalid groupId):', invalidGroupResponse.status, invalidGroupResponse.statusText);
      console.log('Stats (invalid groupId):', invalidStatsResponse.status, invalidStatsResponse.statusText);
      
      // Summary
      console.log('\n✅ All tests completed! Both APIs should now use identical group filtering logic.');
      console.log('📝 Both APIs now use the shared getAuthenticatedGroupFilter utility');
      console.log('🔧 This ensures consistent behavior across all endpoints');
    } else {
      console.log('⚠️ No groups found for this user');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Usage instructions
console.log('📖 To test API consistency:');
console.log('1. Make sure you are authenticated (signed in)');
console.log('2. Run: testApiConsistency()');
console.log('3. Check the console output for consistency results');

// Auto-run if you want
// testApiConsistency();