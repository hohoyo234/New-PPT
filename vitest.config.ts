import { defineConfig } from 'vitest/config';

// Smoke tests target the pure generation/parsing helpers in src/lib. They run in
// a plain node environment (no DOM, no Supabase, no pptxgenjs) so they stay fast
// and hermetic. Vite still transforms `import.meta.glob` used by backgrounds.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
