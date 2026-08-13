import React, { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import Icon from '@shared/components/Icon';

const BORDER = '#E2E8F0';

/**
 * Рисунок к вопросу — схема, график, чертёж, без которого задание не решается.
 *
 * <p>Тап открывает рисунок на весь экран внутри приложения: уход из приложения во время
 * попытки античит фиксирует как нарушение, и «рассмотреть чертёж» не должно им становиться.
 */
export function QuestionFigure({ imageUrl }) {
  const [zoomed, setZoomed] = useState(false);

  if (!imageUrl) return null;

  return (
    <>
      <Pressable onPress={() => setZoomed(true)}>
        <View
          style={{
            marginTop: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: BORDER,
            backgroundColor: '#fff',
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: 200 }}
            resizeMode="contain"
          />
        </View>
      </Pressable>

      <Modal visible={zoomed} transparent onRequestClose={() => setZoomed(false)}>
        <Pressable
          onPress={() => setZoomed(false)}
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.92)', justifyContent: 'center' }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '80%' }}
            resizeMode="contain"
          />
          <View style={{ position: 'absolute', top: 48, right: 20 }}>
            <Icon name="x" size={26} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
