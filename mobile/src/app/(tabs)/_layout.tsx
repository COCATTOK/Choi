import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { TabBar } from '../../ui/shell';
import { C } from '../../ui/theme';

export default function TabsLayout() {
  // 오늘 화면을 보는 동안 성장·별자리를 미리 준비해서, 처음 누를 때도 바로 열리게.
  // iOS·Android만: 숨은 탭을 멈춰두는 freezeOnBlur가 있어야 기록할 때 느려지지 않습니다.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const t = setTimeout(() => {
      router.prefetch('/growth');
      router.prefetch('/sky');
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // freezeOnBlur: 보이지 않는 탭은 기록이 바뀌어도 다시 그리지 않음 (iOS·Android)
      screenOptions={{ headerShown: false, animation: 'shift', freezeOnBlur: true, sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sky" />
      <Tabs.Screen name="growth" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
