import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { ArrowRight, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, Disclaimer, Heading, Label, Note, Page, State } from '@/components/ui';
import { Digest, formatDate, privateRequest } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

export default function Inbox() {
  const { getToken } = useAuth(); const [items, setItems] = useState<Digest[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { const data = await privateRequest<Digest[]>('/v1/flip-digest/notifications', getToken); setItems(data); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Alerts unavailable.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [getToken]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <Page refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(); }} />}>
    <Heading eyebrow="Notifications" title="Confirmed flips." subtitle="Recent server-generated market summaries, with the source and coverage attached." />
    <Pressable accessibilityRole="button" onPress={() => router.push('/alerts/settings')} style={styles.settingsLink}>
      <SlidersHorizontal size={18} color={colors.accent} strokeWidth={1.5} /><Text style={styles.settingsText}>Delivery preferences</Text><ArrowRight size={17} color={colors.muted} strokeWidth={1.4} />
    </Pressable>
    <View style={styles.section}><Label>RECENT DIGESTS</Label><Text style={styles.count}>{items.length}</Text></View>
    {loading ? <State loading /> : error ? <State error={error} retry={() => void load()} /> : items.length === 0 ?
      <State empty="No confirmed flip digests yet. Choose your direction and cadence in delivery preferences." /> :
      items.map(item => <Card key={item.id}><Label>{item.cadence.toUpperCase()} · {formatDate(item.periodEnd)}</Label><Text style={styles.digestTitle}>{item.entries.length} confirmed {item.direction === 'both' ? 'flips' : `${item.direction} flips`}</Text>
        {item.entries.map((entry, index) => <View key={`${entry.assetClass}-${entry.symbol}-${index}`} style={styles.entry}>
          <View style={styles.entryTop}><Text style={styles.symbol}>{entry.symbol}</Text><Text style={[styles.direction, { color: entry.direction === 'bull' ? colors.bull : colors.bear }]}>{entry.direction.toUpperCase()} FLIP</Text></View>
          <Text style={styles.entryName}>{entry.name} · {entry.assetClass}</Text><Note>{formatDate(entry.lastFlipAt)} · {entry.source}</Note>
          <Text style={styles.entryFoot}>CAPTURED {formatDate(entry.capturedAt).toUpperCase()} · {entry.signalBasis.toUpperCase()}</Text>
        </View>)}
        {item.coverage.failedClasses.length ? <Note>Coverage gaps: {item.coverage.failedClasses.join(', ')}</Note> : null}
      </Card>)}
    <Disclaimer />
  </Page>;
}

const styles = StyleSheet.create({
  settingsLink: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: 'rgba(165,243,252,0.045)', borderColor: 'rgba(165,243,252,0.14)', borderWidth: 1, borderRadius: 13 },
  settingsText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  section: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 27, marginBottom: 13 }, count: { color: colors.accent, fontFamily: fonts.mono, fontSize: 11 },
  digestTitle: { color: colors.text, fontFamily: fonts.light, fontSize: 23, marginTop: 12 },
  entry: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 17, paddingTop: 14 },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between' }, symbol: { color: colors.text, fontFamily: fonts.mono, fontSize: 15 },
  direction: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1 }, entryName: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 12, marginTop: 6 },
  entryFoot: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9, lineHeight: 15, marginTop: 9 },
});
