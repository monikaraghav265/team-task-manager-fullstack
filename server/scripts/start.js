import { execSync } from 'child_process';

try {
  console.log('Applying database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
} catch (error) {
  console.error('Database schema push failed. Check DATABASE_URL and database availability.');
  process.exit(1);
}

await import('../index.js');
