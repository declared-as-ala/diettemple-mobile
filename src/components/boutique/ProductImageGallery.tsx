import { BRAND_YELLOW } from '../../constants/brand';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resolveMediaUrl } from '../../config/api.config';

function Photo({ uri, name, width, height }: { uri?: string; name: string; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!!uri);
  useEffect(() => { setFailed(false); setLoading(!!uri); }, [uri]);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {uri && !failed ? <Image source={{ uri }} resizeMode="contain" style={{ width, height }}
        accessibilityLabel={name} onLoadEnd={() => setLoading(false)}
        onError={() => { setFailed(true); setLoading(false); }} /> : <View style={s.fallback}>
        <Ionicons name="cube-outline" size={48} color="#8D8778" /><Text style={s.fallbackText}>Photo non disponible</Text>
      </View>}
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#A88D44" />}
    </View>
  );
}

export default function ProductImageGallery({ images, name }: { images: string[]; name: string }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const galleryWidth = width - 40;
  const imageHeight = Math.min(galleryWidth * 0.92, 410);
  const urls = useMemo(() => images.map((uri) => resolveMediaUrl(uri)).filter((uri): uri is string => !!uri), [images]);
  const slides: (string | undefined)[] = urls.length ? urls : [undefined];
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const list = useRef<FlatList<string | undefined>>(null);
  const viewerHeight = Math.max(160, height - insets.top - insets.bottom - 154);
  const select = (next: number) => {
    setIndex(next); setZoom(1);
    list.current?.scrollToOffset({ offset: next * galleryWidth, animated: false });
  };
  useEffect(() => {
    list.current?.scrollToOffset({ offset: index * galleryWidth, animated: false });
  }, [galleryWidth, index]);

  return (
    <View>
      <View style={[s.stage, { height: imageHeight + 40 }]}>
        <FlatList ref={list} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)} getItemLayout={(_, i) => ({ length: galleryWidth, offset: galleryWidth * i, index: i })}
          onMomentumScrollEnd={(event) => setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / galleryWidth))))}
          renderItem={({ item, index: slide }) => <Pressable style={[s.slide, { width: galleryWidth }]}
            onPress={() => { setIndex(slide); setZoom(1); setExpanded(true); }}
            accessibilityRole="button" accessibilityLabel={'Agrandir la photo ' + (slide + 1) + ' de ' + name}>
            <Photo uri={item} name={name} width={galleryWidth - 60} height={imageHeight - 28} />
          </Pressable>}
        />
        <View style={s.imageCount}><Text style={s.imageCountText}>{index + 1} / {slides.length}</Text></View>
        <Pressable style={s.expand} onPress={() => { setZoom(1); setExpanded(true); }}
          accessibilityRole="button" accessibilityLabel="Agrandir l’image du produit">
          <Ionicons name="expand-outline" size={20} color="#373426" />
        </Pressable>
      </View>
      {urls.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbnails}>
        {urls.map((uri, i) => <Pressable key={uri + i} style={[s.thumbnail, i === index && s.selectedThumbnail]} onPress={() => select(i)}
          accessibilityRole="button" accessibilityState={{ selected: i === index }} accessibilityLabel={'Afficher la photo ' + (i + 1)}>
          <Photo uri={uri} name={name} width={45} height={48} />
        </Pressable>)}
      </ScrollView>}
      <Modal visible={expanded} onRequestClose={() => setExpanded(false)} animationType="fade">
        <View style={[s.viewer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={s.viewerHeader}>
            <Text numberOfLines={1} style={s.viewerTitle}>{name}</Text>
            <Pressable style={s.roundButton} onPress={() => setExpanded(false)} accessibilityRole="button" accessibilityLabel="Fermer l’image">
              <Ionicons name="close" size={24} color="#2B2D22" />
            </Pressable>
          </View>
          <ScrollView horizontal contentContainerStyle={{ minWidth: width }} style={{ flex: 1 }} bounces={false}>
            <ScrollView contentContainerStyle={{ minHeight: viewerHeight, justifyContent: 'center' }} style={{ width: width * zoom }} bounces={false}>
              <Photo uri={slides[index]} name={name} width={width * zoom} height={viewerHeight * zoom} />
            </ScrollView>
          </ScrollView>
          <View style={s.viewerControls}>
            <Pressable disabled={index === 0} style={[s.roundButton, index === 0 && s.disabled]} onPress={() => select(index - 1)}
              accessibilityRole="button" accessibilityLabel="Photo précédente"><Ionicons name="chevron-back" size={23} color="#383B2D" /></Pressable>
            <Text style={s.viewerCount}>{index + 1} / {slides.length}</Text>
            <Pressable style={s.zoomButton} onPress={() => setZoom((value) => value === 1 ? 2 : 1)}
              accessibilityRole="button" accessibilityLabel={zoom === 1 ? 'Zoomer l’image' : 'Réduire l’image'}>
              <Ionicons name={zoom === 1 ? 'add' : 'remove'} size={20} color="#383B2D" /><Text style={s.zoomText}>{zoom}×</Text>
            </Pressable>
            <Pressable disabled={index === slides.length - 1} style={[s.roundButton, index === slides.length - 1 && s.disabled]}
              onPress={() => select(index + 1)} accessibilityRole="button" accessibilityLabel="Photo suivante">
              <Ionicons name="chevron-forward" size={23} color="#383B2D" />
            </Pressable>
          </View>
          {zoom > 1 && <Text style={s.panHint}>Faites glisser pour explorer l’image</Text>}
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  stage: { backgroundColor: '#F8F7F3', borderRadius: 24, overflow: 'hidden' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 28 },
  imageCount: { position: 'absolute', bottom: 16, left: 18, backgroundColor: '#E9E7DE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  imageCountText: { color: '#605B4E', fontSize: 10, fontWeight: '600' },
  expand: { position: 'absolute', right: 10, bottom: 8, width: 44, height: 44, borderRadius: 14, backgroundColor: '#EBE8DC', justifyContent: 'center', alignItems: 'center' },
  thumbnails: { gap: 10, paddingTop: 12, paddingBottom: 3 },
  thumbnail: { width: 62, height: 64, borderRadius: 12, backgroundColor: '#F8F7F3', borderWidth: 2, borderColor: '#383E31', alignItems: 'center', justifyContent: 'center' },
  selectedThumbnail: { borderColor: BRAND_YELLOW },
  fallback: { alignItems: 'center', gap: 12 },
  fallbackText: { fontSize: 12, color: '#776F60' },
  viewer: { flex: 1, backgroundColor: '#F8F7F3' },
  viewerHeader: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', gap: 12, alignItems: 'center' },
  viewerTitle: { flex: 1, color: '#383B2D', fontSize: 14, fontWeight: '600' },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9E8DF', alignItems: 'center', justifyContent: 'center' },
  viewerControls: { flexDirection: 'row', gap: 18, minHeight: 70, alignItems: 'center', justifyContent: 'center' },
  viewerCount: { color: '#666A59', fontSize: 13 },
  zoomButton: { minWidth: 72, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#DFD5AE' },
  zoomText: { fontSize: 13, fontWeight: '700', color: '#383B2D' },
  panHint: { textAlign: 'center', color: '#666A59', fontSize: 11, paddingBottom: 12 },
  disabled: { opacity: 0.3 },
});

