import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { COMMENT } from '@shared/theme/tokens';

/**
 * IconPark Message (信息), Figma 27:1559 / 27:1561.
 * Copyright 2019-present Bytedance Inc., Apache-2.0 (licenses/iconpark.txt).
 * Original paths retained; adapted to React Native and theme colors.
 * https://github.com/bytedance/IconPark/blob/master/packages/react/src/icons/Message.tsx
 */
export function ParentCommentIcon({ color }) {
  return (
    <Svg width={COMMENT.iconSize} height={COMMENT.iconSize} viewBox="0 0 48 48" fill="none"
      stroke={color} strokeWidth={COMMENT.iconStrokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M44.0001 24C44.0001 35.0457 35.0458 44 24.0001 44C18.0266 44 4.00006 44 4.00006 44C4.00006 44 4.00006 29.0722 4.00006 24C4.00006 12.9543 12.9544 4 24.0001 4C35.0458 4 44.0001 12.9543 44.0001 24Z" />
      <Path d="M14 18L32 18" />
      <Path d="M14 26H32" />
      <Path d="M14 34H24" />
    </Svg>
  );
}
