import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff, validateAndSnapLineNumber } from '../src/diff/parser.js';
import { filterDiffFiles } from '../src/diff/filter.js';

describe('Diff Engine - Unified Diff Parsing & Line Mapping', () => {
  const sampleDiff = `
diff --git a/src/user.ts b/src/user.ts
index 1234567..89abcdef 100644
--- a/src/user.ts
+++ b/src/user.ts
@@ -10,4 +10,6 @@ export function getUser() {
   const id = 1;
+  // Added line 11
+  const name = "Alice";
   return { id, name };
 }
`;

  it('correctly identifies modified files and parses line numbers', () => {
    const files = parseUnifiedDiff(sampleDiff);
    expect(files.length).toBe(1);
    expect(files[0].newPath).toBe('src/user.ts');
    expect(files[0].validLineNumbers).toContain(11);
    expect(files[0].validLineNumbers).toContain(12);
  });

  it('snaps hallucinated line numbers to valid modified lines in diff', () => {
    const files = parseUnifiedDiff(sampleDiff);
    const file = files[0];

    // Requesting a valid line
    const exact = validateAndSnapLineNumber(file, 11);
    expect(exact.validLine).toBe(11);
    expect(exact.wasAdjusted).toBe(false);

    // Requesting a hallucinated line (e.g. line 50)
    const snapped = validateAndSnapLineNumber(file, 50);
    expect(snapped.validLine).toBe(12); // closest valid line (12)
    expect(snapped.wasAdjusted).toBe(true);
  });
});

describe('Diff Engine - Noise & Lockfile Filter', () => {
  it('filters out lockfiles, build artifacts, and minified bundles', () => {
    const mockFiles = [
      { newPath: 'package-lock.json', oldPath: 'package-lock.json', isNew: false, isDeleted: false, isBinary: false, isRenamed: false, hunks: [], validLineNumbers: [] },
      { newPath: 'dist/bundle.js', oldPath: 'dist/bundle.js', isNew: false, isDeleted: false, isBinary: false, isRenamed: false, hunks: [], validLineNumbers: [] },
      { newPath: 'src/components/Header.tsx', oldPath: 'src/components/Header.tsx', isNew: false, isDeleted: false, isBinary: false, isRenamed: false, hunks: [], validLineNumbers: [1, 2] },
    ];

    const { acceptedFiles, ignoredFiles } = filterDiffFiles(mockFiles);
    expect(acceptedFiles.length).toBe(1);
    expect(acceptedFiles[0].newPath).toBe('src/components/Header.tsx');
    expect(ignoredFiles.length).toBe(2);
  });
});
