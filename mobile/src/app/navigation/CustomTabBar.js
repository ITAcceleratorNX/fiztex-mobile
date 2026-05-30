import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { shadowLg } from '@shared/components/Screen';

// Floating capsule tab bar — port of the web `BottomTabs` design.
export function CustomTabBar({ state, descriptors, navigation }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 8, paddingTop: 6 }}>
      <View
        style={[
          {
            flexDirection: 'row',
            backgroundColor: c.surface,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: c.border,
            paddingVertical: 8,
            paddingHorizontal: 6,
          },
          shadowLg,
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.tabLabel || route.name;
          const iconName = options.iconName || 'home';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: focused ? 14 : 8,
                  borderRadius: 999,
                  backgroundColor: focused ? c.green : 'transparent',
                }}
              >
                <Icon name={iconName} size={focused ? 20 : 22} color={focused ? '#fff' : c.ink3} strokeWidth={focused ? 2 : 1.8} />
                {focused ? <Txt style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{label}</Txt> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
