/**
 * Data Import Script for Baby Tracking App
 * 
 * This script helps you import your historical baby tracking data.
 * Run with: npx tsx scripts/importData.ts
 */

import { PrismaClient } from '@prisma/client';
import { EventType, FeedingType } from '../src/types';

const prisma = new PrismaClient();

// Sample data structure based on your tracking notes
interface HistoricalEntry {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  type: 'feeding' | 'diaper' | 'sleep';
  description: string;
}

// Your historical data - example entries based on your notes
const historicalData: HistoricalEntry[] = [
  // October 6 data
  { date: '2025-10-06', time: '00:11', type: 'feeding', description: 'breastfed 25 minutes' },
  { date: '2025-10-06', time: '00:11', type: 'diaper', description: '1 wet diaper' },
  { date: '2025-10-06', time: '01:58', type: 'feeding', description: 'formula 60 ml' },
  { date: '2025-10-06', time: '01:58', type: 'diaper', description: '1 dirty diaper yellow seedy cottage cheese' },
  { date: '2025-10-06', time: '06:00', type: 'feeding', description: 'formula fed 60 ml' },
  { date: '2025-10-06', time: '06:00', type: 'diaper', description: '1 wet diaper, irritated to latch breastmilk' },
  { date: '2025-10-06', time: '10:00', type: 'feeding', description: 'expressed breast milk 60 ml' },
  { date: '2025-10-06', time: '10:00', type: 'diaper', description: '1 wet 1 dirty diaper yellow seedy cottage cheese texture' },
  // Add more entries as needed...
];

function parseFeeding(description: string) {
  const feedingData: any = {};
  
  if (description.includes('breastfed')) {
    feedingData.feedingType = FeedingType.BREASTFED;
    const durationMatch = description.match(/(\d+)\s*minutes?/);
    if (durationMatch) {
      feedingData.duration = parseInt(durationMatch[1]);
    }
    if (description.includes('left')) feedingData.side = 'left';
    if (description.includes('right')) feedingData.side = 'right';
  } else if (description.includes('formula')) {
    feedingData.feedingType = FeedingType.FORMULA;
    const amountMatch = description.match(/(\d+)\s*ml/);
    if (amountMatch) {
      feedingData.amount = parseInt(amountMatch[1]);
    }
  } else if (description.includes('expressed breast milk')) {
    feedingData.feedingType = FeedingType.EXPRESSED_BREAST_MILK;
    const amountMatch = description.match(/(\d+)\s*ml/);
    if (amountMatch) {
      feedingData.amount = parseInt(amountMatch[1]);
    }
  }
  
  return feedingData;
}

function parseDiaper(description: string) {
  const diaperData: any = {
    wet: 0,
    dirty: 0,
  };
  
  const wetMatch = description.match(/(\d+)\s*wet/);
  if (wetMatch) {
    diaperData.wet = parseInt(wetMatch[1]);
  }
  
  const dirtyMatch = description.match(/(\d+)\s*dirty/);
  if (dirtyMatch) {
    diaperData.dirty = parseInt(dirtyMatch[1]);
  }
  
  // Extract color and texture
  if (description.includes('yellow')) {
    diaperData.color = 'yellow';
  }
  if (description.includes('seedy')) {
    diaperData.texture = 'seedy';
  }
  if (description.includes('cottage cheese')) {
    diaperData.texture = 'cottage cheese';
  }
  if (description.includes('watery')) {
    diaperData.consistency = 'watery';
  }
  
  return diaperData;
}

async function importData() {
  console.log('Starting data import...');
  
  try {
    for (const entry of historicalData) {
      // Create base event
      const babyEvent = await prisma.babyEvent.create({
        data: {
          date: new Date(entry.date + 'T00:00:00Z'),
          time: entry.time,
          type: entry.type,
          notes: entry.description,
        },
      });
      
      // Create specific event data
      if (entry.type === 'feeding') {
        const feedingData = parseFeeding(entry.description);
        await prisma.feedingEvent.create({
          data: {
            eventId: babyEvent.id,
            ...feedingData,
          },
        });
      } else if (entry.type === 'diaper') {
        const diaperData = parseDiaper(entry.description);
        await prisma.diaperEvent.create({
          data: {
            eventId: babyEvent.id,
            ...diaperData,
          },
        });
      }
      
      console.log(`✓ Imported: ${entry.date} ${entry.time} - ${entry.type}`);
    }
    
    console.log(`\n🎉 Successfully imported ${historicalData.length} events!`);
    
    // Show summary
    const totalEvents = await prisma.babyEvent.count();
    const totalFeedings = await prisma.feedingEvent.count();
    const totalDiapers = await prisma.diaperEvent.count();
    
    console.log(`\nDatabase Summary:`);
    console.log(`- Total Events: ${totalEvents}`);
    console.log(`- Feedings: ${totalFeedings}`);
    console.log(`- Diaper Changes: ${totalDiapers}`);
    
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Uncomment to run the import
// importData();

export { importData, historicalData, parseFeeding, parseDiaper };