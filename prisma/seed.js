import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@12345', 12);
  const memberPassword = await bcrypt.hash('Member@12345', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskpro.dev' },
    update: {},
    create: {
      name: 'Aarav Admin',
      email: 'admin@taskpro.dev',
      passwordHash: adminPassword
    }
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@taskpro.dev' },
    update: {},
    create: {
      name: 'Meera Member',
      email: 'member@taskpro.dev',
      passwordHash: memberPassword
    }
  });

  let project = await prisma.project.findFirst({ where: { name: 'Product Launch Sprint' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Product Launch Sprint',
        description: 'Demo project with role based task management and dashboard analytics.',
        ownerId: admin.id,
        members: {
          create: [
            { userId: admin.id, role: 'ADMIN' },
            { userId: member.id, role: 'MEMBER' }
          ]
        }
      }
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await prisma.task.createMany({
      data: [
        {
          title: 'Design onboarding dashboard',
          description: 'Create a beautiful first screen with project KPIs and task insights.',
          dueDate: tomorrow,
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          projectId: project.id,
          assigneeId: member.id,
          createdById: admin.id
        },
        {
          title: 'Prepare production checklist',
          description: 'Confirm env variables, database, README and demo video steps.',
          dueDate: nextWeek,
          priority: 'MEDIUM',
          status: 'TODO',
          projectId: project.id,
          assigneeId: admin.id,
          createdById: admin.id
        },
        {
          title: 'Fix overdue bug report',
          description: 'Resolve an overdue item to demonstrate the dashboard warning state.',
          dueDate: yesterday,
          priority: 'URGENT',
          status: 'TODO',
          projectId: project.id,
          assigneeId: member.id,
          createdById: admin.id
        }
      ]
    });
  }

  console.log('Seed completed. Demo accounts:');
  console.log('Admin:  admin@taskpro.dev / Admin@12345');
  console.log('Member: member@taskpro.dev / Member@12345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
