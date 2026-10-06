import { useLocalSearchParams, router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Disclaimer, Heading, Label, Note, Page, Pill, State } from '@/components/ui';
import { formatDate, loadMonitor, MonitorResult } from '@/lib/api';
import { marketClasses } from '@/lib/markets';
import { colors, fonts } from '@/lib/theme';

export default function MarketClass() {
  const { assetClass } = useLocalSearchParams<{ assetClass: string }>();
  const name = marketClasses.find(item => item[0] === assetClass)?.[1] || assetClass || 'Market';
  const [result, setResult] = useState<MonitorResult | null>(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish'>('all');
  const load = useCallback(async () => {
    if (!assetClass) return;
    try { const data = await loadMonitor(assetClass); setResult(data); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Market data unavailable.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [assetClass]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const rows = useMemo(() => (result?.data || []).filter(row => `${row.symbol} ${row.name}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || row.trend === filter)), [result, query, filter]);
  return <Page refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void load(); }} />}>
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>← All markets</Text></Pressable>
    <Heading eyebrow="Daily monitor · 1D" title={name} subtitle="Confirmed closed-candle trend context, with source coverage and freshness kept in view." />
    {loading ? <State loading /> : error ? <State error={error} retry={() => void load()} /> : result ? <>
      <Card><Label>MONITOR COVERAGE</Label><View style={styles.metrics}>
        <View style={{ flex: 1 }}><Text style={styles.metricValue}>{result.data.length}</Text><Note>Markets scanned</Note></View>
        <View style={{ flex: 1 }}><Text style={[styles.metricValue, (result.meta.failedMarkets || 0) > 0 && { color: colors.warning }]}>{result.meta.failedMarkets || 0}</Text><Note>Unavailable</Note></View>
      </View><View style={styles.rule} /><Note>{result.meta.providerLabel || result.meta.provider || 'Public provider'} · {formatDate(result.meta.capturedAt)}</Note>
        {result.meta.freshness ? <Note>{result.meta.freshness}</Note> : null}
        {(result.meta.failureReasons || []).slice(0, 2).map((reason, i) => <Note key={i}>Coverage gap: {reason}</Note>)}
      </Card>
      <View style={styles.search}><Search size={17} color={colors.muted} strokeWidth={1.5} /><TextInput accessibilityLabel="Search assets" placeholder="Search symbol or asset" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.input} /></View>
      <View style={styles.filters}>{(['all', 'bullish', 'bearish'] as const).map(value => <Pill key={value} label={value === 'all' ? 'All' : value === 'bullish' ? 'Bull trend' : 'Bear trend'} active={filter === value} onPress={() => setFilter(value)} />)}</View>
      <View style={styles.listHeading}><Label>ASSET REFERENCES</Label><Text style={styles.count}>{rows.length}</Text></View>
      {rows.length ? <Card><View style={{ marginVertical: -8 }}>{rows.map((row, index) => <Pressable key={row.symbol} accessibilityRole="button" onPress={() => router.push({ pathname: '/market/asset', params: { assetClass, symbol: row.symbol } })} style={[styles.row, index > 0 && styles.rowDivider]}>
        <View style={{ flex: 1 }}><Text style={styles.symbol}>{row.symbol}</Text><Text style={styles.name} numberOfLines={1}>{row.name}</Text><Text style={styles.flip}>Last flip · {formatDate(row.lastFlipAt)}</Text></View>
        <View style={styles.rowRight}><Text style={styles.price}>{row.displayValue || (Number.isFinite(row.price) ? row.price.toLocaleString() : '—')}</Text>
          <Text style={[styles.trend, { color: row.trend === 'bullish' ? colors.bull : row.trend === 'bearish' ? colors.bear : colors.muted }]}>{row.trend || 'No signal'}</Text></View>
        <ChevronRight size={16} color={colors.muted} strokeWidth={1.3} />
      </Pressable>)}</View></Card> : <State empty="No assets match these filters, or this provider has no usable rows." />}
    </> : null}<Disclaimer />
  </Page>;
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: fonts.medium, fontSize: 12, marginBottom: 24 },
  metrics: { flexDirection: 'row', marginTop: 13 }, metricValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 22 },
  rule: { height: 1, backgroundColor: colors.border, marginTop: 17, marginBottom: 8 },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginTop: 12, marginBottom: 13 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 14, marginLeft: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }, listHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  count: { color: colors.accent, fontFamily: fonts.mono, fontSize: 11 },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 9 }, rowDivider: { borderTopColor: colors.border, borderTopWidth: 1 },
  symbol: { color: colors.text, fontFamily: fonts.mono, fontSize: 14 }, name: { color: colors.secondary, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
  flip: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 5 }, rowRight: { alignItems: 'flex-end' },
  price: { color: colors.text, fontFamily: fonts.mono, fontSize: 11 }, trend: { fontFamily: fonts.medium, fontSize: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: .4 },
});
