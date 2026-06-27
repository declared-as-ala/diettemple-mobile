/**
 * Shared layout for all Drawer stack screens: safe area + optional header row.
 * Use as root wrapper so the header (drawer toggle + title) never overlaps the status bar.
 * Works on Android (status bar), iPhone (notch / Dynamic Island), and different screen sizes.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { useTheme } from '../context/ThemeContext';

const HEADER_MIN_HEIGHT = 56;
const HEADER_PADDING_TOP_EXTRA = 8;
const HORIZONTAL_PADDING = 16;

export interface DrawerScreenContainerProps {
  children: React.ReactNode;
  /** Page title (truncates if too long). */
  title?: string;
  /** Optional subtitle below title (e.g. "3 exercices"). */
  subtitle?: string;
  /** Left action: default is drawer menu. Pass a ReactNode for back button or custom. */
  leftAction?: React.ReactNode;
  /** Right-side node (e.g. icon button). */
  rightNode?: React.ReactNode;
  /** Custom header row (full control). Rendered below safe area; no default title/left. */
  renderHeader?: () => React.ReactNode;
  /** If true, no header row; only safe area top padding and children. */
  noHeader?: boolean;
  /** Background color for the screen (default from theme). */
  backgroundColor?: string;
  /** Optional style for the main content wrapper (below header). */
  contentStyle?: ViewStyle;
  /** Border color for header bottom border (default from theme). */
  headerBorderColor?: string;
  /** Title color (default from theme). */
  titleColor?: string;
  subtitleColor?: string;
}

function DefaultLeftAction() {
  const { openDrawer } = useDrawerOpen();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.menuBtn, { backgroundColor: colors.cardBackground }]}
      onPress={openDrawer}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="menu" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

function DrawerScreenContainer({
  children,
  title,
  subtitle,
  leftAction,
  rightNode,
  renderHeader,
  noHeader,
  backgroundColor,
  contentStyle,
  headerBorderColor,
  titleColor,
  subtitleColor,
}: DrawerScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.background;
  const borderColor = headerBorderColor ?? colors.border;
  const tColor = titleColor ?? colors.text;
  const sColor = subtitleColor ?? colors.textSecondary;

  const contentTop = noHeader ? insets.top + HEADER_PADDING_TOP_EXTRA : 0;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {!noHeader && (renderHeader ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          {renderHeader()}
        </View>
      ) : (
        <View style={[styles.headerWrap, { paddingTop: insets.top + HEADER_PADDING_TOP_EXTRA, borderBottomColor: borderColor }]}>
          <View style={[styles.headerRow, { minHeight: HEADER_MIN_HEIGHT }]}>
            {leftAction ?? <DefaultLeftAction />}
            <View style={styles.titleBlock}>
              {title != null && (
                <Text style={[styles.title, { color: tColor }]} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle != null && (
                <Text style={[styles.subtitle, { color: sColor }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
            {rightNode != null ? <View style={styles.right}>{rightNode}</View> : <View style={styles.menuBtn} />}
          </View>
        </View>
      ))}
      <View style={[styles.content, contentStyle, contentTop > 0 && { paddingTop: contentTop }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    borderBottomWidth: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
});

export default DrawerScreenContainer;
