import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, Disclaimer, Heading, Label, Note, Page, State, Value } from '@/components/ui';
import { formatDate, loadMonitor, MonitorRow } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

export default function AssetDetail() {
  const { assetClass, symbol } = useLocalSearchParams<{ assetClass: string; symbol: string }>();
  const [row, setRow] = useState<MonitorRow | null>(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!assetClass || !symbol) return;
    try { const result = await loadMonitor(assetClass); setRow(result.data.find(item => item.symbol === symbol) || null); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Signal unavailable.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [assetClass, symbol]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <Page refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(); }} />}>
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>← {assetClass}</Text></Pressable>
    <Heading eyebrow="Market signal · 1D" title={symbol || 'Asset'} subtitle={row?.name || 'Confirmed trend context'} />
    {loading ? <State loading /> : error ? <State error={error} retry={() => void load()} /> : !row ? <State empty="This asset is no longer in the provider's current sample." /> : <>
      <Card><Label>CURRENT TREND</Label><Text style={[styles.trend, { color: row.trend === 'bullish' ? colors.bull : row.trend === 'bearish' ? colors.bear : colors.muted }]}>{row.trend ? row.trend.toUpperCase() : 'UNAVAILABLE'}</Text>
        <Note>{row.trend ? 'Derived from the last confirmed closed candle.' : row.signalUnavailableReason || 'Insufficient signal history.'}</Note></Card>
      <Card><View style={styles.twoColumn}><View style={{ flex: 1 }}><Label>LAST CONFIRMED FLIP</Label><Text style={styles.datum}>{formatDate(row.lastFlipAt)}</Text></View>
        <View style={{ flex: 1 }}><Label>NEXT FLIP LEVEL</Label><Text style={styles.datum}>{typeof row.nextFlipLevel === 'number' ? row.nextFlipLevel.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'Unavailable'}</Text></View></View>
        <View style={styles.rule} /><Note>Signal basis: {row.signalBasis || 'Unavailable'} · Interval: {row.signalInterval || '1d'}</Note>
        <Note>The next level is a monitoring threshold, not a price forecast or trade instruction.</Note></Card>
      <Card><Label>SOURCE & FRESHNESS</Label><Value>{row.provider || 'Public provider'}</Value><Note>Captured {formatDate(row.capturedAt)}</Note>
        <Note>{row.historyComplete === false ? 'History is provider-bounded; signal confidence is limited.' : 'History coverage available where supported.'}</Note>
        {row.isProxy ? <Note>Proxy: {row.proxyNote || 'This listing represents a broader market exposure.'}</Note> : null}</Card>
    </>}<Disclaimer />
  </Page>;
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: fonts.medium, fontSize: 12, marginBottom: 24 },
  trend: { fontFamily: fonts.mono, fontSize: 27, marginTop: 17 },
  twoColumn: { flexDirection: 'row', gap: 12 }, datum: { color: colors.text, fontFamily: fonts.mono, fontSize: 14, lineHeight: 21, marginTop: 11 },
  rule: { height: 1, backgroundColor: colors.border, marginTop: 18, marginBottom: 5 },
});
