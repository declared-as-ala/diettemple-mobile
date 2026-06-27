/**
 * Reels workout: uploaded videos via expo-video (Picture-in-Picture capable).
 * YouTube / unsupported URLs: placeholder + onError.
 */
import React, { useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { useVideoPlayer, VideoView, isPictureInPictureSupported } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import type { VideoSourceType } from '../../types';
import { resolveVideoUrl } from '../../config/api.config';

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
    onTap,
    onPlaybackStatusUpdate,
    onTimeUpdateSeconds,
    onError,
    resolvedUri: resolvedUriProp,
    initialPositionSeconds = 0,
    onPipActiveChange,
  },
  ref
) {
  const viewRef = useRef<VideoView>(null);
  const appliedInitialSeek = useRef(false);
  const isYoutube = videoSource === 'youtube' || isYoutubeUrl(videoUrl);
  const uri = resolvedUriProp ?? resolveVideoUrl(videoUrl ?? undefined);

  const player = useVideoPlayer(uri && !isYoutube ? uri : null, (p) => {
    if (!p) return;
    p.loop = true;
    p.timeUpdateEventInterval = 0.45;
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = true;
    p.muted = isMuted;
  });

  useEffect(() => {
    if (isYoutube && onError) onError();
  }, [isYoutube, onError]);

  useEffect(() => {
    if (!player || isYoutube) return;
    player.muted = isMuted;
  }, [player, isMuted, isYoutube]);

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
    const onTime = () => {
      const sec = player.currentTime;
      onTimeUpdateSeconds?.(sec);
      onPlaybackStatusUpdate?.({
        positionMillis: Math.round(sec * 1000),
        durationMillis: player.duration > 0 ? Math.round(player.duration * 1000) : undefined,
        isPlaying: player.playing,
      });
    };
    const subTime = player.addListener('timeUpdate', onTime);
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
    };
  }, [player, isYoutube, onPlaybackStatusUpdate, onTimeUpdateSeconds]);

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
