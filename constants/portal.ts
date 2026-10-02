import { StyleSheet } from 'react-native';

export const palette = {
  background: '#F6F7F2', surface: '#FFFFFF', ink: '#172E28', muted: '#64736D',
  green: '#245C47', greenDark: '#173F32', mint: '#E9F1E8', lime: '#DDEDAD',
  border: '#DFE6DE', danger: '#AD3838', dangerSoft: '#FFF0ED',
};

export const ui = StyleSheet.create({
  title: { color: palette.ink, fontSize: 30, fontWeight: '700', letterSpacing: -1 },
  heading: { color: palette.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.4 },
  body: { color: palette.muted, fontSize: 15, lineHeight: 23 },
  eyebrow: { color: palette.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  card: { backgroundColor: palette.surface, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: palette.border, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { gap: 18 },
  grow: { flex: 1, minWidth: 0 },
  divider: { height: 1, backgroundColor: palette.border },
  pressed: { opacity: 0.72 },
});
