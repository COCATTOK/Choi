import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Onboarding from '../screens/Onboarding';
import SheetHost from '../sheets/SheetHost';
import { StoreProvider, useStore } from '../store/Store';
import { ToastHost } from '../ui/shell';
import { C } from '../ui/theme';

function Root() {
  const { ready, S } = useStore();
  // 웹 미리보기: 가로로 밀 때 브라우저 ‘뒤로 가기’가 끼어들지 않게
  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.style.setProperty('overscroll-behavior-x', 'none');
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Slot />
      <SheetHost />
      {ready && !S.profile.onboarded ? <Onboarding /> : null}
      <ToastHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
