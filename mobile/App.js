import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { Onest_800ExtraBold } from '@expo-google-fonts/onest/800ExtraBold';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TamosAppStateProvider } from './src/state/AppState';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Inner() {
  const { dark, c } = useTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.bg,
      card: c.surface,
      text: c.ink,
      border: c.border,
      primary: c.green,
    },
  };
  return (
    <TamosAppStateProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </TamosAppStateProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Inner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
