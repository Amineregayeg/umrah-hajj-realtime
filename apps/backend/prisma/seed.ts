import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const testUser1 = await prisma.user.upsert({
    where: { email: 'test.user1@umrah-hajj.com' },
    update: {},
    create: {
      email: 'test.user1@umrah-hajj.com',
      profile: {
        create: {
          firstName: 'Ahmed',
          lastName: 'Al-Rashid',
          country: 'Saudi Arabia',
          languageUi: 'en',
          languageAudio: 'ar',
          madhhab: 'hanafi',
          gender: 'male',
          guidanceMode: 'standard',
        },
      },
      consent: {
        create: {
          essential: true,
          crashReports: true,
          analytics: false,
          uploadTranscripts: false,
          uploadAudioClips: false,
          backgroundLocation: false,
          emailUpdates: false,
        },
      },
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'test.user2@umrah-hajj.com' },
    update: {},
    create: {
      email: 'test.user2@umrah-hajj.com',
      profile: {
        create: {
          firstName: 'Fatima',
          lastName: 'Al-Zahra',
          country: 'Egypt',
          languageUi: 'ar',
          languageAudio: 'ar',
          madhhab: 'shafii',
          gender: 'female',
          guidanceMode: 'accessibility',
          mobility: 'wheelchair',
          accessibility: {
            visualImpairment: false,
            hearingImpairment: false,
            mobilityAid: 'wheelchair',
            preferredFontSize: 'large',
          },
        },
      },
      consent: {
        create: {
          essential: true,
          crashReports: true,
          analytics: true,
          uploadTranscripts: true,
          uploadAudioClips: false,
          backgroundLocation: true,
          emailUpdates: true,
        },
      },
    },
  });

  // Create sample navigation checkpoints
  await prisma.navCheckpoint.createMany({
    data: [
      {
        userId: testUser1.id,
        stage: 'ihram',
        lat: 21.4225,
        lon: 39.8262,
        acc: 5.0,
      },
      {
        userId: testUser1.id,
        stage: 'tawaf',
        lap: 1,
        floor: 1,
        lat: 21.4225,
        lon: 39.8262,
        acc: 3.0,
      },
      {
        userId: testUser2.id,
        stage: 'sai',
        saiLeg: 1,
        floor: 1,
        lat: 21.4204,
        lon: 39.8265,
        acc: 4.5,
      },
    ],
  });

  // Create sample transcript metadata
  await prisma.transcriptsMeta.createMany({
    data: [
      {
        userId: testUser1.id,
        stage: 'tawaf',
        sizeBytes: 2048,
        stored: true,
      },
      {
        userId: testUser2.id,
        stage: 'sai',
        sizeBytes: 1536,
        stored: false,
      },
    ],
  });

  // Create sample analytics events
  await prisma.eventsAnalytics.createMany({
    data: [
      {
        userUuid: testUser1.id,
        event: 'app_launch',
        payload: {
          platform: 'ios',
          version: '1.0.0',
          language: 'en',
        },
      },
      {
        userUuid: testUser1.id,
        event: 'tawaf_started',
        payload: {
          lap: 1,
          timestamp: new Date(),
        },
      },
      {
        userUuid: testUser2.id,
        event: 'sai_completed',
        payload: {
          totalDistance: 2640,
          duration: 1200,
        },
      },
    ],
  });

  console.log('✅ Database seed completed successfully!');
  console.log(`Created users: ${testUser1.email}, ${testUser2.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });