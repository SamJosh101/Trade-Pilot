import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function backfillAccounts() {
  console.log('Starting backfill of trading accounts...');

  // Find all distinct userIds that have at least one Trade with a null accountId
  const usersWithNullAccountTrades = await prisma.trade.findMany({
    where: { accountId: null },
    select: { userId: true },
    distinct: ['userId'],
  });

  const userIds = usersWithNullAccountTrades.map(t => t.userId);
  console.log(`Found ${userIds.length} users with trades lacking an account`);

  let totalTradesUpdated = 0;

  for (const userId of userIds) {
    // Create a "Main Account" for this user
    const account = await prisma.tradingAccount.create({
      data: {
        userId,
        name: 'Main Account',
        startingBalance: 0,
        currency: 'USD',
      },
    });
    console.log(`Created account "${account.name}" (id: ${account.id}) for user ${userId}`);

    // Update all of this user's trades with null accountId to point at the new account
    const updateResult = await prisma.trade.updateMany({
      where: {
        userId,
        accountId: null,
      },
      data: {
        accountId: account.id,
      },
    });

    totalTradesUpdated += updateResult.count;
    console.log(`Updated ${updateResult.count} trades for user ${userId}`);
  }

  // Verify no null accountId trades remain
  const remainingNullTrades = await prisma.trade.count({
    where: { accountId: null },
  });

  console.log('\n=== Backfill Summary ===');
  console.log(`Users backfilled: ${userIds.length}`);
  console.log(`Total trades updated: ${totalTradesUpdated}`);
  console.log(`Remaining trades with null accountId: ${remainingNullTrades}`);

  if (remainingNullTrades === 0) {
    console.log('✅ Backfill complete - all trades now have an account');
  } else {
    console.log('❌ Backfill incomplete - some trades still have null accountId');
  }

  await prisma.$disconnect();
}

backfillAccounts().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
