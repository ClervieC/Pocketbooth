import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const TOTAL_PHOTOS = 4;
const COUNTDOWN_SECONDS = 3;
const BETWEEN_DELAY_MS = 1400;

const BETWEEN_MESSAGES = ['Super ! 🎉', 'Trop bien ! ✨', 'Encore une !', 'Magnifique ! 😄'];

interface Props {
  onDone: (uris: string[]) => void;
  onCancel: () => void;
}

type Phase = 'idle' | 'countdown' | 'flash' | 'between' | 'done';

export default function CameraScreen({ onDone, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [photosTaken, setPhotosTaken] = useState(0);
  const photosRef = useRef<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const pulseCountdown = () => {
    countdownScale.setValue(1.4);
    Animated.spring(countdownScale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const triggerFlash = () => {
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  };

  const shoot = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    triggerFlash();
    if (result) photosRef.current = [...photosRef.current, result.uri];
  };

  const startSequence = async () => {
    photosRef.current = [];
    setPhotosTaken(0);

    for (let i = 0; i < TOTAL_PHOTOS; i++) {
      setPhase('countdown');
      for (let c = COUNTDOWN_SECONDS; c >= 1; c--) {
        setCountdown(c);
        pulseCountdown();
        await delay(1000);
      }

      setPhase('flash');
      await shoot();
      setPhotosTaken(i + 1);

      if (i < TOTAL_PHOTOS - 1) {
        setPhase('between');
        await delay(BETWEEN_DELAY_MS);
      }
    }

    setPhase('done');
    onDone(photosRef.current);
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permEmoji}>📷</Text>
        <Text style={styles.permText}>On a besoin de la caméra{'\n'}pour prendre tes photos !</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use back camera on native, front on web (webcam faces the user)
  const facing = Platform.OS === 'web' ? 'front' : 'back';

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Flash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flashOpacity, zIndex: 20 }]} />

      {/* Top bar: cancel on left */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={phase !== 'idle'}
          style={[styles.cancelBtn, phase !== 'idle' && { opacity: 0.3 }]}
        >
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Dots — centered absolutely at the top */}
      <View style={styles.dotsRow} pointerEvents="none">
        {Array.from({ length: TOTAL_PHOTOS }).map((_, i) => (
          <View key={i} style={[styles.dot, i < photosTaken && styles.dotFilled]}>
            {i < photosTaken
              ? <Text style={styles.dotCheck}>✓</Text>
              : <Text style={styles.dotNum}>{i + 1}</Text>
            }
          </View>
        ))}
      </View>

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.countdownWrap}>
            <Text style={styles.smileText}>
              {photosTaken === 0 ? 'Souriez ! 😄' : `Photo ${photosTaken + 1} sur ${TOTAL_PHOTOS}`}
            </Text>
            <Animated.Text
              style={[styles.countdownText, { transform: [{ scale: countdownScale }] }]}
            >
              {countdown}
            </Animated.Text>
          </View>
        </View>
      )}

      {/* Between-shot message */}
      {phase === 'between' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.countdownWrap}>
            <Text style={styles.betweenBadge}>{photosTaken} / {TOTAL_PHOTOS}</Text>
            <Text style={styles.betweenMsg}>{BETWEEN_MESSAGES[photosTaken - 1]}</Text>
          </View>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {phase === 'idle' ? (
          <>
            <Text style={styles.hint}>4 photos · 3 sec entre chaque</Text>
            <TouchableOpacity style={styles.shootBtn} onPress={startSequence} activeOpacity={0.85}>
              <View style={styles.shootRing}>
                <View style={styles.shootInner} />
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.shootBtn} />
        )}
      </View>
    </View>
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const SAFE_TOP = Platform.OS === 'ios' ? 60 : 40;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 48 : 32;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: '#FAF5EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 32,
  },


  // Top bar
  topBar: {
    paddingTop: SAFE_TOP,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Dots (absolutely centered at the top)
  dotsRow: {
    position: 'absolute',
    top: SAFE_TOP + 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  dotNum: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  dotCheck: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Countdown
  countdownWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  smileText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
    ...Platform.select({
      web: { textShadow: '0px 2px 8px rgba(0,0,0,0.5)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  countdownText: {
    fontSize: 140,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 150,
    ...Platform.select({
      web: { textShadow: '0px 4px 24px rgba(0,0,0,0.4)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 24,
      },
    }),
  },

  // Between shots
  betweenBadge: {
    backgroundColor: '#F5C842',
    color: '#2a2a2a',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 50,
    overflow: 'hidden',
  },
  betweenMsg: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
    ...Platform.select({
      web: { textShadow: '0px 2px 12px rgba(0,0,0,0.5)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
      },
    }),
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: SAFE_BOTTOM,
    paddingTop: 16,
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  hint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  shootBtn: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shootRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shootInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#E8325C',
  },

  // Permission screen
  permEmoji: { fontSize: 64 },
  permText: {
    color: '#333',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  permButton: {
    backgroundColor: '#E8325C',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
  },
  permButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
