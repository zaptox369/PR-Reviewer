import { FileDiff, DiffHunk, DiffHunkLine } from '../types/index.js';

/**
 * Parses a standard unified git diff into structured file objects and hunks.
 * Extracts accurate, verified line numbers for newly added or modified lines.
 */
export function parseUnifiedDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  if (!diffText || typeof diffText !== 'string') {
    return files;
  }

  const rawFileChunks = diffText.split(/^diff --git /m);

  for (const chunk of rawFileChunks) {
    if (!chunk.trim()) continue;

    const lines = chunk.split('\n');
    let oldPath = '';
    let newPath = '';
    let isNew = false;
    let isDeleted = false;
    let isBinary = false;
    let isRenamed = false;

    // First line typically has `a/path b/path`
    const headerMatch = lines[0].match(/a\/(.+?)\s+b\/(.+)/);
    if (headerMatch) {
      oldPath = headerMatch[1];
      newPath = headerMatch[2];
    }

    const hunks: DiffHunk[] = [];
    const validLineNumbers: number[] = [];

    let currentHunk: DiffHunk | null = null;
    let currentOldLine = 0;
    let currentNewLine = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('new file mode')) {
        isNew = true;
      } else if (line.startsWith('deleted file mode')) {
        isDeleted = true;
      } else if (line.startsWith('similarity index')) {
        isRenamed = true;
      } else if (line.startsWith('Binary files')) {
        isBinary = true;
      } else if (line.startsWith('--- ')) {
        const p = line.substring(4).trim();
        if (p !== '/dev/null') {
          oldPath = p.replace(/^a\//, '');
        }
      } else if (line.startsWith('+++ ')) {
        const p = line.substring(4).trim();
        if (p !== '/dev/null') {
          newPath = p.replace(/^b\//, '');
        }
      } else if (line.startsWith('@@')) {
        // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
        const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
        if (hunkMatch) {
          const oldStart = parseInt(hunkMatch[1], 10);
          const oldLines = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
          const newStart = parseInt(hunkMatch[3], 10);
          const newLines = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;

          currentOldLine = oldStart;
          currentNewLine = newStart;

          currentHunk = {
            header: line,
            oldStart,
            oldLines,
            newStart,
            newLines,
            lines: [],
          };
          hunks.push(currentHunk);
        }
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.lines.push({
            type: 'add',
            newLineNumber: currentNewLine,
            content: line.substring(1),
          });
          validLineNumbers.push(currentNewLine);
          currentNewLine++;
        } else if (line.startsWith('-')) {
          currentHunk.lines.push({
            type: 'del',
            oldLineNumber: currentOldLine,
            content: line.substring(1),
          });
          currentOldLine++;
        } else if (line.startsWith(' ') || line === '') {
          currentHunk.lines.push({
            type: 'context',
            oldLineNumber: currentOldLine,
            newLineNumber: currentNewLine,
            content: line.startsWith(' ') ? line.substring(1) : '',
          });
          currentOldLine++;
          currentNewLine++;
        }
      }
    }

    if (newPath || oldPath) {
      files.push({
        oldPath: oldPath || newPath,
        newPath: newPath || oldPath,
        isNew,
        isDeleted,
        isBinary,
        isRenamed,
        hunks,
        validLineNumbers: Array.from(new Set(validLineNumbers)).sort((a, b) => a - b),
      });
    }
  }

  return files;
}

/**
 * Validates whether a line number exists in the diff's modified or added lines.
 * If hallucinated by the LLM, snaps to the closest valid line or reports unresolvable.
 */
export function validateAndSnapLineNumber(
  fileDiff: FileDiff | undefined,
  requestedLine: number
): { validLine: number; wasAdjusted: boolean } {
  if (!fileDiff || fileDiff.validLineNumbers.length === 0) {
    return { validLine: Math.max(1, requestedLine), wasAdjusted: true };
  }

  if (fileDiff.validLineNumbers.includes(requestedLine)) {
    return { validLine: requestedLine, wasAdjusted: false };
  }

  // Find nearest valid line number in diff
  let closestLine = fileDiff.validLineNumbers[0];
  let minDiff = Math.abs(requestedLine - closestLine);

  for (const line of fileDiff.validLineNumbers) {
    const diff = Math.abs(requestedLine - line);
    if (diff < minDiff) {
      minDiff = diff;
      closestLine = line;
    }
  }

  return { validLine: closestLine, wasAdjusted: true };
}
