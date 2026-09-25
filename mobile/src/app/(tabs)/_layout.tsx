import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../ui/shell';
import { C } from '../../ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sky" />
      <Tabs.Screen name="growth" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
