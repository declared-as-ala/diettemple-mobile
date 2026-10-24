/**
 * QualitySheet — minimal bottom-sheet quality picker for the Reels player.
 *
 * Maps three user-friendly labels (Auto / HD / SD) to the dataSaverStore API:
 *   Auto → mode:'auto', videoPref:'auto'
 *   HD   → mode:'high', videoPref:'540'
 *   SD   → mode:'saver', videoPref:'360'
 *
 * Opens with an animated slide-up; tapping the scrim or any option closes it.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_YELLOW } from '../../constants/brand';
import { useDataSaverStore } from '../../store/dataSaverStore';
import type { DataSaverMode, VideoPref, VideoVariantInfo } from '../../utils/videoQuality';

export type QualityLabel = 'auto' | 'hd' | 'sd';

interface QualityOption {
  label: QualityLabel;
  title: string;
  subtitle: string;
  mode: DataSaverMode;
  pref: VideoPref;
}

const OPTIONS: QualityOption[] = [
  { label: 'auto', title: 'Auto', subtitle: 'Recommandé · Adaptatif', mode: 'auto', pref: 'auto' },
  { label: 'hd',   title: 'HD',   subtitle: 'Haute qualité · 540p',   mode: 'high', pref: '540' },
  { label: 'sd',   title: 'SD',   subtitle: 'Économie de données · 360p', mode: 'saver', pref: '360' },
];

function resolveActiveLabel(mode: DataSaverMode, pref: VideoPref): QualityLabel {
  if (mode === 'high' || pref === '540') return 'hd';
  if (mode === 'saver' || pref === '360' || pref === '240') return 'sd';
  return 'auto';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Pass the current reel's variants so we can show/hide unsupported options. */
  variants?: VideoVariantInfo[] | null;
  hasHls?: boolean;
}

export default function QualitySheet({ visible, onClose, variants, hasHls }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const mode = useDataSaverStore((s) => s.mode);
  const videoPref = useDataSaverStore((s) => s.videoPref);
  const setMode = useDataSaverStore((s) => s.setMode);
  const setVideoPref = useDataSaverStore((s) => s.setVideoPref);

  const active = resolveActiveLabel(mode, videoPref);

  // Determine which qualities actually exist for the current video
  const hasVariants = (variants?.length ?? 0) > 0 || !!hasHls;
  const variantQualities = new Set(variants?.map((v) => v.quality) ?? []);
  const hasHdSource = hasHls || variantQualities.has('540') || variantQualities.has('720') || variantQualities.has('1080');
  const hasSdSource = hasHls || variantQualities.has('360') || variantQualities.has('240') || variantQualities.has('480');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacityAnim, slideAnim]);

  const handleSelect = (opt: QualityOption) => {
    setMode(opt.mode);
    setVideoPref(opt.pref);
    onClose();
  };

  const slideY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[s.scrim, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8, transform: [{ translateY: slideY }] }]}
      >
        {/* Handle */}
        <View style={s.handle} />

        {/* Title */}
        <View style={s.titleRow}>
          <Ionicons name="settings-outline" size={16} color={BRAND_YELLOW} />
          <Text style={s.title}>Qualité vidéo</Text>
        </View>

        {/* No variants notice */}
        {!hasVariants && (
          <View style={s.notice}>
            <Ionicons name="information-circle-outline" size={15} color="rgba(255,255,255,0.5)" />
            <Text style={s.noticeText}>Qualité unique disponible pour cette vidéo</Text>
          </View>
        )}

        {/* Options */}
        {OPTIONS.map((opt) => {
          const isActive = active === opt.label;
          // Only hide HD/SD if we know there are variants but none match
          const isDisabled =
            hasVariants &&
            ((opt.label === 'hd' && !hasHdSource) || (opt.label === 'sd' && !hasSdSource));

          return (
            <TouchableOpacity
              key={opt.label}
              style={[s.option, isActive && s.optionActive, isDisabled && s.optionDisabled]}
              onPress={() => !isDisabled && handleSelect(opt)}
              activeOpacity={isDisabled ? 1 : 0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive, disabled: isDisabled }}
            >
              <View style={s.optionLeft}>
                <View style={[s.qualityBadge, isActive && s.qualityBadgeActive]}>
                  <Text style={[s.qualityBadgeText, isActive && s.qualityBadgeTextActive]}>
                    {opt.title}
                  </Text>
                </View>
                <View>
                  <Text style={[s.optionTitle, isDisabled && s.optionTitleDisabled]}>
                    {opt.title}
                  </Text>
                  <Text style={s.optionSubtitle}>
                    {isDisabled ? 'Non disponible pour cette vidéo' : opt.subtitle}
                  </Text>
                </View>
              </View>
              {isActive && (
                <Ionicons name="checkmark-circle" size={20} color={BRAND_YELLOW} />
              )}
              {!isActive && !isDisabled && (
                <View style={s.radioEmpty} />
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#141416',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
    lineHeight: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionActive: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.4)',
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  qualityBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadgeActive: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: 'rgba(212,175,55,0.45)',
  },
  qualityBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  qualityBadgeTextActive: {
    color: BRAND_YELLOW,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  optionTitleDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  optionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
