import { YtDlp } from 'ytdlp-nodejs';
import ffmpegPath from 'ffmpeg-static';
import config from '../config';
import type { Track, TrackSource, SpotifyEmbedEntity, ResolveResult } from '../types';

export const ytdlp = new YtDlp({ ffmpegPath: ffmpegPath ?? undefined });

type InputType =
  | 'youtube'
  | 'youtube_playlist'
  | 'spotify_track'
  | 'spotify_album'
  | 'spotify_playlist'
  | 'soundcloud'
  | 'url'
  | 'query';

export function detectInputType(input: string): InputType {
  const url = input.trim();

  if (/^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be\/)/.test(url)) {
    return 'youtube';
  }
  if (/^https?:\/\/(www\.)?youtube\.com\/playlist/.test(url)) return 'youtube_playlist';
  if (/^https?:\/\/music\.youtube\.com\/(watch|shorts)/.test(url)) return 'youtube';
  if (/^https?:\/\/music\.youtube\.com\/playlist/.test(url)) return 'youtube_playlist';

  if (/^https?:\/\/open\.spotify\.com\/track\//.test(url)) return 'spotify_track';
  if (/^https?:\/\/open\.spotify\.com\/album\//.test(url)) return 'spotify_album';
  if (/^https?:\/\/open\.spotify\.com\/playlist\//.test(url)) return 'spotify_playlist';

  if (/^https?:\/\/(www\.)?soundcloud\.com\//.test(url)) return 'soundcloud';
  if (/^https?:\/\//.test(url)) return 'url';

  return 'query';
}

/**
 * Resolve any input (URL / query) into tracks.
 * Returns { tracks, playlistTitle?, totalCount? }
 */
export async function resolveInput(input: string, requesterId: string): Promise<ResolveResult> {
  const type = detectInputType(input);

  switch (type) {
    case 'youtube':
      return resolveDirectUrl(input, requesterId, 'youtube');
    case 'soundcloud':
      return resolveDirectUrl(input, requesterId, 'soundcloud');
    case 'url':
      return resolveDirectUrl(input, requesterId, 'url');

    case 'youtube_playlist':
      return resolveYouTubePlaylist(input, requesterId);

    case 'spotify_track':
      return resolveSpotifyTrack(input, requesterId);

    case 'spotify_album':
      return resolveSpotifyCollection(input, 'album', requesterId);

    case 'spotify_playlist':
      return resolveSpotifyCollection(input, 'playlist', requesterId);

    case 'query':
    default:
      return { tracks: await resolveQuery(input, requesterId) };
  }
}

async function resolveDirectUrl(
  url: string,
  requesterId: string,
  source: TrackSource = 'youtube'
): Promise<ResolveResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = await (ytdlp.getInfoAsync as any)(url, { flatPlaylist: true });
  if (!info) return { tracks: [] };

  // yt-dlp returned a playlist (e.g. SoundCloud sets, generic playlist URLs)
  if (Array.isArray(info.entries)) {
    const maxSize = config.maxPlaylistSize;
    const tracks = (info.entries as unknown[]).slice(0, maxSize).map(e => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry = e as any;
      const trackUrl = entry.webpage_url ?? entry.url ?? url;
      return buildTrack(entry, requesterId, source, trackUrl);
    });
    return {
      tracks,
      playlistTitle: info.title as string | undefined,
      totalCount: info.entries.length,
    };
  }

  return { tracks: [buildTrack(info, requesterId, source, url)] };
}

async function resolveYouTubePlaylist(url: string, requesterId: string): Promise<ResolveResult> {
  const maxSize = config.maxPlaylistSize;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = await (ytdlp.getInfoAsync as any)(url, {
    flatPlaylist: true,
    playlistEnd: maxSize,
  });
  if (!info) return { tracks: [] };

  const entries: unknown[] = info.entries ?? [info];

  const tracks = entries.slice(0, maxSize).map(e => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = e as any;
    const trackUrl =
      entry.webpage_url ?? entry.url ?? `https://www.youtube.com/watch?v=${entry.id}`;
    return buildTrack(entry, requesterId, 'youtube', trackUrl);
  });

  return {
    tracks,
    playlistTitle: info.title as string | undefined,
    totalCount: entries.length,
  };
}

/**
 * Search YouTube and return up to `count` results.
 */
export async function resolveQuery(
  query: string,
  requesterId: string,
  count: number = config.searchResultCount
): Promise<Track[]> {
  const searchUrl = `ytsearch${count}:${query}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = await (ytdlp.getInfoAsync as any)(searchUrl, { flatPlaylist: true });
  if (!info) return [];

  const entries: unknown[] = info.entries ?? [info];
  return entries.map(e => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = e as any;
    const url = entry.webpage_url ?? `https://www.youtube.com/watch?v=${entry.id}`;
    return buildTrack(entry, requesterId, 'youtube', url);
  });
}

/** Search and return the single best match. */
export async function resolveQueryFirst(query: string, requesterId: string): Promise<Track | null> {
  const results = await resolveQuery(query, requesterId, 1);
  return results[0] ?? null;
}

/** In-memory cache for Spotify embed entity data (avoids repeated HTTP fetches). */
const _spotifyCache = new Map<string, { entity: SpotifyEmbedEntity; expiry: number }>();
const SPOTIFY_CACHE_TTL_MS = 30 * 60 * 1_000; // 30 minutes

/**
 * Fetch Spotify embed page and parse __NEXT_DATA__ entity.
 * Works without Spotify API credentials by scraping the public embed page.
 * Results are cached for 30 minutes to reduce network load.
 */
async function fetchSpotifyEntity(
  type: 'track' | 'album' | 'playlist',
  id: string
): Promise<SpotifyEmbedEntity | null> {
  const cacheKey = `${type}:${id}`;
  const cached = _spotifyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.entity;

  const url = `https://open.spotify.com/embed/${type}/${id}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const match = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(html);
    if (!match) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = JSON.parse(match[1]);
    const entity: SpotifyEmbedEntity | null = data?.props?.pageProps?.state?.data?.entity ?? null;

    if (entity) {
      _spotifyCache.set(cacheKey, { entity, expiry: Date.now() + SPOTIFY_CACHE_TTL_MS });
    }
    return entity;
  } catch {
    return null;
  }
}

function extractSpotifyId(url: string): string | null {
  const m = /open\.spotify\.com\/(?:track|album|playlist)\/([A-Za-z0-9]+)/.exec(url);
  return m?.[1] ?? null;
}

async function resolveSpotifyTrack(url: string, requesterId: string): Promise<ResolveResult> {
  const id = extractSpotifyId(url);
  if (!id) return { tracks: [] };

  const entity = await fetchSpotifyEntity('track', id);
  if (!entity) {
    // Fallback: search by URL title using yt-dlp
    const track = await resolveQueryFirst(url, requesterId);
    return { tracks: track ? [track] : [] };
  }

  const artistName = entity.artists?.[0]?.name ?? '';
  const trackTitle = entity.name;
  const query = artistName ? `${artistName} - ${trackTitle}` : trackTitle;

  const ytTrack = await resolveQueryFirst(query, requesterId);
  if (!ytTrack) return { tracks: [] };

  ytTrack.source = 'spotify';
  ytTrack.title = artistName ? `${artistName} - ${trackTitle}` : trackTitle;
  ytTrack.thumbnail = ytTrack.thumbnail; // keep YouTube thumbnail
  if (entity.duration) ytTrack.duration = Math.round(entity.duration / 1000);

  return { tracks: [ytTrack] };
}

async function resolveSpotifyCollection(
  url: string,
  type: 'album' | 'playlist',
  requesterId: string
): Promise<ResolveResult> {
  const id = extractSpotifyId(url);
  if (!id) return { tracks: [] };

  const entity = await fetchSpotifyEntity(type, id);
  if (!entity || !entity.trackList) {
    return {
      tracks: [],
      playlistTitle: entity?.name,
      totalCount: 0,
    };
  }

  const maxSize = config.maxPlaylistSize;
  const items = entity.trackList.slice(0, maxSize);

  // Build stub tracks immediately — YouTube URL resolved lazily just before playback
  const tracks: Track[] = items.map(item => {
    const artistName = item.subtitle ?? '';
    const trackTitle = item.title;
    const displayTitle = artistName ? `${artistName} - ${trackTitle}` : trackTitle;
    return {
      title: displayTitle,
      url: '',
      duration: item.duration ? Math.round(item.duration / 1000) : 0,
      thumbnail: null,
      uploader: artistName || null,
      uploaderUrl: null,
      isLive: false,
      source: 'spotify',
      requesterId,
      pendingQuery: displayTitle,
    };
  });

  return {
    tracks,
    playlistTitle: entity.name,
    totalCount: entity.trackList.length,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTrack(info: any, requesterId: string, source: TrackSource, url: string): Track {
  const thumbnails: { url: string }[] = info.thumbnails ?? [];
  const thumbnail: string | null =
    info.thumbnail ??
    (thumbnails.length > 0 ? thumbnails[thumbnails.length - 1]?.url : null) ??
    null;

  return {
    title: (info.title as string | undefined) ?? 'Unknown Title',
    url,
    duration: (info.duration as number | undefined) ?? 0,
    thumbnail,
    uploader: (info.uploader as string | undefined) ?? (info.channel as string | undefined) ?? null,
    uploaderUrl:
      (info.uploader_url as string | undefined) ?? (info.channel_url as string | undefined) ?? null,
    isLive: (info.is_live as boolean | undefined) ?? false,
    source,
    requesterId,
  };
}
