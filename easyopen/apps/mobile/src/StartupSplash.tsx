import {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Image, StyleSheet} from 'react-native';

export function StartupSplash() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    let reduceMotion = true;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      reduceMotion = enabled;
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) reduceMotion = enabled;
    }).catch(() => {});
    const timer = setTimeout(() => {
      if (reduceMotion) {
        setVisible(false);
        return;
      }
      Animated.timing(opacity, {toValue: 0, duration: 280, useNativeDriver: true})
        .start(({finished}) => {
          if (mounted && finished) setVisible(false);
        });
    }, 650);
    return () => {
      mounted = false;
      clearTimeout(timer);
      motion.remove();
      opacity.stopAnimation();
    };
  }, [opacity]);

  if (!visible) return null;
  return (
    <Animated.View testID="startup-splash" pointerEvents="none" accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" style={[styles.overlay, {opacity}]}>
      <Image source={require('../assets/startup-split.png')} resizeMode="contain" style={styles.image}/>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {...StyleSheet.absoluteFill, backgroundColor: '#f5f1ff', zIndex: 100},
  image: {width: '100%', height: '100%'},
});
