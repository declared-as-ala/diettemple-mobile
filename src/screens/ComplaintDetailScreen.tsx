import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_YELLOW } from '../constants/brand';
import { useTheme } from '../context/ThemeContext';
import { getAuthToken } from '../utils/authStorage';
import { subscribeToComplaintUpdated } from '../services/realtimeSocket';
import {
  complaintErrorMessage, complaintsService, type ComplaintAttachment, type ComplaintDetail, type ComplaintMessage, type PickedImage,
} from '../services/complaintsService';
import { STATUS_COLORS } from './ComplaintsListScreen';

const ACCENT = BRAND_YELLOW;
const MAX_IMAGES = 4;

/** Private image: the request carries the user's token (the URL alone is useless). */
function AttachmentImage({ complaintId, attachment, onOpen }: { complaintId: string; attachment: ComplaintAttachment; onOpen: (src: { uri: string; headers: Record<string, string> }) => void }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { void getAuthToken().then(setToken); }, []);
  if (!token) return <View style={styles.attachment}><ActivityIndicator color={ACCENT} /></View>;
  const src = { uri: complaintsService.attachmentUrl(complaintId, attachment.id), headers: { Authorization: `Bearer ${token}` } };
  return (
    <TouchableOpacity onPress={() => onOpen(src)} accessibilityRole="imagebutton" accessibilityLabel={`Agrandir ${attachment.name}`}>
      <Image source={src} style={styles.attachment} />
    </TouchableOpacity>
  );
}

export default function ComplaintDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [c, setC] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  const listRef = useRef<FlatList<ComplaintMessage>>(null);

  const load = useCallback(async (silent: boolean) => {
    try {
      setC(await complaintsService.get(id));
      setError(null);
    } catch (e) {
      if (!silent) setError((e as any)?.response?.status === 404 ? 'Cette réclamation est introuvable.' : complaintErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(false); }, [load]);
  // A team reply arrives in real time (opening the screen also marks it as read on the server).
  useEffect(() => subscribeToComplaintUpdated((p) => { if (p.complaintId === id) void load(true); }), [id, load]);

  const count = c?.messages.length ?? 0;
  useEffect(() => { if (count) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120); }, [count]);

  const pick = async () => {
    if (images.length >= MAX_IMAGES) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - images.length, quality: 0.7 });
      if (res.canceled) return;
      setImages((p) => [...p, ...res.assets.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType }))].slice(0, MAX_IMAGES));
    } catch {
      Alert.alert('Photos indisponibles', "Vérifiez l'autorisation d'accès aux photos dans les réglages.");
    }
  };

  const send = async () => {
    if (sending || (!text.trim() && images.length === 0)) return;
    setSending(true);
    try {
      setC(await complaintsService.reply(id, text.trim(), images));
      setText('');
      setImages([]);
    } catch (e) {
      Alert.alert("L'envoi a échoué", complaintErrorMessage(e)); // the text is kept so nothing is lost
    } finally {
      setSending(false);
    }
  };

  const closed = c?.status === 'closed';

  const renderMessage = ({ item }: { item: ComplaintMessage }) => {
    const mine = item.authorType === 'client';
    return (
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: 1 }]}>
          {!mine ? <Text style={styles.team}>Équipe DietTemple</Text> : null}
          {item.body ? <Text style={[styles.body, { color: mine ? '#1A1405' : colors.text }]}>{item.body}</Text> : null}
          {item.attachments.length > 0 ? (
            <View style={styles.attachments}>
              {item.attachments.map((a) => <AttachmentImage key={a.id} complaintId={id} attachment={a} onOpen={setViewer} />)}
            </View>
          ) : null}
          <Text style={[styles.time, { color: mine ? 'rgba(26,20,5,0.6)' : colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 28 : 44) + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{c?.subject ?? 'Réclamation'}</Text>
          {c ? (
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[c.status] }]} />
              <Text style={[styles.status, { color: STATUS_COLORS[c.status] }]}>{c.statusLabel}</Text>
              <Text style={[styles.ref, { color: colors.textSecondary }]}> · {c.reference}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>
      ) : error || !c ? (
        <View style={styles.center}>
          <Text style={[styles.err, { color: colors.text }]}>{error ?? 'Réclamation introuvable.'}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load(false); }} accessibilityRole="button"><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList ref={listRef} data={c.messages} keyExtractor={(m) => m.id} renderItem={renderMessage} contentContainerStyle={styles.list} />
      )}

      {c ? (
        closed ? (
          <View style={[styles.closed, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border }]}>
            <Text style={[styles.closedText, { color: colors.textSecondary }]}>Cette réclamation est fermée. Créez-en une nouvelle si besoin.</Text>
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: colors.border, backgroundColor: colors.background }]}>
            {images.length > 0 ? (
              <View style={styles.previewRow}>
                {images.map((img, i) => (
                  <View key={img.uri + i} style={styles.previewWrap}>
                    <Image source={{ uri: img.uri }} style={styles.preview} />
                    <TouchableOpacity style={styles.remove} onPress={() => setImages((p) => p.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel="Retirer l'image" hitSlop={8}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TouchableOpacity onPress={pick} style={styles.iconBtn} disabled={images.length >= MAX_IMAGES} accessibilityRole="button" accessibilityLabel="Ajouter une image">
                <Ionicons name="image-outline" size={24} color={images.length >= MAX_IMAGES ? colors.textSecondary : ACCENT} />
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Votre message…"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                multiline
                maxLength={5000}
              />
              <TouchableOpacity
                onPress={send}
                disabled={sending || (!text.trim() && images.length === 0)}
                style={[styles.sendBtn, (sending || (!text.trim() && images.length === 0)) && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Envoyer"
              >
                {sending ? <ActivityIndicator color="#1A1405" /> : <Ionicons name="send" size={18} color="#1A1405" />}
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : null}

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <TouchableOpacity style={styles.viewer} activeOpacity={1} onPress={() => setViewer(null)} accessibilityRole="button" accessibilityLabel="Fermer l'image">
          {viewer ? <Image source={viewer} style={styles.viewerImg} resizeMode="contain" /> : null}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  status: { fontSize: 12, fontWeight: '700' },
  ref: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  err: { fontSize: 15, textAlign: 'center' },
  retry: { borderWidth: 1, borderColor: ACCENT, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: ACCENT, fontWeight: '700' },
  list: { padding: 14, gap: 10 },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: ACCENT, borderBottomRightRadius: 6 },
  team: { color: ACCENT, fontSize: 11, fontWeight: '800', marginBottom: 3 },
  body: { fontSize: 15, lineHeight: 21 },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  attachment: { width: 96, height: 96, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  closed: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  closedText: { fontSize: 13, textAlign: 'center' },
  composer: { paddingHorizontal: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  previewRow: { flexDirection: 'row', gap: 8, paddingBottom: 8, paddingLeft: 4 },
  previewWrap: { width: 56, height: 56 },
  preview: { width: 56, height: 56, borderRadius: 8 },
  remove: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '90%' },
});
