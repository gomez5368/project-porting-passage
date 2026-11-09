import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { CarDataProvider } from '@/context/CarDataContext';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <CarDataProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </CarDataProvider>
  );
}
