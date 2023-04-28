import { rmSync } from 'fs';

const clean = ['node_modules', 'app/dist', 'release/build', 'package-lock.json'];

switch (process.argv[2]) {
  case '--clean':
    clean.forEach((dir) => {
      rmSync(dir, { recursive: true, force: true });
    });
    break;
  case '--dist':
    rmSync('app/dist', { recursive: true, force: true });
    break;
  case '--build':
    rmSync('release/build', { recursive: true, force: true });
    break;
  default:
    // eslint-disable-next-line no-console
    console.log('Empty action received');
}
