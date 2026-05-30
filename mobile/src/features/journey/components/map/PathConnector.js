import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useJourneyTheme, ALIGN_X } from '../../constants/theme';
import { Flag, Rock } from '../illustrations/Decor';
import { Tree } from '../illustrations/Tree';

function parsePercent(p) {
  return parseFloat(p);
}

const WIDTH = 320;
const HEIGHT = 80;

export function PathConnector({ from, to, completed, index }) {
  const t = useJourneyTheme();
  const x1 = (parsePercent(ALIGN_X[from]) / 100) * WIDTH;
  const x2 = (parsePercent(ALIGN_X[to]) / 100) * WIDTH;
  const y1 = 4;
  const y2 = HEIGHT - 4;
  const cx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} Q ${cx} ${y1 + 8}, ${cx} ${HEIGHT / 2} T ${x2} ${y2}`;

  const baseColor = completed ? t.pathLight : t.cardBorder;
  const stroke = completed ? t.goldDeep : t.path;

  const showLeftDecor = index % 3 === 0;
  const showRightDecor = index % 3 === 1;
  const showFlag = index % 4 === 2;

  return (
    <View style={styles.container}>
      {showLeftDecor ? (
        <View style={[styles.decor, { left: 6, top: 10 }]}>
          <Tree size={48} variant={index % 2 === 0 ? 'pine' : 'oak'} />
        </View>
      ) : null}
      {showRightDecor ? (
        <View style={[styles.decor, { right: 6, top: 18 }]}>
          <Rock size={42} />
        </View>
      ) : null}
      {showFlag ? (
        <View style={[styles.decor, { right: 30, top: 8 }]}>
          <Flag size={36} />
        </View>
      ) : null}
      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Path d={d} stroke={stroke} strokeWidth={14} strokeLinecap="round" fill="none" />
        <Path d={d} stroke={baseColor} strokeWidth={8} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
    position: 'relative',
    width: '100%',
  },
  decor: {
    position: 'absolute',
    zIndex: 2,
  },
});
