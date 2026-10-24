/**
 * Reels workout: uploaded videos via expo-video (Picture-in-Picture capable).
 * YouTube / unsupported URLs: placeholder + onError.
 *
 * Built for slow mobile data:
 *  - plays the small H.264 rendition chosen by the Data Saver policy (240/360/540) instead of the multi-MB original;
 *  - shows the poster image instantly, so the screen is never blank while the first bytes arrive;
 *  - never an infinite spinner: "connexion lente" after a few seconds, an error + "Réessayer" after a while;
 *  - watches real rebuffering and steps the quality DOWN (and back UP after smooth loops) — not just Wi-Fi vs cellular;
 *  - small forward buffer (a clip is ~10 s) and MP4 caching so loops and revisits cost no new data.
 */
import React, { useEffect, useImperativeHandle, forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView, isPictureInPictureSupported } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import type { VideoSourceType } from '../../types';
import { resolveVideoUrl } from '../../config/api.config';
import { useDataSaverStore, useMediaPolicy } from '../../store/dataSaverStore';
import { getNetworkKind } from '../../services/networkType';
import {
  TIERS,
  initialStallState,
  onSmoothLoop,
  onStall,
  pickVideoSource,
  resolveMediaPolicy,
  type StallState,
  type VideoTier,
  type VideoVariantInfo,
} from '../../utils/videoQuality';

/** Startup watchdogs (ms). Realistic for a 200-700 KB clip: even a 2G-ish link should have started by then. */
const STARTUP_SLOW_MS = 6000;
const STARTUP_FAIL_MS = 20000;
/** Learned across exercises within the session (module level on purpose: each exercise mounts a new player). */
let sessionStall: StallState = initialStallState();

/** Subset of legacy expo-av status used by callers (optional). */
export type ReelsPlaybackSnapshot = {
  positionMillis: number;
  durationMillis?: number;
  isPlaying: boolean;
};

export interface ReelsVideoPlayerProps {
  videoSource?: VideoSourceType | null;
  videoUrl?: string | null;
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  playbackRate?: number;
  onTap?: () => void;
  onMutedChange?: (muted: boolean) => void;
  /** Throttled time updates for persistence (seconds). */
  onTimeUpdateSeconds?: (seconds: number) => void;
  /** Legacy adapter: maps expo-video state to a minimal snapshot. */
  onPlaybackStatusUpdate?: (status: ReelsPlaybackSnapshot) => void;
  onError?: () => void;
  resolvedUri?: string | null;
  /** Seek after first load (e.g. resume). */
  initialPositionSeconds?: number;
  onPipActiveChange?: (active: boolean) => void;
  /** Fired when playback finishes a loop or reaches the end of the video. */
  onLoopComplete?: () => void;
  /** Optimised renditions (backend `videoVariants`). When absent the original file is played as before. */
  variants?: VideoVariantInfo[] | null;
  /** Poster image shown instantly, before any video bytes. */
  posterUrl?: string | null;
  hlsUrl?: string | null;
  durationSec?: number | null;
}

export type ReelsVideoPlayerHandle = {
  enterPictureInPicture: () => Promise<void>;
  stopPictureInPicture: () => Promise<void>;
};

const isYoutubeUrl = (url: string | null | undefined) =>
  !!url && /youtube\.com|youtu\.be/i.test(url);

const ReelsVideoPlayer = forwardRef<ReelsVideoPlayerHandle, ReelsVideoPlayerProps>(function ReelsVideoPlayer(
  {
    videoSource,
    videoUrl,
    isActive,
    isPaused,
    isMuted,
    playbackRate = 1.0,
    onTap,
    onPlaybackStatusUpdate,
    onTimeUpdateSeconds,
    onError,
    resolvedUri: resolvedUriProp,
    initialPositionSeconds = 0,
    onPipActiveChange,
    onLoopComplete,
    variants,
    posterUrl,
    hlsUrl,
    durationSec,
  },
  ref
) {
  const viewRef = useRef<VideoView>(null);
  const appliedInitialSeek = useRef(false);
  const previousTimeRef = useRef(0);
  const isYoutube = videoSource === 'youtube' || isYoutubeUrl(videoUrl);
  const policy = useMediaPolicy();
  const descriptor = useMemo(() => {
    if (isYoutube) return null;
    const optimised = pickVideoSource({ url: videoUrl, variants, hlsUrl, durationSec }, policy.tier, (u) => resolveVideoUrl(u ?? undefined));
    if (optimised && optimised.kind !== 'original') return optimised;
    const original = resolvedUriProp ?? resolveVideoUrl(videoUrl ?? undefined);
    return original ? { uri: original, quality: 'original' as const, kind: 'original' as const } : null;
  }, [isYoutube, videoUrl, variants, hlsUrl, durationSec, policy.tier, resolvedUriProp]);
  const uri = descriptor?.uri ?? null;
  const posterUri = resolveVideoUrl(posterUrl ?? undefined);

  // MP4: cached on iOS and Android (loops / revisits cost nothing). HLS is NOT cacheable on iOS (expo-video SDK 54).
  const playerSource = useMemo(
    () =>
      uri
        ? ({ uri, useCaching: descriptor?.kind !== 'hls', contentType: descriptor?.kind === 'hls' ? 'hls' : 'progressive' } as const)
        : null,
    [uri, descriptor?.kind]
  );

  const [loadState, setLoadState] = useState<'loading' | 'slow' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const everReady = useRef(false);
  const resumeAtRef = useRef(0);
  const tierRef = useRef<VideoTier>(policy.tier);
  tierRef.current = descriptor?.quality && descriptor.quality !== 'original' ? (descriptor.quality as VideoTier) : policy.tier;
  const stalledThisLoop = useRef(false);

  const player = useVideoPlayer(playerSource, (p) => {
    if (!p) return;
    p.loop = true;
    p.timeUpdateEventInterval = 0.45;
    // Clips are ~10 s: a short forward buffer is enough and avoids pulling data that will not be watched.
    try {
      p.bufferOptions = { preferredForwardBufferDuration: 12, minBufferForPlayback: 1, waitsToMinimizeStalling: true, maxBufferBytes: 6 * 1024 * 1024 };
    } catch {
      /* older native runtime: defaults */
    }
    // No background audio (Apple Guideline 2.5.4): playback pauses when the
    // app leaves the foreground and no lock-screen media controls are shown.
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
    p.muted = isMuted;
    p.playbackRate = playbackRate ?? 1.0;
  });

  /** Lower the allowed quality for the rest of the session (the source swap happens through `policy.tier`). */
  const stepDownTo = useCallback((ceiling: VideoTier | null) => {
    useDataSaverStore.getState().setCeiling(ceiling);
  }, []);

  const registerStall = useCallback(
    (durationMs: number) => {
      stalledThisLoop.current = true;
      const r = onStall(sessionStall, tierRef.current, durationMs, Date.now());
      sessionStall = r.state;
      if (r.stepDown) stepDownTo(r.state.ceiling);
    },
    [stepDownTo]
  );

  // Status watching: startup watchdogs, rebuffer detection, error recovery.
  useEffect(() => {
    if (!player || !uri || isYoutube) return;
    everReady.current = false;
    setLoadState('loading');
    let stallStart = 0;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    const slowTimer = setTimeout(() => {
      if (everReady.current) return;
      setLoadState('slow');
      // The connection cannot start this rendition quickly: try a lighter one for the rest of the session.
      const lower = TIERS[Math.max(0, TIERS.indexOf(tierRef.current) - 1)];
      if (lower !== tierRef.current) {
        sessionStall = { ...sessionStall, ceiling: lower, smoothLoops: 0 };
        stepDownTo(lower);
      }
    }, STARTUP_SLOW_MS);
    const failTimer = setTimeout(() => {
      if (!everReady.current) setLoadState('error');
    }, STARTUP_FAIL_MS);

    const markReady = () => {
      everReady.current = true;
      setLoadState('ready');
    };
    if (player.status === 'readyToPlay') markReady();

    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = null;
        if (stallStart && everReady.current) {
          const d = Date.now() - stallStart;
          if (d >= 600) registerStall(d);
        }
        stallStart = 0;
        markReady();
      } else if (status === 'loading') {
        if (everReady.current && !stallStart) {
          stallStart = Date.now();
          // A rebuffer that does not end quickly counts as a long stall right away (step down without waiting).
          stallTimer = setTimeout(() => registerStall(3000), 3000);
        }
      } else if (status === 'error') {
        if (everReady.current) return; // transient error after playing: keep the last frame, no loop of retries
        setLoadState('error');
      }
    });

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(failTimer);
      if (stallTimer) clearTimeout(stallTimer);
      sub.remove();
    };
  }, [player, uri, isYoutube, attempt, registerStall, stepDownTo]);

  // After a source swap (quality change / retry) continue where the clip was.
  useEffect(() => {
    if (!player || isYoutube) return;
    const sub = player.addListener('sourceLoad', () => {
      if (resumeAtRef.current > 0.6) {
        try {
          player.currentTime = resumeAtRef.current;
        } catch {
          /* ignore */
        }
      }
    });
    return () => sub.remove();
  }, [player, isYoutube]);

  const retry = useCallback(() => {
    sessionStall = initialStallState();
    stepDownTo(null);
    setAttempt((n) => n + 1);
    if (player && playerSource) {
      Promise.resolve((player as any).replaceAsync?.(playerSource)).catch(() => {});
      if (isActive && !isPaused) player.play();
    }
  }, [player, playerSource, isActive, isPaused, stepDownTo]);

  useEffect(() => {
    if (isYoutube && onError) onError();
  }, [isYoutube, onError]);

  useEffect(() => {
    if (!player || isYoutube) return;
    player.muted = isMuted;
  }, [player, isMuted, isYoutube]);

  useEffect(() => {
    if (!player || isYoutube) return;
    player.playbackRate = playbackRate ?? 1.0;
  }, [player, playbackRate, isYoutube]);

  useEffect(() => {
    if (!player || isYoutube) return;
    if (isActive && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isActive, isPaused, isYoutube]);

  useEffect(() => {
    if (!player || isYoutube) return;
    previousTimeRef.current = 0;
    const onTime = () => {
      const sec = player.currentTime;
      // Loop-around detection: if time was > 1.5s and suddenly wraps back to near 0, loop finished
      if (previousTimeRef.current > 1.5 && sec < 0.8) {
        onLoopComplete?.();
        // A full loop without any rebuffering: after a few, allow one quality step back up.
        if (!stalledThisLoop.current) {
          const base = resolveMediaPolicy({
            mode: useDataSaverStore.getState().mode,
            network: getNetworkKind(),
            videoPref: useDataSaverStore.getState().videoPref,
            ceiling: null,
          }).tier;
          const r = onSmoothLoop(sessionStall, base);
          sessionStall = r.state;
          if (r.stepUp) useDataSaverStore.getState().setCeiling(r.state.ceiling);
        }
        stalledThisLoop.current = false;
      }
      previousTimeRef.current = sec;
      resumeAtRef.current = sec;
      onTimeUpdateSeconds?.(sec);
      onPlaybackStatusUpdate?.({
        positionMillis: Math.round(sec * 1000),
        durationMillis: player.duration > 0 ? Math.round(player.duration * 1000) : undefined,
        isPlaying: player.playing,
      });
    };
    const subTime = player.addListener('timeUpdate', onTime);
    let subEnd: any;
    try {
      subEnd = player.addListener('playToEnd', () => {
        onLoopComplete?.();
      });
    } catch {}
    const subPlaying = player.addListener('playingChange', () => {
      onPlaybackStatusUpdate?.({
        positionMillis: Math.round(player.currentTime * 1000),
        durationMillis: player.duration > 0 ? Math.round(player.duration * 1000) : undefined,
        isPlaying: player.playing,
      });
    });
    return () => {
      subTime.remove();
      subPlaying.remove();
      subEnd?.remove?.();
    };
  }, [player, isYoutube, onPlaybackStatusUpdate, onTimeUpdateSeconds, onLoopComplete]);

  useEffect(() => {
    if (!player || isYoutube || appliedInitialSeek.current) return;
    if (!initialPositionSeconds || initialPositionSeconds <= 0) return;
    const sub = player.addListener('sourceLoad', () => {
      if (appliedInitialSeek.current) return;
      appliedInitialSeek.current = true;
      try {
        player.currentTime = initialPositionSeconds;
      } catch {
        /* ignore seek errors */
      }
    });
    return () => sub.remove();
  }, [player, isYoutube, initialPositionSeconds]);

  useEffect(() => {
    if (!isActive) appliedInitialSeek.current = false;
  }, [isActive]);

  const pipSupported = isPictureInPictureSupported();

  const handlePipStart = useCallback(() => {
    onPipActiveChange?.(true);
  }, [onPipActiveChange]);

  const handlePipStop = useCallback(() => {
    onPipActiveChange?.(false);
  }, [onPipActiveChange]);

  useImperativeHandle(
    ref,
    () => ({
      enterPictureInPicture: async () => {
        if (!pipSupported || !viewRef.current) return;
        try {
          await viewRef.current.startPictureInPicture();
        } catch {
          /* PiP may be unavailable (OS / device) */
        }
      },
      stopPictureInPicture: async () => {
        try {
          await viewRef.current?.stopPictureInPicture();
        } catch {
          /* ignore */
        }
      },
    }),
    [pipSupported]
  );

  if (isYoutube) {
    return (
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap}>
        <View style={styles.placeholder}>
          <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.6)" />
          <Text style={styles.placeholderText}>Vidéo non disponible</Text>
          <Text style={styles.placeholderSubtext}>Upload uniquement</Text>
        </View>
      </Pressable>
    );
  }

  if (!uri || !player) return null;

  // Native VideoView/SurfaceView often sits above RN touches; a Pressable layer on top
  // receives taps so pause/play works (especially on Android).
  return (
    <View style={StyleSheet.absoluteFill} collapsable={false}>
      <VideoView
        ref={viewRef}
        player={player}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={pipSupported}
        startsPictureInPictureAutomatically={pipSupported && isActive && !isPaused}
        onPictureInPictureStart={handlePipStart}
        onPictureInPictureStop={handlePipStop}
        surfaceType="surfaceView"
      />
      {loadState !== 'ready' && posterUri ? (
        <View style={[StyleSheet.absoluteFill, styles.poster]} pointerEvents="none">
          <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </View>
      ) : null}
      {loadState === 'loading' || loadState === 'slow' ? (
        <View style={styles.statusWrap} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
          {loadState === 'slow' ? <Text style={styles.statusText}>Connexion lente… qualité réduite</Text> : null}
        </View>
      ) : null}
      {loadState === 'error' ? (
        <View style={styles.statusWrap}>
          <Ionicons name="cloud-offline-outline" size={40} color="rgba(255,255,255,0.85)" />
          <Text style={styles.statusText}>Vidéo indisponible avec cette connexion</Text>
          <TouchableOpacity onPress={retry} activeOpacity={0.85} style={styles.retryBtn} accessibilityRole="button" accessibilityLabel="Réessayer">
            <Ionicons name="refresh" size={16} color="#000" />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.tapShield]}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={isPaused ? 'Lecture' : 'Pause'}
        accessibilityHint="Appuyer pour mettre en pause ou reprendre la vidéo"
      />
      {isPaused ? (
        <View style={styles.playIconWrap} pointerEvents="none">
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={42} color="#fff" style={{ marginLeft: 4 }} />
          </View>
        </View>
      ) : null}
    </View>
  );
});

export default ReelsVideoPlayer;

const styles = StyleSheet.create({
  poster: { zIndex: 1, backgroundColor: '#000' },
  statusWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  statusText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    marginTop: 4,
  },
  retryText: { color: '#000', fontWeight: '800', fontSize: 14 },
  tapShield: {
    zIndex: 2,
    ...(Platform.OS === 'android' ? { elevation: 4 } : {}),
  },
  playIconWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  playIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  placeholderSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
});
