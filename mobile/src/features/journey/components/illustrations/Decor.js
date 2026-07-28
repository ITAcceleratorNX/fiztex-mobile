import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import { PHYSTECH } from '@shared/theme/tokens';

export function Flag({ size = 40 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 56">
      <Ellipse cx={20} cy={52} rx={8} ry={2} fill="#00000018" />
      <Rect x={18} y={6} width={3} height={48} rx={1.5} fill="#8C8678" />
      <Polygon points="21,6 38,14 21,22" fill={PHYSTECH.red} />
      <Polygon points="21,6 33,10 21,14" fill={PHYSTECH.redDeep} />
    </Svg>
  );
}

export function Rock({ size = 36 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 32">
      <Ellipse cx={20} cy={28} rx={14} ry={3} fill="#00000018" />
      <Path d="M6 26 Q4 14 16 10 Q26 6 34 14 Q38 22 32 28 Z" fill="#C9C2B0" />
      <Path d="M10 24 Q10 16 18 14 Q24 14 28 18" stroke="#FFFFFF66" strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function Cloud({ size = 60 }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 80 48">
      <Circle cx={20} cy={28} r={14} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={40} cy={20} r={18} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={60} cy={28} r={14} fill="#FFFFFF" opacity={0.95} />
      <Ellipse cx={40} cy={36} rx={28} ry={10} fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
}

export function Mountain({ size = 80 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 80">
      <Polygon points="10,70 35,20 60,70" fill="#8C8678" />
      <Polygon points="40,70 65,10 90,70" fill="#4A463E" />
      <Polygon points="65,10 60,22 70,22" fill="#FFFFFF" opacity={0.9} />
      <Polygon points="35,20 30,32 40,32" fill="#FFFFFF" opacity={0.85} />
    </Svg>
  );
}
