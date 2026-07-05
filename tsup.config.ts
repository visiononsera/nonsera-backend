import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  clean: true,
  minify: true,
  platform: 'node',
  // Déclare tous les modules natifs Node et le client Prisma comme externes
  external: [
    'path',
    'fs',
    'crypto',
    'os',
    '@prisma/client'
  ],
});