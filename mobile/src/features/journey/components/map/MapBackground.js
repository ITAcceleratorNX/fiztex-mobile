import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';
import { Cloud, Mountain } from '../illustrations/Decor';

export function MapBackground({ children }) {
  const { c } = useTheme();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[c.bg, c.blueSoft, c.greenSoft, c.bg2]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', `${c.green}18`]}
        style={[StyleSheet.absoluteFill, { top: '55%' }]}
      />
      <View style={[styles.cloud, { top: 90, left: 12, opacity: 0.7 }]}>
        <Cloud size={70} />
      </View>
      <View style={[styles.cloud, { top: 220, right: 16, opacity: 0.55 }]}>
        <Cloud size={56} />
      </View>
      <View style={[styles.cloud, { top: 380, left: 30, opacity: 0.45 }]}>
        <Cloud size={60} />
      </View>
      <View style={styles.mountainLeft}>
        <Mountain size={120} />
      </View>
      <View style={styles.mountainRight}>
        <Mountain size={96} />
      </View>
      <View style={[styles.hillBack, { backgroundColor: c.green, opacity: 0.08 }]} />
      <View style={[styles.hillMid, { backgroundColor: c.green, opacity: 0.12 }]} />
      <View style={[styles.hillFront, { backgroundColor: c.greenSoft, opacity: 0.5 }]} />
      {children}
    </View>
  );
}

export function SectionBanner({ label, emoji }) {
  const { c } = useTheme();

  return (
    <View style={[styles.banner, { backgroundColor: c.surface, borderColor: c.border }]}>
      {emoji ? <Txt style={{ fontSize: 16 }}>{emoji}</Txt> : null}
      <Txt style={{ fontSize: 11, fontWeight: '700', color: c.ink2, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100%',
  },
  cloud: {
    position: 'absolute',
    zIndex: 1,
  },
  mountainLeft: {
    position: 'absolute',
    top: 160,
    left: -30,
    opacity: 0.35,
    zIndex: 1,
  },
  mountainRight: {
    position: 'absolute',
    top: 320,
    right: -20,
    opacity: 0.25,
    zIndex: 1,
  },
  hillBack: {
    position: 'absolute',
    bottom: 80,
    left: -60,
    right: -60,
    height: 220,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 140,
  },
  hillMid: {
    position: 'absolute',
    bottom: 30,
    left: -40,
    right: -40,
    height: 160,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 100,
  },
  hillFront: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 90,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 90,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
