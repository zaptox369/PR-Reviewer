import picomatch from 'picomatch';
import { FileDiff } from '../types/index.js';

export const DEFAULT_IGNORE_PATTERNS = [
  '**/*lock*',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/Cargo.lock',
  '**/go.sum',
  '**/composer.lock',
  '**/Podfile.lock',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/node_modules/**',
  '**/vendor/**',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.ico',
  '**/*.svg',
  '**/*.woff*',
  '**/*.pdf',
  '**/*.zip',
  '**/*.tar.gz',
];

export interface FilterResult {
  acceptedFiles: FileDiff[];
  ignoredFiles: { path: string; reason: string }[];
}

/**
 * Filters out noise files, lockfiles, generated assets, and custom ignore paths.
 */
export function filterDiffFiles(files: FileDiff[], customIgnorePaths: string[] = []): FilterResult {
  const combinedPatterns = [...DEFAULT_IGNORE_PATTERNS, ...customIgnorePaths];
  const isMatch = picomatch(combinedPatterns, { dot: true });

  const acceptedFiles: FileDiff[] = [];
  const ignoredFiles: { path: string; reason: string }[] = [];

  for (const file of files) {
    const targetPath = file.newPath || file.oldPath;

    if (file.isBinary) {
      ignoredFiles.push({ path: targetPath, reason: 'Binary file' });
      continue;
    }

    if (file.isDeleted) {
      // Deleted files typically don't need inline review comments on new code
      ignoredFiles.push({ path: targetPath, reason: 'Deleted file' });
      continue;
    }

    if (isMatch(targetPath)) {
      ignoredFiles.push({ path: targetPath, reason: 'Matches ignore pattern' });
      continue;
    }

    acceptedFiles.push(file);
  }

  return { acceptedFiles, ignoredFiles };
}
