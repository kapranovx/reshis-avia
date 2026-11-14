import { execSync } from 'node:child_process';
import { join } from 'node:path';
import './env.setup';

// Перед прогоном накатываем миграции на тестовую базу.
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
}
