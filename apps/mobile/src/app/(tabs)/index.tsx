import { useAuth, useClerk } from '@clerk/expo';
import { router } from 'expo-router';
import { ArrowRight, Layers3 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, Disclaimer, Heading, Label, Note, Page, State, Value } from '@/components/ui';
import { formatDate, Portfolio, privateRequest } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

export default function Overview() {
  const { getToken } = useAuth(); const { signOut } = useClerk();
  const [items, setItems] = useState<Portfolio[]>([]); const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const data = await privateRequest<Portfolio[]>('/v1/portfolios', getToken); setError(''); setItems(data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Portfolio unavailable.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [getToken]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const primary = items[0];
  return <Page refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(); }} />}>
    <Heading eyebrow="Overview" title={'Your financial picture,\nin one place.'} subtitle="Connect what you own with the market context and assumptions that shape the path ahead." />
    <Card><View style={styles.pulse}><View style={styles.dot} /><View style={{ flex: 1 }}><Label>WORKSPACE PULSE</Label>
      <Text style={styles.pulseTitle}>{loading ? 'Checking source data…' : error ? 'Finance service unavailable' : primary ? 'Source-aware context is ready.' : 'Add your own data to begin.'}</Text>
      <Note>{primary ? `${primary.dataFreshness.provider} · ${formatDate(primary.dataFreshness.capturedAt)}` : error || 'Your saved portfolio will appear here when available.'}</Note>
    </View></View></Card>
    <View style={styles.section}><Label>PORTFOLIO CONTEXT</Label><Text style={styles.sectionMeta}>{items.length ? `${items.length} SAVED` : 'OWNER-SCOPED'}</Text></View>
    {loading ? <State loading /> : error ? <State error={error} retry={() => void load()} /> : items.length === 0 ?
      <State empty="No portfolio is saved yet. Add your first holding in the web workspace, then pull down to refresh." /> :
      items.map(item => <Card key={item.id}><Text style={styles.portfolioName}>{item.name}</Text><Value>{item.summary.displayTotalValue} {item.baseCurrency}</Value>
        <View style={styles.metricRow}><View style={styles.metric}><Label>POSITIONS</Label><Text style={styles.metricValue}>{item.summary.holdingCount}</Text></View>
          <View style={styles.metric}><Label>CONCENTRATION</Label><Text style={styles.metricValue}>{item.summary.topConcentrationTicker ? `${(item.summary.topConcentrationBps / 100).toFixed(1)}%` : '—'}</Text></View></View>
        <Note>{item.summary.reviewFlags} review flags · {item.dataFreshness.freshness || 'Freshness unavailable'}</Note>
      </Card>)}
    <View style={styles.section}><Label>CORE WORKSPACE</Label></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/markets')} style={styles.destination}>
      <View style={styles.destinationIcon}><Layers3 size={18} color={colors.accent} strokeWidth={1.5} /></View>
      <View style={{ flex: 1 }}><Text style={styles.destinationTitle}>Scan supported markets</Text><Text style={styles.destinationDetail}>Confirmed trends, source coverage, and freshness</Text></View>
      <ArrowRight size={17} color={colors.muted} strokeWidth={1.4} />
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
    <Disclaimer />
  </Page>;
}

const styles = StyleSheet.create({
  pulse: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 4 },
  pulseTitle: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, marginTop: 10 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 23, marginBottom: 13 },
  sectionMeta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10 },
  portfolioName: { color: colors.secondary, fontFamily: fonts.medium, fontSize: 13 },
  metricRow: { flexDirection: 'row', marginTop: 23, paddingTop: 16, borderTopColor: 'rgba(255,255,255,0.07)', borderTopWidth: 1 },
  metric: { flex: 1 }, metricValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 18, marginTop: 8 },
  destination: { flexDirection: 'row', alignItems: 'center', minHeight: 79, backgroundColor: 'rgba(9,14,15,0.92)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 16, paddingHorizontal: 17, gap: 13 },
  destinationIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: 'rgba(165,243,252,0.07)', alignItems: 'center', justifyContent: 'center' },
  destinationTitle: { color: colors.text, fontFamily: fonts.medium, fontSize: 15 }, destinationDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
  signOut: { paddingVertical: 18, marginTop: 15 }, signOutText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
});
