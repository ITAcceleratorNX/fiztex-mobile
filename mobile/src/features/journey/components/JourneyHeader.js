import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, CircleButton, Pill } from '@shared/components/ui';
import { FiztexMark } from '@shared/components/Hex';
import { useTheme } from '@shared/theme/ThemeContext';
import { useJourney } from '../context/JourneyContext';

function StatTile({ icon, value, label, color, bg }) {
  const { c } = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: bg, borderColor: c.border }]}>
      <Icon name={icon} size={16} color={color} />
      <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink, marginTop: 2 }}>{value}</Txt>
      <Txt style={{ fontSize: 9, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Txt>
    </View>
  );
}

export function JourneyHeader() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { progress } = useJourney();
  const { points, stars, badges } = progress.stats;

  return (
    <View style={[styles.container, { top: insets.top + 6 }]}>
      <Card style={styles.card} padded>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <View style={[styles.glyphWrap, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <FiztexMark size={26} color={c.blue} />
            </View>
            <View>
              <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                fiztex
              </Txt>
              <Txt style={{ fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginTop: 1 }}>
                Путь героя
              </Txt>
            </View>
          </View>
          <CircleButton icon="bell" badge />
        </View>

        <View style={styles.statsRow}>
          <StatTile icon="flame" value={stars} label="Звёзды" color={c.red} bg={c.redSoft} />
          <StatTile icon="coin" value={points} label="XP" color={c.goldDeep} bg={c.goldSoft} />
          <StatTile icon="star" value={5} label="Серия" color={c.green} bg={c.greenSoft} />
          <StatTile icon="target" value={badges.length} label="Бейджи" color={c.blue} bg={c.blueSoft} />
        </View>

        <View style={styles.xpRow}>
          <View style={[styles.xpTrack, { backgroundColor: c.bg2, borderColor: c.border }]}>
            <View
              style={[
                styles.xpFill,
                {
                  width: `${Math.min(100, (points / 300) * 100)}%`,
                  backgroundColor: c.green,
                },
              ]}
            />
          </View>
          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, minWidth: 64, textAlign: 'right' }}>
            {points}/300 XP
          </Txt>
        </View>

        <Pill color="green" style={{ marginTop: 10, alignSelf: 'flex-start' }}>
          Сезон · {badges.length} наград
        </Pill>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  card: {
    borderRadius: 22,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glyphWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
  },
});
