export const PROJECT_FILES_A = import.meta.glob(
  [
    '/src/components/*.tsx',
    '/src/data/*.ts',
    '/src/types/*.ts',
    '/src/App.tsx',
    '/src/main.tsx',
    '/src/index.css',
    '/src/utils/aiEngine.ts',
    '/src/utils/fleetLogic.ts',
    '/src/utils/skillEngine.ts',
    '/src/utils/sound.ts',
    '/src/utils/zipBuilder.ts',
    '/src/utils/zipExporter.ts',
    '/src/utils/projectFilesB.ts',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;
