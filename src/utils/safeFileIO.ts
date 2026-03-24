/**
 * Safe file I/O utilities.
 *
 * atomicWriteJSON  — writes JSON to a .tmp file then renames it into place.
 *   rename(2) is atomic on POSIX filesystems (same mount point), so a process
 *   crash between the write and the rename leaves the original file intact.
 *
 * safeReadJSON — parses JSON and falls back to a default value on any error.
 */

import fs from 'fs';
import path from 'path';

export function atomicWriteJSON(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath); // atomic on Linux (same filesystem)
}

export function safeReadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    }
  } catch (err) {
    console.error(`[FileIO] Failed to read ${path.basename(filePath)}, using default:`, err);
  }
  return fallback;
}
