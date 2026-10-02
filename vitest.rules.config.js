import { defineConfig } from 'vitest/config';

// Tests des règles Firestore : lancés uniquement via `npm run test:rules` (émulateur requis)
export default defineConfig({ test: { include: ['tests/**/*.test.js'], environment: 'node', testTimeout: 20_000 } });
