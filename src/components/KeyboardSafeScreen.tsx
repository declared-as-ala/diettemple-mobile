import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardSafeScreenProps {
  children: ReactNode;
  /**
   * Set false when children include a FlatList/SectionList that manages
   * its own scrolling. The component still provides keyboard avoidance.
   */
  scrollable?: boolean;
  /** Style applied to the outermost KeyboardAvoidingView */
  style?: StyleProp<ViewStyle>;
  /** Style applied to the inner ScrollView's contentContainer */
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /**
   * Extra bottom padding beyond the safe-area inset.
   * Use when a fixed footer sits outside this component.
   */
  extraBottomPadding?: number;
  /**
   * Height of any fixed element (e.g. custom header) rendered above this
   * component. Needed on iOS so the keyboard offset is accurate.
   * Screens with headerShown:false can leave this at 0.
   */
  keyboardVerticalOffset?: number;
  backgroundColor?: string;
}

/**
 * Drop-in screen wrapper that keeps inputs visible when the software
 * keyboard appears, on both iOS and Android.
 *
 * iOS  → KeyboardAvoidingView behavior="padding" (shifts content up)
 * Android → behavior=undefined (the OS handles adjustResize natively)
 *
 * Wrap every screen that contains TextInput with this component.
 *
 * Usage – scrollable form:
 *   <KeyboardSafeScreen>
 *     <Input ... />
 *     <Button ... />
 *   </KeyboardSafeScreen>
 *
 * Usage – screen with its own FlatList:
 *   <KeyboardSafeScreen scrollable={false}>
 *     <SearchBar />
 *     <FlatList keyboardShouldPersistTaps="handled" ... />
 *   </KeyboardSafeScreen>
 */
export default function KeyboardSafeScreen({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  extraBottomPadding = 0,
  keyboardVerticalOffset = 0,
  backgroundColor,
}: KeyboardSafeScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + extraBottomPadding;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, backgroundColor ? { backgroundColor } : null, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            bottomPadding > 0 ? { paddingBottom: bottomPadding } : null,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, bottomPadding > 0 ? { paddingBottom: bottomPadding } : null]}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
