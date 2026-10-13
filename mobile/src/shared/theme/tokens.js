// Brand colours — matches web's tailwind brand/navy palette
// (navy #274185 is the exact logo blue; orange #f5923b is the primary CTA colour).
// Key names are kept ("green"/"blue"/"red"/"gold") so existing call sites
// (`color="green"`, `c.blue`, etc.) don't need touching — only the hues change:
// `green` is now the primary/CTA slot (orange), `blue` is the structural/brand slot (navy).
export const PHYSTECH = {
  green: '#f5923b',
  greenDeep: '#c2620f',
  blue: '#274185',
  blueDeep: '#182A5C',
  red: '#DC2626',
  redDeep: '#B91C1C',
  gold: '#EAB308',
  goldDeep: '#A16207',
};

// Font family aliases (loaded in App.js via @expo-google-fonts/onest).
export const FONT = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
};

// Long-form lesson documents share one readable measure and spacing rhythm.
export const DOCUMENT = {
  gutter: 16, gap: 16, sectionGap: 32, inset: 24, maxWidth: 720,
  titleSize: 24, titleLine: 32, headingSize: 18, headingLine: 26,
  bodySize: 16, bodyLine: 26, captionSize: 14, captionLine: 22,
};

export const FORMULA = { gap: 8, size: 20 };

// Parent comments: one typography and spacing scale for editor, feed and detail.
export const COMMENT = {
  iconSize: 14, iconStrokeWidth: 4,
  gutter: 16, inset: 12, gap: 8, radius: 12, buttonSize: 32, editorHeight: 220,
  bodySize: 14, bodyLine: 23, labelSize: 13, captionSize: 12, titleSize: 18,
  avatarSize: 20, dotSize: 6, limit: 1000,
  avatarTextSize: 10, modalMaxWidth: 560, modalInset: 24, actionGap: 12,
};

// Map a brand colour name ("green" | "blue" | "red" | "gold") to its hex.
export function brand(name) {
  return PHYSTECH[name] || PHYSTECH.green;
}
