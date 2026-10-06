import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

export function BrandHeader() {
  return <View style={styles.header}>
    <Image source={require('../../assets/images/aperture-icon.png')} style={styles.logo} accessibilityLabel="Aperture" />
    <View style={{ flex: 1 }}><Text style={styles.brand}>Aperture</Text><Text style={styles.brandSub}>FINANCIAL INTELLIGENCE</Text></View>
    <Pressable accessibilityLabel="Confirmed flip notifications" accessibilityRole="button" onPress={() => router.push('/inbox')} style={styles.headerAction}><Bell size={18} color={colors.secondary} strokeWidth={1.6} /></Pressable>
  </View>;
}

export function Page({ children, refreshControl }: { children: ReactNode; refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>> }) {
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <LinearGradient colors={['#122224', '#0E1314', '#1A1712']} locations={[0, .56, 1]} style={StyleSheet.absoluteFill} />
    <BrandHeader />
    <ScrollView contentContainerStyle={styles.scroll} refreshControl={refreshControl}>{children}</ScrollView>
  </SafeAreaView>;
}

export function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <View style={styles.heading}><Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}
export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} style={styles.card}>{children}</Pressable>;
}
export function Label({ children }: { children: ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
export function Value({ children, tone }: { children: ReactNode; tone?: 'bull' | 'bear' }) {
  return <Text style={[styles.value, tone ? { color: colors[tone] } : null]}>{children}</Text>;
}
export function Note({ children }: { children: ReactNode }) { return <Text style={styles.note}>{children}</Text>; }
export function State({ loading, error, empty, retry }: { loading?: boolean; error?: string; empty?: string; retry?: () => void }) {
  if (loading) return <View style={styles.state}><ActivityIndicator color={colors.accent} /><Note>Loading source data…</Note></View>;
  return <Card><Note>{error || empty || 'No data available.'}</Note>{retry ? <Pressable onPress={retry} accessibilityRole="button"><Text style={styles.retry}>Try again →</Text></Pressable> : null}</Card>;
}
export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.pill, active && styles.pillActive]} onPress={onPress}><Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text></Pressable>;
}
export function Disclaimer() { return <Text style={styles.disclaimer}>Aperture supports market research and scenario review. Signals may be delayed and are not financial advice or trade instructions.</Text>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, scroll: { paddingHorizontal: 20, paddingTop: 27, paddingBottom: 52 },
  header: { height: 64, marginHorizontal: 12, marginTop: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(9,14,15,0.94)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 16 },
  logo: { width: 38, height: 38, borderRadius: 9, marginRight: 10 },
  brand: { color: colors.text, fontFamily: fonts.medium, fontSize: 16, letterSpacing: -.3 },
  brandSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.25, marginTop: 2 },
  headerAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heading: { marginBottom: 26 }, eyebrow: { color: colors.accent, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.8, marginBottom: 14 },
  title: { color: colors.text, fontFamily: fonts.light, fontSize: 35, letterSpacing: -1.1, lineHeight: 39 },
  subtitle: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, marginTop: 13 },
  card: { backgroundColor: 'rgba(9,14,15,0.92)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 12 },
  label: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.15 },
  value: { color: colors.text, fontFamily: fonts.mono, fontSize: 20, marginTop: 8 },
  note: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: 8 },
  state: { padding: 32, alignItems: 'center' }, retry: { color: colors.accent, marginTop: 16, fontFamily: fonts.medium },
  pill: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: 'rgba(165,243,252,0.10)', borderColor: 'rgba(165,243,252,0.35)' },
  pillText: { color: colors.secondary, fontFamily: fonts.medium, fontSize: 13 }, pillTextActive: { color: colors.accent },
  disclaimer: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, marginTop: 24 },
});
