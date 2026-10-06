import { Tabs } from 'expo-router';
import { Bell, CircleGauge, Layers3 } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: '#090E0F', borderTopColor: colors.border, height: 66, paddingTop: 7 },
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, paddingBottom: 4 } }}>
    <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <CircleGauge color={color} size={size - 2} strokeWidth={1.6} /> }} />
    <Tabs.Screen name="markets" options={{ title: 'Markets', tabBarIcon: ({ color, size }) => <Layers3 color={color} size={size - 2} strokeWidth={1.6} /> }} />
    <Tabs.Screen name="inbox" options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <Bell color={color} size={size - 2} strokeWidth={1.6} /> }} />
  </Tabs>;
}
