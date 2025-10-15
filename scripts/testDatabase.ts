/**
 * Simple script to test database connectivity and add some sample data
 * Run with: npx tsx scripts/testDatabase.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    // Check existing events
    const eventCount = await prisma.babyEvent.count();
    console.log(`✓ Current events in database: ${eventCount}`);
    
    if (eventCount === 0) {
      console.log('No events found. Creating sample events...');
      
      // Create some sample events
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Sample feeding event
      const feedingEvent = await prisma.babyEvent.create({
        data: {
          date: today,
          time: '08:30',
          type: 'feeding',
          notes: 'Morning feeding',
        },
      });
      
      await prisma.feedingEvent.create({
        data: {
          eventId: feedingEvent.id,
          feedingType: 'breastfed',
          duration: 25,
          side: 'left',
        },
      });
      
      // Sample diaper event
      const diaperEvent = await prisma.babyEvent.create({
        data: {
          date: today,
          time: '09:15',
          type: 'diaper',
          notes: 'Morning diaper change',
        },
      });
      
      await prisma.diaperEvent.create({
        data: {
          eventId: diaperEvent.id,
          wet: 1,
          dirty: 0,
        },
      });
      
      // Sample sleep event  
      const sleepEvent = await prisma.babyEvent.create({
        data: {
          date: yesterday,
          time: '14:00',
          type: 'sleep',
          notes: 'Afternoon nap',
        },
      });
      
      await prisma.sleepEvent.create({
        data: {
          eventId: sleepEvent.id,
          sleepType: 'nap',
          duration: 90,
        },
      });
      
      console.log('✓ Created 3 sample events');
    }
    
    // Fetch and display events
    const events = await prisma.babyEvent.findMany({
      include: {
        feedingEvent: true,
        diaperEvent: true,
        sleepEvent: true,
        otherEvent: true,
        images: true,
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' },
      ],
      take: 5,
    });
    
    console.log(`\n📊 Recent events:`);
    events.forEach((event: any, index: number) => {
      console.log(`${index + 1}. ${event.date.toISOString().split('T')[0]} ${event.time} - ${event.type} (ID: ${event.id})`);
      if (event.feedingEvent) {
        console.log(`   └─ Feeding: ${event.feedingEvent.feedingType}, ${event.feedingEvent.duration}min`);
      }
      if (event.diaperEvent) {
        console.log(`   └─ Diaper: ${event.diaperEvent.wet} wet, ${event.diaperEvent.dirty} dirty`);
      }
      if (event.sleepEvent) {
        console.log(`   └─ Sleep: ${event.sleepEvent.sleepType}, ${event.sleepEvent.duration}min`);
      }
    });
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();