import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { BRAND_YELLOW } from '../constants/brand';
import { useTheme } from '../context/ThemeContext';
import { COMPLAINT_CATEGORIES, complaintErrorMessage, complaintsService, type ComplaintCategory, type PickedImage } from '../services/complaintsService';

const ACCENT = BRAND_YELLOW;
const MAX_IMAGES = 4;

export default function NewComplaintScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);

  const subjectOk = subject.trim().length >= 3;
  const descriptionOk = description.trim().length >= 10;
  const valid = !!category && subjectOk && descriptionOk;

  const pick = async () => {
    if (images.length >= MAX_IMAGES) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
        quality: 0.7, // keeps screenshots well under the 5 MB limit
      });
      if (res.canceled) return;
      setImages((prev) => [...prev, ...res.assets.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType }))].slice(0, MAX_IMAGES));
    } catch {
      Alert.alert('Photos indisponibles', "Impossible d'ouvrir la galerie. Vérifiez l'autorisation d'accès aux photos dans les réglages.");
    }
  };

  const submit = async () => {
    setTouched(true);
    if (!valid || sending) return;
    setSending(true);
    try {
      const created = await complaintsService.create({ category: category!, subject: subject.trim(), description: description.trim(), images });
      Toast.show({ type: 'success', text1: 'Réclamation envoyée ✅', text2: `Référence ${created.reference}`, visibilityTime: 3000 });
      navigation.replace('ComplaintDetail', { id: created.id });
    } catch (e) {
      Alert.alert("L'envoi a échoué", complaintErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 28 : 44) + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Nouvelle réclamation</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>CATÉGORIE</Text>
        <View style={styles.chips}>
          {COMPLAINT_CATEGORIES.map((c) => {
            const on = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.chip, { borderColor: on ? ACCENT : colors.border, backgroundColor: on ? 'rgba(201,164,92,0.15)' : colors.cardBackground }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                activeOpacity={0.85}
              >
                <Ionicons name={c.icon as any} size={18} color={on ? ACCENT : colors.textSecondary} />
                <Text style={[styles.chipText, { color: on ? ACCENT : colors.text }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {touched && !category ? <Text style={styles.error}>Choisissez une catégorie.</Text> : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>SUJET</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Résumez votre problème en une phrase"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, backgroundColor: colors.cardBackground, borderColor: touched && !subjectOk ? '#EF4444' : colors.border }]}
          maxLength={140}
          returnKeyType="next"
        />
        {touched && !subjectOk ? <Text style={styles.error}>Le sujet est trop court (3 caractères minimum).</Text> : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez ce qui s'est passé : que faisiez-vous, que s'est-il affiché ?"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, styles.textarea, { color: colors.text, backgroundColor: colors.cardBackground, borderColor: touched && !descriptionOk ? '#EF4444' : colors.border }]}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />
        {touched && !descriptionOk ? <Text style={styles.error}>Décrivez votre problème (10 caractères minimum).</Text> : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>CAPTURES D'ÉCRAN (FACULTATIF)</Text>
        <View style={styles.images}>
          {images.map((img, i) => (
            <View key={img.uri + i} style={styles.thumbWrap}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <TouchableOpacity style={styles.remove} onPress={() => setImages((p) => p.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel="Retirer l'image" hitSlop={8}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_IMAGES ? (
            <TouchableOpacity style={[styles.add, { borderColor: colors.border }]} onPress={pick} accessibilityRole="button" accessibilityLabel="Ajouter une image" activeOpacity={0.85}>
              <Ionicons name="image-outline" size={24} color={ACCENT} />
              <Text style={[styles.addText, { color: colors.textSecondary }]}>{images.length}/{MAX_IMAGES}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>JPEG, PNG ou WebP, 5 Mo maximum par image.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.send, (!valid || sending) && { opacity: 0.55 }]} onPress={submit} disabled={sending} activeOpacity={0.88} accessibilityRole="button">
          {sending ? <ActivityIndicator color="#1A1405" /> : <><Ionicons name="paper-plane" size={18} color="#1A1405" /><Text style={styles.sendText}>Envoyer la réclamation</Text></>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 6 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 44 },
  chipText: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 48 },
  textarea: { minHeight: 130 },
  error: { color: '#F87171', fontSize: 12, marginTop: 6 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { width: 76, height: 76 },
  thumb: { width: 76, height: 76, borderRadius: 12 },
  remove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  add: { width: 76, height: 76, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addText: { fontSize: 11 },
  hint: { fontSize: 12, marginTop: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, backgroundColor: ACCENT },
  sendText: { color: '#1A1405', fontSize: 15, fontWeight: '800' },
});
