// Fiztex brand colours — matches fiztex-web's tailwind brand/navy palette
// (navy #274185 is the exact logo blue; orange #f5923b is the primary CTA colour).
// Key names are kept ("green"/"blue"/"red"/"gold") so existing call sites
// (`color="green"`, `c.blue`, etc.) don't need touching — only the hues change:
// `green` is now the primary/CTA slot (orange), `blue` is the structural/brand slot (navy).
export const FIZTEX = {
  // Figma schedule accent (orange #FB923C) — primary CTA / "now" / active tab
  green: '#FB923C',
  greenDeep: '#EA580C',
  // Figma navy #274185 — titles, selected day chip, "next"
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

// Map a Fiztex colour name ("green" | "blue" | "red" | "gold") to its hex.
export function brand(name) {
  return FIZTEX[name] || FIZTEX.green;
}
