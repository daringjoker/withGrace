import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStatsQuery() {
  console.log('🧪 Testing stats query with groupId filter...');

  try {
    // Get all groups to see what we're working with
    const allGroups = await prisma.userGroup.findMany({
      select: { id: true, name: true }
    });
    console.log('📊 Available groups:', allGroups);

    // Get all events to see the data
    const allEvents = await prisma.babyEvent.findMany({
      select: { id: true, type: true, groupId: true, date: true },
      orderBy: { date: 'desc' },
      take: 10
    });
    console.log('📝 Recent events:', allEvents);

    if (allGroups.length > 0) {
      const testGroupId = allGroups[0].id;
      console.log(`\n🎯 Testing query with groupId: ${testGroupId}`);

      // Test the exact query from the stats API
      const whereClause = {
        date: {
          gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          lte: new Date(),
        },
        groupId: testGroupId,
      };

      console.log('🔍 Where clause:', JSON.stringify(whereClause, null, 2));

      const filteredEvents = await prisma.babyEvent.findMany({
        where: whereClause,
        select: { id: true, type: true, groupId: true, date: true },
      });

      console.log(`📋 Events for group ${testGroupId}:`, filteredEvents);
      console.log(`📈 Found ${filteredEvents.length} events for the specific group`);

      // Test without groupId filter (should return more events)
      const allEventsInRange = await prisma.babyEvent.findMany({
        where: {
          date: {
            gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
            lte: new Date(),
          }
        },
        select: { id: true, type: true, groupId: true, date: true },
      });

      console.log(`📊 All events in range (no group filter): ${allEventsInRange.length}`);
      console.log('Events by group:', allEventsInRange.reduce((acc: any, event: any) => {
        acc[event.groupId] = (acc[event.groupId] || 0) + 1;
        return acc;
      }, {}));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testStatsQuery()
  .then(() => {
    console.log('✅ Stats query test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Stats query test failed:', error);
    process.exit(1);
  });