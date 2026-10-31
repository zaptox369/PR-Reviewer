import { FileDiff } from '../types/index.js';

export interface DiffChunk {
  chunkIndex: number;
  totalChunks: number;
  files: FileDiff[];
  diffText: string;
  estimatedTokens: number;
}

/**
 * Estimates token count from string length (roughly 4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Serializes a FileDiff back into unified diff text.
 */
export function serializeFileDiff(file: FileDiff): string {
  const parts: string[] = [];
  parts.push(`diff --git a/${file.oldPath} b/${file.newPath}`);
  if (file.isNew) parts.push('new file mode 100644');
  if (file.isDeleted) parts.push('deleted file mode 100644');
  parts.push(`--- a/${file.oldPath}`);
  parts.push(`+++ b/${file.newPath}`);

  for (const hunk of file.hunks) {
    parts.push(hunk.header);
    for (const line of hunk.lines) {
      if (line.type === 'add') parts.push(`+${line.content}`);
      else if (line.type === 'del') parts.push(`-${line.content}`);
      else parts.push(` ${line.content}`);
    }
  }

  return parts.join('\n');
}

/**
 * Chunks a list of FileDiffs into batches that fit within `maxDiffTokens`.
 */
export function chunkDiffFiles(files: FileDiff[], maxDiffTokens = 60000): DiffChunk[] {
  if (files.length === 0) {
    return [];
  }

  const chunks: DiffChunk[] = [];
  let currentBatch: FileDiff[] = [];
  let currentTokens = 0;

  for (const file of files) {
    const fileText = serializeFileDiff(file);
    const fileTokens = estimateTokens(fileText);

    // If a single file is greater than maxDiffTokens, add it as its own chunk
    if (fileTokens >= maxDiffTokens) {
      if (currentBatch.length > 0) {
        chunks.push({
          chunkIndex: chunks.length,
          totalChunks: 0,
          files: currentBatch,
          diffText: currentBatch.map(serializeFileDiff).join('\n\n'),
          estimatedTokens: currentTokens,
        });
        currentBatch = [];
        currentTokens = 0;
      }
      chunks.push({
        chunkIndex: chunks.length,
        totalChunks: 0,
        files: [file],
        diffText: fileText,
        estimatedTokens: fileTokens,
      });
      continue;
    }

    if (currentTokens + fileTokens > maxDiffTokens && currentBatch.length > 0) {
      chunks.push({
        chunkIndex: chunks.length,
        totalChunks: 0,
        files: currentBatch,
        diffText: currentBatch.map(serializeFileDiff).join('\n\n'),
        estimatedTokens: currentTokens,
      });
      currentBatch = [file];
      currentTokens = fileTokens;
    } else {
      currentBatch.push(file);
      currentTokens += fileTokens;
    }
  }

  if (currentBatch.length > 0) {
    chunks.push({
      chunkIndex: chunks.length,
      totalChunks: 0,
      files: currentBatch,
      diffText: currentBatch.map(serializeFileDiff).join('\n\n'),
      estimatedTokens: currentTokens,
    });
  }

  // Update totalChunks on each chunk
  chunks.forEach((c) => {
    c.totalChunks = chunks.length;
  });

  return chunks;
}
