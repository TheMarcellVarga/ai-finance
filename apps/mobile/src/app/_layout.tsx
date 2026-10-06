import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, ThemeProvider, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function Brand() {
  return <View style={styles.brandRow}>
    <Image source={require('../../assets/images/aperture-icon.png')} style={styles.brandIcon} />
    <View><Text style={styles.brandName}>Aperture</Text><Text style={styles.brandDetail}>FINANCIAL INTELLIGENCE</Text></View>
  </View>;
}

function AccessGate() {
  const { width, height } = useWindowDimensions();
  const { isLoaded, isSignedIn } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isLoaded) return <Center><ActivityIndicator color={colors.accent} /></Center>;
  if (isSignedIn) return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
  const openAuth = async (mode: 'sign-in' | 'sign-up') => {
    setBusy(true); setMessage('');
    try { await startHostedAuth({ mode }); }
    catch { setMessage('Sign-in could not be completed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.signIn} edges={['top', 'bottom']}>
    <Image source={require('../../assets/images/aperture-study.png')} resizeMode="cover" style={[styles.heroImage, { width, height: height * .67 }]} />
    <LinearGradient colors={['rgba(9,14,15,0.15)', 'rgba(9,14,15,0.55)', colors.background, colors.background]} locations={[0, .39, .68, 1]} style={StyleSheet.absoluteFill} />
    <Brand />
    <View style={styles.intro}>
      <Text style={styles.kicker}>PRIVATE WEALTH INTELLIGENCE</Text>
      <Text style={styles.title}>Complexity,{`\n`}made quiet.</Text>
      <Text style={styles.body}>Portfolios, market signals, and goals in one source-aware research workspace.</Text>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => void openAuth('sign-in')}>
        <Text style={styles.buttonText}>{busy ? 'Opening account…' : 'Open workspace'}</Text><Text style={styles.buttonArrow}>↗</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void openAuth('sign-up')} style={styles.create}><Text style={styles.createText}>New to Aperture? Create an account</Text></Pressable>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Text style={styles.foot}>Research support only. Not financial advice.</Text>
    </View>
  </SafeAreaView>;
}

function Center({ children }: { children: React.ReactNode }) { return <View style={styles.center}>{children}</View>; }

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    OutfitLight: Outfit_300Light, OutfitRegular: Outfit_400Regular, OutfitMedium: Outfit_500Medium,
    OutfitSemiBold: Outfit_600SemiBold, GeistMono: GeistMono_400Regular,
  });
  if (!loaded && !fontError) return <Center><ActivityIndicator color={colors.accent} /></Center>;
  return <SafeAreaProvider><ThemeProvider value={DarkTheme}><StatusBar style="light" />
    {publishableKey ? <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}><AccessGate /></ClerkProvider> :
      <Center><Brand /><Text style={styles.title}>Aperture mobile</Text><Text style={styles.body}>Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to connect this app to your Clerk account.</Text></Center>}
  </ThemeProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 32 },
  signIn: { flex: 1, backgroundColor: colors.background }, heroImage: { position: 'absolute', top: 0, left: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 20 },
  brandIcon: { width: 42, height: 42, borderRadius: 10, marginRight: 11 },
  brandName: { color: colors.text, fontFamily: fonts.medium, fontSize: 17, lineHeight: 19 },
  brandDetail: { color: '#B4B8BA', fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.25, marginTop: 4 },
  intro: { marginTop: 'auto', paddingHorizontal: 28, paddingBottom: 24 },
  kicker: { color: colors.accent, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 2.1, marginBottom: 22 },
  title: { color: colors.text, fontFamily: fonts.light, fontSize: 48, lineHeight: 49, letterSpacing: -1.8, marginBottom: 20 },
  body: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 24, maxWidth: 370, marginBottom: 32 },
  button: { minHeight: 54, backgroundColor: colors.text, borderRadius: 13, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonText: { color: colors.background, fontFamily: fonts.medium, fontSize: 15 }, buttonArrow: { color: colors.background, fontSize: 19 },
  create: { alignItems: 'center', minHeight: 52, justifyContent: 'center' }, createText: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 13 },
  error: { color: colors.bear, fontFamily: fonts.regular, marginTop: 12 },
  foot: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 18, textAlign: 'center' },
});
