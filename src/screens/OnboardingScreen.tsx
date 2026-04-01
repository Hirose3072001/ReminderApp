import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../theme';
import { Button } from '../components/ui/Button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideData {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradientColors: [string, string];
}

const slides: SlideData[] = [
  {
    id: '1',
    emoji: '✨',
    title: 'Nhắc việc thông minh',
    subtitle: 'Đặt nhắc lịch linh hoạt — một lần, hàng ngày, hàng tuần hay hàng tháng. Không bao giờ bỏ lỡ điều quan trọng.',
    gradientColors: [Colors.primary, Colors.primaryContainer],
  },
  {
    id: '2',
    emoji: '🎯',
    title: 'Ưu tiên rõ ràng',
    subtitle: 'Phân loại công việc theo mức độ ưu tiên. Tập trung vào điều quan trọng nhất mỗi ngày.',
    gradientColors: [Colors.tertiary, Colors.tertiaryContainer],
  },
  {
    id: '3',
    emoji: '🚀',
    title: 'Bắt đầu nào!',
    subtitle: 'Mọi thứ đã sẵn sàng. Tạo task đầu tiên ngay hôm nay và trải nghiệm sự khác biệt.',
    gradientColors: [Colors.secondary, '#1a73e8'],
  },
];

import { useAuthStore } from '../store/useAuthStore';

// ... (slides remains unchanged)

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { setFirstTime } = useAuthStore();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(prev => prev + 1);
    } else {
      setFirstTime(false);
    }
  };

  const handleSkip = () => setFirstTime(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      )}

      <Animated.FlatList
        ref={flatListRef as any}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
        }}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient
              colors={item.gradientColors}
              style={styles.emojiContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
            </LinearGradient>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => {
            const width = scrollX.interpolate({
              inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return <Animated.View key={i} style={[styles.dot, { width, opacity }]} />;
          })}
        </View>
        <Button
          label={currentIndex === slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'}
          onPress={handleNext}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  skipBtn: {
    position: 'absolute', top: 56, right: Spacing[4], zIndex: 10,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
  },
  skipText: {
    fontFamily: FontFamily.interMedium, fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  slide: {
    width: SCREEN_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  emojiContainer: {
    width: 120, height: 120, borderRadius: Radius.xxl,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[10],
  },
  emoji: { fontSize: 56 },
  slideTitle: {
    fontFamily: FontFamily.manropeExtraBold, fontSize: FontSize.headlineSm,
    color: Colors.onSurface, textAlign: 'center',
    letterSpacing: -0.02 * FontSize.headlineSm, marginBottom: Spacing[4],
  },
  slideSubtitle: {
    fontFamily: FontFamily.interRegular, fontSize: FontSize.bodyLg,
    color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 26,
  },
  footer: { paddingHorizontal: Spacing[6], paddingBottom: Spacing[6], gap: Spacing[6] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing[2] },
  dot: { height: 8, borderRadius: Radius.full, backgroundColor: Colors.primary },
});
