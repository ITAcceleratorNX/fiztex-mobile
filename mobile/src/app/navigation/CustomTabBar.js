import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import Icon from '@shared/components/Icon';
import { shadowLg } from '@shared/components/Screen';
import { CurrentLessonBar } from '@features/lesson/CurrentLessonBar';

/**
 * Figma floating nav — active tab = orange icon, no filled pill.
 *
 * <p>`currentLesson` добавляет над панелью полосу «Текущий урок» (Figma
 * `Current Lesson Banner`). Флагом, а не всегда: у хозяйственных ролей уроков нет вовсе,
 * и полоса там была бы обещанием несуществующего раздела.
 *
 * <p>Полоса лежит вне горизонтальных отступов панели — она во всю ширину, а плавающая
 * пилюля вкладок остаётся вписанной в свои 16 пикселей по краям, как в макете.
 */
export function CustomTabBar({ state, descriptors, navigation, currentLesson = false }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom + 8,
      }}
    >
      {currentLesson ? <CurrentLessonBar /> : null}
      <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
        <View
          style={[
            {
              flexDirection: 'row',
              backgroundColor: c.surface,
              borderRadius: 28,
              paddingVertical: 14,
              paddingHorizontal: 8,
              ...shadowLg,
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 8,
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const iconName = options.iconName || 'home';

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 28 }}
              >
                <Icon
                  name={iconName}
                  size={24}
                  color={focused ? c.green : c.ink3}
                  strokeWidth={focused ? 2.2 : 1.8}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
