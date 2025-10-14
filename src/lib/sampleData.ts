export const generateSampleTimelineData = () => {
  const events = [];
  const today = new Date();
  
  // Generate sample events for the last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Morning feeding
    events.push({
      id: `feeding-${i}-1`,
      type: 'feeding',
      date: dateStr,
      time: `${7 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      feedingEvent: {
        feedingType: 'breastfed',
        duration: 15 + Math.floor(Math.random() * 20),
        side: 'left'
      }
    });
    
    // Diaper change
    events.push({
      id: `diaper-${i}-1`,
      type: 'diaper',
      date: dateStr,
      time: `${9 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      diaperEvent: {
        wet: 1,
        dirty: Math.random() > 0.5 ? 1 : 0
      }
    });
    
    // Afternoon nap
    events.push({
      id: `sleep-${i}-1`,
      type: 'sleep',
      date: dateStr,
      time: `${13 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      sleepEvent: {
        sleepType: 'nap',
        duration: 60 + Math.floor(Math.random() * 120)
      }
    });
    
    // Evening feeding
    events.push({
      id: `feeding-${i}-2`,
      type: 'feeding',
      date: dateStr,
      time: `${17 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      feedingEvent: {
        feedingType: 'bottle_fed',
        amount: 60 + Math.floor(Math.random() * 80),
        duration: 10 + Math.floor(Math.random() * 15)
      }
    });
    
    // Night sleep
    events.push({
      id: `sleep-${i}-2`,
      type: 'sleep',
      date: dateStr,
      time: `${19 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      sleepEvent: {
        sleepType: 'night_sleep',
        duration: 300 + Math.floor(Math.random() * 180)
      }
    });
    
    // Random other event
    if (Math.random() > 0.6) {
      events.push({
        id: `other-${i}-1`,
        type: 'other',
        date: dateStr,
        time: `${11 + Math.floor(Math.random() * 4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        otherEvent: {
          eventType: ['bath', 'milestone', 'medical'][Math.floor(Math.random() * 3)],
          description: 'Sample event description'
        }
      });
    }
  }
  
  return events.sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.time}`);
    const bTime = new Date(`${b.date}T${b.time}`);
    return bTime.getTime() - aTime.getTime();
  });
};