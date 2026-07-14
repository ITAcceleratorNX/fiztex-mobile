// Fiztex brand colours — matches fiztex-web's tailwind brand/navy palette
// (navy #274185 is the exact logo blue; orange #f5923b is the primary CTA colour).
// Key names are kept ("green"/"blue"/"red"/"gold") so existing call sites
// (`color="green"`, `c.blue`, etc.) don't need touching — only the hues change:
// `green` is now the primary/CTA slot (orange), `blue` is the structural/brand slot (navy).
export const FIZTEX = {
  green: '#f5923b',
  greenDeep: '#c2620f',
  blue: '#274185',
  blueDeep: '#182a5c',
  red: '#dc2626',
  redDeep: '#b91c1c',
  gold: '#eab308',
  goldDeep: '#a16207',
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
