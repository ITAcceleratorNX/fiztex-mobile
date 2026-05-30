// Tamos brand colours — from the school logo (hexagonal mosaic red/green/blue/gold).
export const TAMOS = {
  green: '#2A8847',
  greenDeep: '#1B6B36',
  blue: '#2C4A9E',
  blueDeep: '#1F3A82',
  red: '#D63030',
  redDeep: '#B12626',
  gold: '#F2B73D',
  goldDeep: '#D69A1E',
};

// Font family aliases (loaded in App.js via @expo-google-fonts/onest).
export const FONT = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
};

// Map a Tamos colour name ("green" | "blue" | "red" | "gold") to its hex.
export function brand(name) {
  return TAMOS[name] || TAMOS.green;
}
