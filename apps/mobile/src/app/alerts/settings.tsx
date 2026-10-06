import { useAuth, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, Disclaimer, Heading, Label, Note, Page, Pill, State } from '@/components/ui';
import { Preferences, privateRequest } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

export default function AlertSettings() {
  const { getToken } = useAuth(); const { user } = useUser();
  const [value, setValue] = useState<Preferences | null>(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [success, setSuccess] = useState(false);
  const load = useCallback(async () => {
    try { const data = await privateRequest<Preferences>('/v1/flip-digest/preferences', getToken); setValue(data); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Preferences unavailable.'); }
    finally { setLoading(false); }
  }, [getToken]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const verifiedEmail = user?.primaryEmailAddress?.verification?.status === 'verified';
  const change = (patch: Partial<Preferences>) => { if (value) { setSuccess(false); setValue({ ...value, ...patch }); } };
  const save = async () => {
    if (!value) return;
    if (value.enabled && !value.emailEnabled && !value.inAppEnabled) { setError('Choose at least one delivery channel.'); return; }
    if (value.enabled && value.emailEnabled && !verifiedEmail) { setError('Verify your primary Clerk email before enabling email alerts.'); return; }
    setSaving(true); setError(''); setSuccess(false);
    try { setValue(await privateRequest<Preferences>('/v1/flip-digest/preferences', getToken, { method: 'PUT', body: JSON.stringify(value) })); setSuccess(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save preferences.'); }
    finally { setSaving(false); }
  };
  return <Page><Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>← Your alerts</Text></Pressable>
    <Heading eyebrow="Delivery preferences" title="Flip summaries." subtitle="Choose which confirmed changes make it into your research rhythm." />
    {loading ? <State loading /> : !value ? <State error={error} retry={() => void load()} /> : <>
      <Card><View style={styles.switchRow}><View style={{ flex: 1 }}><Label>ENABLE SUMMARIES</Label><Note>Start or pause scheduled digests.</Note></View><Switch value={value.enabled} onValueChange={enabled => change({ enabled })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} /></View></Card>
      <Card><Label>FLIP DIRECTION</Label><Text style={styles.helper}>Bull flips are selected by default.</Text>
        <View style={styles.options}>{(['bull', 'bear', 'both'] as const).map(direction => <Pill key={direction} label={direction === 'both' ? 'Both' : direction === 'bull' ? 'Bull flips' : 'Bear flips'} active={value.direction === direction} onPress={() => change({ direction })} />)}</View>
        <View style={styles.divider} /><Label>CADENCE</Label><View style={styles.options}>{(['daily', 'weekly'] as const).map(cadence => <Pill key={cadence} label={cadence === 'daily' ? 'Daily' : 'Weekly'} active={value.cadence === cadence} onPress={() => change({ cadence })} />)}</View>
      </Card>
      <Card><Label>DELIVERY CHANNELS</Label><View style={[styles.switchRow, { marginTop: 15 }]}><Text style={styles.channel}>In-app inbox</Text><Switch value={value.inAppEnabled} onValueChange={inAppEnabled => change({ inAppEnabled })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} /></View>
        <View style={styles.divider} /><View style={styles.switchRow}><Text style={styles.channel}>Email</Text><Switch value={value.emailEnabled} onValueChange={emailEnabled => change({ emailEnabled })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} /></View>
        <Note>{verifiedEmail ? `Verified address: ${user?.primaryEmailAddress?.emailAddress}` : 'Verify your primary email in your account before enabling email delivery.'}</Note></Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}{success ? <Text style={styles.success}>Preferences saved.</Text> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={styles.save}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save preferences'}</Text></Pressable>
    </>}<Disclaimer />
  </Page>;
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: fonts.medium, fontSize: 12, marginBottom: 24 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  helper: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 12, marginTop: 9 },
  options: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  channel: { color: colors.text, fontFamily: fonts.regular, fontSize: 14 },
  error: { color: colors.bear, fontFamily: fonts.regular, marginBottom: 12 }, success: { color: colors.bull, fontFamily: fonts.regular, marginBottom: 12 },
  save: { minHeight: 52, backgroundColor: colors.text, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.background, fontFamily: fonts.medium, fontSize: 15 },
});
