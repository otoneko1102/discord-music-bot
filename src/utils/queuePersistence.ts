import path from 'path';
import { atomicWriteJSON, safeReadJSON } from './safeFileIO';
import type { Track, LoopMode } from '../types';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'queue-state.json');

/** Debounce delay for queue state writes. Coalesces rapid changes (track advance, enqueue). */
const WRITE_DEBOUNCE_MS = 2000;

export interface SavedQueueState {
  isLofi: boolean;
  tracks: Track[];
  currentTrack: Track | null;
  loopMode: LoopMode;
  autoplay: boolean;
  volume: number;
  voiceChannelId: string;
  textChannelId: string | null;
  savedAt: number;
}

type StateMap = Record<string, SavedQueueState>;

// In-memory state mirror: always authoritative, file is just a durable copy.
let _mem: StateMap | null = null;

// Per-guild debounce timers.
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

function getMemory(): StateMap {
  if (!_mem) {
    _mem = safeReadJSON<StateMap>(STATE_FILE, {});
  }
  return _mem;
}

function writeToDisk(): void {
  try {
    atomicWriteJSON(STATE_FILE, _mem ?? {});
  } catch (err) {
    console.error('[QueuePersistence] Failed to write state:', err);
  }
}

export function saveQueueState(guildId: string, state: SavedQueueState): void {
  // Update in-memory mirror immediately (authoritative for reads).
  getMemory()[guildId] = state;

  // Debounce the disk write per guild.
  const existing = _timers.get(guildId);
  if (existing) clearTimeout(existing);

  _timers.set(
    guildId,
    setTimeout(() => {
      _timers.delete(guildId);
      writeToDisk();
    }, WRITE_DEBOUNCE_MS),
  );
}

export function loadQueueState(guildId: string): SavedQueueState | null {
  return getMemory()[guildId] ?? null;
}

export function clearQueueState(guildId: string): void {
  const mem = getMemory();
  if (!(guildId in mem)) return;

  // Cancel any pending debounced write for this guild.
  const timer = _timers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    _timers.delete(guildId);
  }

  delete mem[guildId];
  writeToDisk(); // Write immediately when clearing (intentional action).
}

export function loadAllQueueStates(): StateMap {
  return { ...getMemory() };
}

/**
 * Flush all pending debounced writes to disk immediately.
 * Call this on process exit (SIGTERM/SIGINT/beforeExit).
 */
export function flushQueueState(): void {
  for (const [guildId, timer] of _timers) {
    clearTimeout(timer);
    _timers.delete(guildId);
    void guildId; // consumed
  }
  if (_mem && Object.keys(_mem).length > 0) {
    writeToDisk();
  }
}
