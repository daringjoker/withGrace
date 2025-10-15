import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUserPreferences() {
  console.log('🚀 Starting user preferences migration...');

  try {
    // Get all users who don't have preferences yet
    const usersWithoutPreferences = await prisma.user.findMany({
      where: {
        preferences: null
      },
      include: {
        memberships: {
          include: {
            group: true
          },
          orderBy: {
            group: {
              createdAt: 'desc' // Most recently created group first
            }
          }
        }
      }
    });

    console.log(`📊 Found ${usersWithoutPreferences.length} users without preferences`);

    let createdPreferences = 0;
    let usersWithNoGroups = 0;

    for (const user of usersWithoutPreferences) {
      console.log(`👤 Processing user: ${user.name} (${user.email})`);
      
      if (user.memberships.length === 0) {
        console.log(`   ⚠️  User has no group memberships, creating preferences with null active group`);
        
        // Create preferences with no active group
        await prisma.userPreferences.create({
          data: {
            userId: user.id,
            activeGroupId: null
          }
        });
        
        usersWithNoGroups++;
      } else {
        // Select the most recently created group they're a member of
        const mostRecentGroup = user.memberships[0].group;
        console.log(`   ✅ Setting active group to: ${mostRecentGroup.name} (created: ${mostRecentGroup.createdAt.toISOString()})`);
        
        // Create preferences with the most recent group as active
        await prisma.userPreferences.create({
          data: {
            userId: user.id,
            activeGroupId: mostRecentGroup.id
          }
        });
        
        createdPreferences++;
      }
    }

    // Also check for users who have preferences but no active group set
    const usersWithNullActiveGroup = await prisma.userPreferences.findMany({
      where: {
        activeGroupId: null,
        user: {
          memberships: {
            some: {} // Has at least one group membership
          }
        }
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                group: true
              },
              orderBy: {
                group: {
                  createdAt: 'desc'
                }
              }
            }
          }
        }
      }
    });

    console.log(`🔄 Found ${usersWithNullActiveGroup.length} users with null active groups but have group memberships`);

    let updatedPreferences = 0;

    for (const preferences of usersWithNullActiveGroup) {
      const user = preferences.user;
      if (user.memberships.length > 0) {
        const mostRecentGroup = user.memberships[0].group;
        console.log(`👤 Updating ${user.name}: Setting active group to ${mostRecentGroup.name}`);
        
        await prisma.userPreferences.update({
          where: { id: preferences.id },
          data: { activeGroupId: mostRecentGroup.id }
        });
        
        updatedPreferences++;
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   • Created preferences for ${createdPreferences} users with active groups`);
    console.log(`   • Created preferences for ${usersWithNoGroups} users without groups`);
    console.log(`   • Updated ${updatedPreferences} existing preferences with null active groups`);
    console.log(`   • Total processed: ${createdPreferences + usersWithNoGroups + updatedPreferences}`);

    // Verify the migration
    const totalUsersWithPreferences = await prisma.userPreferences.count();
    const totalUsers = await prisma.user.count();
    
    console.log(`\n✅ Verification:`);
    console.log(`   • Total users: ${totalUsers}`);
    console.log(`   • Users with preferences: ${totalUsersWithPreferences}`);
    console.log(`   • Coverage: ${totalUsers === totalUsersWithPreferences ? '100% ✅' : `${Math.round((totalUsersWithPreferences / totalUsers) * 100)}% ⚠️`}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle both direct execution and module import
if (require.main === module) {
  migrateUserPreferences()
    .then(() => {
      console.log('✨ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateUserPreferences };