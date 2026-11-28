import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { BRAND_YELLOW } from '../../constants/brand';
import { getAuthToken } from '../../utils/authStorage';
import { subscribeToVoiceMessage } from '../../services/realtimeSocket';
import { voiceMessagesService, type CoachVoiceMessage } from '../../services/voiceMessagesService';

const ACCENT = BRAND_YELLOW;
const { height } = Dimensions.get('window');
const SPEEDS = [1, 1.5, 2] as const;
const BARS = 30;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Decorative bar heights derived from the message id (the app does not analyse the audio itself). */
function barsFor(id: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return Array.from({ length: BARS }, () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return 0.25 + ((h % 1000) / 1000) * 0.75;
  });
}

function Bubble({
  m, active, playing, position, duration, rate, onToggle, onSeek, onRate,
}: {
  m: CoachVoiceMessage;
  active: boolean;
  playing: boolean;
  position: number;
  duration: number;
  rate: number;
  onToggle: () => void;
  onSeek: (ratio: number) => void;
  onRate: () => void;
}) {
  const bars = useMemo(() => barsFor(m.id), [m.id]);
  const [w, setW] = useState(0);
  const total = active && duration > 0 ? duration : m.durationSec;
  const progress = active && total > 0 ? Math.min(1, position / total) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.avatar}><Ionicons name="barbell" size={16} color="#000" /></View>
      <View style={styles.bubble}>
        <Text style={styles.who}>Coach{m.scope === 'client' ? ' · pour vous' : ''}</Text>
        {m.hasAudio ? (
          <View style={styles.audioRow}>
            <TouchableOpacity onPress={onToggle} style={styles.playBtn} accessibilityRole="button" accessibilityLabel={playing ? 'Mettre en pause' : 'Écouter le message vocal'}>
              <Ionicons name={playing ? 'pause' : 'play'} size={20} color="#000" style={playing ? undefined : { marginLeft: 2 }} />
            </TouchableOpacity>
            <Pressable
              style={styles.wave}
              onLayout={(e) => setW(e.nativeEvent.layout.width)}
              onPress={(e) => { if (active && w > 0) onSeek(e.nativeEvent.locationX / w); }}
              accessibilityRole="adjustable"
              accessibilityLabel="Position dans le message"
            >
              {bars.map((b, i) => (
                <View key={i} style={[styles.bar, { height: 6 + b * 22, backgroundColor: i / BARS < progress ? ACCENT : 'rgba(255,255,255,0.35)' }]} />
              ))}
            </Pressable>
            <TouchableOpacity onPress={onRate} style={styles.speed} accessibilityRole="button" accessibilityLabel={`Vitesse ${rate}x`}>
              <Text style={styles.speedText}>{rate}x</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {m.hasAudio ? <Text style={styles.time}>{active ? `${fmt(position)} / ${fmt(total)}` : fmt(m.durationSec)}</Text> : null}
        {m.body ? <Text style={styles.text}>{m.body}</Text> : null}
        <Text style={styles.date}>{new Date(m.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  );
}

/**
 * Coach voice messages for the current exercise, Messenger style: a round mic button (with an unread badge) opens a
 * chat with the coach's bubbles. One bubble plays at a time; tap the waveform to seek; the speed pill cycles 1x/1.5x/2x.
 */
export default function ExerciseVoiceHead({ exerciseId, bottomOffset = 180 }: { exerciseId: string; bottomOffset?: number }) {
  const [messages, setMessages] = useState<CoachVoiceMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await voiceMessagesService.forExercise(exerciseId));
    } catch {
      /* the button simply stays hidden when the list cannot be loaded */
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    void load();
    return subscribeToVoiceMessage((p) => { if (p.exerciseId === exerciseId) void load(); });
  }, [exerciseId, load]);

  const releasePlayer = useCallback(() => {
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try { p.pause(); p.remove(); } catch { /* already released */ }
    }
    setPlaying(false);
    setActiveId(null);
    setPosition(0);
    setDuration(0);
  }, []);

  // Never keep playing in the background: leaving the exercise or closing the chat stops the audio.
  useEffect(() => releasePlayer, [exerciseId, releasePlayer]);
  useEffect(() => { if (!open) releasePlayer(); }, [open, releasePlayer]);

  // Poll the player for position (simple and cheap: 4x per second, only while the chat is open).
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setPosition(p.currentTime || 0);
      if (p.duration > 0) setDuration(p.duration);
      setPlaying(p.playing);
      if (p.duration > 0 && p.currentTime >= p.duration - 0.15 && !p.playing) {
        // finished: rewind so the next tap starts from the beginning
        p.seekTo(0).catch(() => {});
        setPosition(0);
      }
    }, 250);
    return () => clearInterval(t);
  }, [open]);

  const unread = messages.filter((m) => !m.read).length;

  const openChat = async () => {
    setOpen(true);
    const ids = messages.filter((m) => !m.read).map((m) => m.id);
    if (ids.length) {
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      voiceMessagesService.markRead(ids).catch(() => { /* will be retried next time it opens */ });
    }
  };

  const toggle = async (m: CoachVoiceMessage) => {
    setError(null);
    if (activeId === m.id && playerRef.current) {
      const p = playerRef.current;
      if (p.playing) p.pause(); else p.play();
      setPlaying(p.playing);
      return;
    }
    releasePlayer(); // only one message at a time
    try {
      const token = await getAuthToken();
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      const p = createAudioPlayer({ uri: voiceMessagesService.audioUrl(m.id), headers: token ? { Authorization: `Bearer ${token}` } : {} });
      playerRef.current = p;
      setActiveId(m.id);
      p.setPlaybackRate(rate);
      p.play();
      setPlaying(true);
    } catch {
      releasePlayer();
      setError("Impossible de lire ce message. Vérifiez votre connexion.");
    }
  };

  const seek = (ratio: number) => {
    const p = playerRef.current;
    if (!p || !(p.duration > 0)) return;
    const t = Math.max(0, Math.min(1, ratio)) * p.duration;
    p.seekTo(t).catch(() => {});
    setPosition(t);
  };

  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
    setRate(next);
    playerRef.current?.setPlaybackRate(next);
  };

  if (!loading && messages.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.head, { bottom: bottomOffset }]}
        onPress={openChat}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Messages du coach, ${unread} non lus` : 'Messages du coach'}
      >
        <Ionicons name="mic" size={24} color="#000" />
        {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View> : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Fermer" />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Message du coach</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {loading && messages.length === 0 ? (
            <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {messages.map((m) => (
                <Bubble
                  key={m.id}
                  m={m}
                  active={activeId === m.id}
                  playing={activeId === m.id && playing}
                  position={position}
                  duration={duration}
                  rate={rate}
                  onToggle={() => void toggle(m)}
                  onSeek={seek}
                  onRate={cycleRate}
                />
              ))}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  head: { position: 'absolute', left: 8, width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#000' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { maxHeight: height * 0.7, minHeight: 220, backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  sheetTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  center: { paddingVertical: 40, alignItems: 'center' },
  list: { paddingHorizontal: 14, gap: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  bubble: { flexShrink: 1, maxWidth: '86%', backgroundColor: '#1F1F1F', borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 12, paddingVertical: 10 },
  who: { color: ACCENT, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, minWidth: 130, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bar: { width: 3, borderRadius: 2 },
  speed: { minWidth: 40, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  speedText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, marginLeft: 50 },
  text: { color: '#fff', fontSize: 15, lineHeight: 21, marginTop: 8 },
  date: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },
  error: { color: '#F87171', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
