import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Disclaimer, Heading, Label, Page } from '@/components/ui';
import { marketClasses } from '@/lib/markets';
import { colors, fonts } from '@/lib/theme';

export default function Markets() {
  const [query, setQuery] = useState('');
  const filtered = marketClasses.filter(item => `${item[1]} ${item[2]}`.toLowerCase().includes(query.toLowerCase()));
  return <Page>
    <Heading eyebrow="Market intelligence" title="Markets, in context." subtitle="One entry point for public market signals across every supported asset class." />
    <View style={styles.search}><Search size={17} color={colors.muted} strokeWidth={1.5} />
      <TextInput accessibilityLabel="Search market classes" placeholder="Search market classes" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.input} />
    </View>
    <View style={styles.meta}><Label>ASSET CLASS MONITORS</Label><Text style={styles.count}>{filtered.length} / {marketClasses.length}</Text></View>
    <Card><View style={styles.list}>
      {filtered.map(([id, label, description], index) => <Pressable key={id} accessibilityRole="button" onPress={() => router.push({ pathname: '/market/[assetClass]', params: { assetClass: id } })}
        style={[styles.row, index > 0 && styles.rowDivider]}>
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.rowDetail}>{description}</Text></View>
        <ChevronRight size={17} color={colors.muted} strokeWidth={1.4} />
      </Pressable>)}
      {filtered.length === 0 ? <Text style={styles.rowDetail}>No market classes match this search.</Text> : null}
    </View></Card>
    <Text style={styles.source}>PUBLIC DATA · DAILY REFERENCE · SOURCE AND FRESHNESS ON EACH MONITOR</Text>
    <Disclaimer />
  </Page>;
}

const styles = StyleSheet.create({
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(9,14,15,0.82)', borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 26 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 14, marginLeft: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: colors.accent, fontFamily: fonts.mono, fontSize: 11 },
  list: { marginVertical: -8 }, row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  rowTitle: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  rowDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 5 },
  source: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10, lineHeight: 16, letterSpacing: .2, marginTop: 9 },
});
