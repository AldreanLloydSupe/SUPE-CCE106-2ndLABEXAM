import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PortalHeader } from '@/components/Portal';
import { palette } from '@/constants/portal';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      header: () => <PortalHeader />,
      tabBarActiveTintColor: palette.green,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border, height: 68 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(8, insets.bottom) },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      sceneStyle: { backgroundColor: palette.background },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'My profile', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={size} /> }} />
    </Tabs>
  );
}
