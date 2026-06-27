export function lightImpact() {
  try {
    const Haptics = require('expo-haptics').default;
    if (Haptics?.impactAsync) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function selectionAsync() {
  try {
    const Haptics = require('expo-haptics').default;
    if (Haptics?.selectionAsync) Haptics.selectionAsync();
  } catch {}
}
