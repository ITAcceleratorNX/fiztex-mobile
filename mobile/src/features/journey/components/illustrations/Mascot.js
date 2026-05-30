import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';

export function Mascot({ size = 48 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx={32} cy={56} rx={20} ry={4} fill="#00000018" />
      <G>
        <Ellipse cx={32} cy={34} rx={22} ry={24} fill="#58CC02" />
        <Ellipse cx={32} cy={42} rx={18} ry={16} fill="#89E219" />
        <Path d="M14 18 Q18 8 26 14 Q22 16 20 22 Z" fill="#58CC02" />
        <Path d="M50 18 Q46 8 38 14 Q42 16 44 22 Z" fill="#58CC02" />
        <Circle cx={24} cy={28} r={8} fill="#FFFFFF" />
        <Circle cx={40} cy={28} r={8} fill="#FFFFFF" />
        <Circle cx={24} cy={29} r={3.5} fill="#1A3358" />
        <Circle cx={40} cy={29} r={3.5} fill="#1A3358" />
        <Circle cx={25} cy={27.5} r={1} fill="#FFFFFF" />
        <Circle cx={41} cy={27.5} r={1} fill="#FFFFFF" />
        <Polygon points="32,34 28,40 36,40" fill="#FFC800" />
        <Ellipse cx={22} cy={46} rx={5} ry={3} fill="#46A302" />
        <Ellipse cx={42} cy={46} rx={5} ry={3} fill="#46A302" />
        <Rect x={26} y={54} width={4} height={6} rx={2} fill="#FFC800" />
        <Rect x={34} y={54} width={4} height={6} rx={2} fill="#FFC800" />
      </G>
    </Svg>
  );
}
