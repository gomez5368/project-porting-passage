import { Tabs } from 'expo-router';
import { Car, Fuel, History, LayoutDashboard } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Prehľad',
          tabBarIcon: ({ size, color }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="refuel"
        options={{
          title: 'Tankovanie',
          tabBarIcon: ({ size, color }) => <Fuel size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'História',
          tabBarIcon: ({ size, color }) => <History size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vozidlá',
          tabBarIcon: ({ size, color }) => <Car size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
