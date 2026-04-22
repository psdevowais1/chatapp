import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const superUserEmail = process.env.SUPERUSER_EMAIL || 'admin@chatapp.com';
  const superUserPassword = process.env.SUPERUSER_PASSWORD || 'admin123';
  const superUserName = process.env.SUPERUSER_NAME || 'Super Admin';

  const existingSuperUser = await prisma.user.findUnique({
    where: { email: superUserEmail },
  });

  if (existingSuperUser) {
    console.log('Superuser already exists:', existingSuperUser.email);
    return;
  }

  const hashedPassword = await bcrypt.hash(superUserPassword, 10);

  const superUser = await prisma.user.create({
    data: {
      email: superUserEmail,
      password: hashedPassword,
      name: superUserName,
      role: 'SUPERUSER',
    },
  });

  console.log('Superuser created successfully:');
  console.log('Email:', superUser.email);
  console.log('Password:', superUserPassword);
  console.log('Please change the default password after first login!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
