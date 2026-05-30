import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';
import { TAMOS } from '@shared/theme/tokens';

export function Tree({ size = 56, variant = 'oak' }) {
  if (variant === 'pine') {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 56">
        <Ellipse cx={20} cy={52} rx={12} ry={3} fill="#00000018" />
        <Rect x={17} y={36} width={6} height={18} rx={2} fill="#8C8678" />
        <Ellipse cx={20} cy={20} rx={14} ry={18} fill={TAMOS.greenDeep} />
        <Ellipse cx={20} cy={16} rx={11} ry={14} fill={TAMOS.green} />
        <Ellipse cx={20} cy={12} rx={8} ry={10} fill="#89C4A0" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 56">
      <Ellipse cx={24} cy={52} rx={14} ry={3} fill="#00000018" />
      <Rect x={20} y={28} width={8} height={26} rx={3} fill="#8C8678" />
      <Circle cx={24} cy={22} r={18} fill={TAMOS.greenDeep} />
      <Circle cx={14} cy={20} r={12} fill={TAMOS.green} />
      <Circle cx={34} cy={20} r={12} fill={TAMOS.green} />
      <Circle cx={24} cy={14} r={11} fill="#89C4A0" />
    </Svg>
  );
}
