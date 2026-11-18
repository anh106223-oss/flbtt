export const PROJECT_FILES_B = import.meta.glob(
  [
    '/src/utils/projectFilesA.ts',
    '/python_ai/*.py',
    '/scripts/*.mjs',
    '/CHAY_WEB_NGAY.py',
    '/README_VSCODE.md',
    '/index.html',
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;
