import type { Track, LoopMode } from '../types';

/**
 * Per-guild music queue with history tracking and loop support.
 */
/** Maximum number of tracks to keep in playback history (prevents unbounded memory growth). */
const MAX_HISTORY = 50;

export default class Queue {
  readonly tracks: Track[] = [];
  readonly history: Track[] = [];
  loopMode: LoopMode = 'off';
  autoplay = false;
  private _originalOrder: Track[] | null = null;

  get size(): number {
    return this.tracks.length;
  }
  isEmpty(): boolean {
    return this.tracks.length === 0;
  }
  get isShuffled(): boolean {
    return this._originalOrder !== null;
  }

  /** Total duration in seconds of all queued (upcoming) tracks. */
  get totalDuration(): number {
    return this.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }

  /**
   * Add track(s) at the given 1-indexed position or end of queue.
   */
  add(track: Track | Track[], position?: number): void {
    const items = Array.isArray(track) ? track : [track];
    if (position !== undefined && position >= 1 && position <= this.tracks.length + 1) {
      this.tracks.splice(position - 1, 0, ...items);
    } else {
      this.tracks.push(...items);
    }
  }

  /**
   * Remove track at 1-indexed position. Returns the removed track or null.
   */
  remove(position: number): Track | null {
    if (position < 1 || position > this.tracks.length) return null;
    return this.tracks.splice(position - 1, 1)[0] ?? null;
  }

  /**
   * Move track from one 1-indexed position to another.
   */
  move(from: number, to: number): boolean {
    if (from < 1 || from > this.tracks.length || to < 1 || to > this.tracks.length) return false;
    const [track] = this.tracks.splice(from - 1, 1);
    this.tracks.splice(to - 1, 0, track!);
    return true;
  }

  clear(): void {
    this.tracks.length = 0;
    this._originalOrder = null;
  }

  /** Current (last played) track. */
  getCurrent(): Track | null {
    return this.history[this.history.length - 1] ?? null;
  }

  /** Peek at the next upcoming track without advancing. */
  peekNext(): Track | null {
    if (this.loopMode === 'track') return this.getCurrent();
    return this.tracks[0] ?? null;
  }

  /**
   * Advance the queue and return the next track to play.
   * Applies loop logic. Returns null if queue is exhausted.
   */
  advance(): Track | null {
    if (this.loopMode === 'track') {
      // Repeat current
      const current = this.getCurrent();
      if (current) return current;
    }

    if (this.loopMode === 'queue') {
      // Re-add current to end of queue
      const current = this.getCurrent();
      if (current) this.tracks.push(current);
    }

    if (this.tracks.length === 0) return null;

    const next = this.tracks.shift()!;
    this.history.push(next);
    // Trim history to prevent unbounded memory growth
    if (this.history.length > MAX_HISTORY) this.history.shift();
    return next;
  }

  /**
   * Rewind to the previous track.
   * Puts current back to front of queue and re-plays the one before it.
   * Returns the track to play, or null if no history.
   */
  rewind(): Track | null {
    if (this.history.length < 2) return null;
    // Put current back
    const current = this.history.pop()!;
    this.tracks.unshift(current);
    // Put previous back to be played
    const prev = this.history.pop()!;
    this.tracks.unshift(prev);
    // Advance (picks up prev)
    return this.advance();
  }

  /**
   * Skip to 1-indexed position. Returns the track at that position.
   */
  skipTo(position: number): Track | null {
    if (position < 1 || position > this.tracks.length) return null;
    const skipped = this.tracks.splice(0, position - 1);
    this.history.push(...skipped);
    return this.advance();
  }

  /** Shuffle the queue (saves original order for unshuffle). */
  shuffle(): void {
    this._originalOrder = [...this.tracks];
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = this.tracks[i]!;
      const b = this.tracks[j]!;
      this.tracks[i] = b;
      this.tracks[j] = a;
    }
  }

  /** Restore original order from before shuffle. */
  unshuffle(): void {
    if (this._originalOrder) {
      this.tracks.length = 0;
      this.tracks.push(...this._originalOrder);
      this._originalOrder = null;
    }
  }

  /**
   * Get a page of upcoming tracks for display (10 per page).
   */
  getPage(page: number, pageSize = 10): Track[] {
    const start = (page - 1) * pageSize;
    return this.tracks.slice(start, start + pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.tracks.length / 10) || 1;
  }
}
