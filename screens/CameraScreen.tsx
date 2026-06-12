import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path as SvgPath } from "react-native-svg";

const { width } = Dimensions.get("window");

const COUNTDOWN_SECONDS = 3;
const BETWEEN_DELAY_MS = 3000;

const BETWEEN_MESSAGES = [
  "Great! 🎉",
  "Nice! ✨",
  "One more!",
  "Love it! 😄",
];

interface Props {
  onDone: (uris: string[]) => void;
  onCancel: () => void;
  totalPhotos: number;
}

type Phase = "idle" | "countdown" | "flash" | "between" | "done";

function FlipCameraIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top arc: left → right through the top */}
      <SvgPath
        d="M 4.5 12 A 7.5 7.5 0 0 1 19.5 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead at right end, pointing down */}
      <SvgPath
        d="M 17.5 9.5 L 19.5 12 L 22 9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bottom arc: right → left through the bottom */}
      <SvgPath
        d="M 19.5 12 A 7.5 7.5 0 0 1 4.5 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead at left end, pointing up */}
      <SvgPath
        d="M 2 14.5 L 4.5 12 L 6.5 14.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function CameraScreen({ onDone, onCancel, totalPhotos }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const photosRef = useRef<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(1)).current;
  const betweenProgress = useRef(new Animated.Value(1)).current;

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

  const [facing, setFacing] = useState<"front" | "back">("front");

  const shoot = async () => {
    if (!cameraRef.current) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const result = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    triggerFlash();
    if (result) {
      photosRef.current = [...photosRef.current, result.uri];
      setLastPhotoUri(result.uri);
    }
  };

  const startSequence = async () => {
    photosRef.current = [];
    setPhotosTaken(0);

    for (let i = 0; i < totalPhotos; i++) {
      setPhase("countdown");
      for (let c = COUNTDOWN_SECONDS; c >= 1; c--) {
        setCountdown(c);
        pulseCountdown();
        await delay(1000);
      }

      setPhase("flash");
      await shoot();
      setPhotosTaken(i + 1);

      if (i < totalPhotos - 1) {
        betweenProgress.setValue(1);
        Animated.timing(betweenProgress, {
          toValue: 0,
          duration: BETWEEN_DELAY_MS,
          useNativeDriver: false,
        }).start();
        setPhase("between");
        await delay(BETWEEN_DELAY_MS);
      }
    }

    setPhase("done");
    onDone(photosRef.current);
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permEmoji}>📷</Text>
        <Text style={styles.permText}>
          Camera access is needed{"\n"}to take your photos!
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Allow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Flash */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#fff", opacity: flashOpacity, zIndex: 20 },
        ]}
      />

      {/* Top bar: cancel on left */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={phase !== "idle"}
          style={[styles.cancelBtn, phase !== "idle" && { opacity: 0.3 }]}
        >
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Dots — centered absolutely at the top */}
      <View style={styles.dotsRow} pointerEvents="none">
        {Array.from({ length: totalPhotos }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < photosTaken && styles.dotFilled]}
          >
            {i < photosTaken ? (
              <Text style={styles.dotCheck}>✓</Text>
            ) : (
              <Text style={styles.dotNum}>{i + 1}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.countdownWrap}>
            <Text style={styles.smileText}>
              {photosTaken === 0
                ? "Smile! 😄"
                : `Photo ${photosTaken + 1} of ${totalPhotos}`}
            </Text>
            <Animated.Text
              style={[
                styles.countdownText,
                { transform: [{ scale: countdownScale }] },
              ]}
            >
              {countdown}
            </Animated.Text>
          </View>
        </View>
      )}

      {/* Between-shot message */}
      {phase === "between" && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.countdownWrap}>
            {lastPhotoUri && (
              <Image
                source={{ uri: lastPhotoUri }}
                style={styles.betweenPreview}
                resizeMode="cover"
              />
            )}
            <Text style={styles.betweenBadge}>
              {photosTaken} / {totalPhotos}
            </Text>
            <Text style={styles.betweenMsg}>
              {BETWEEN_MESSAGES[photosTaken - 1]}
            </Text>
            <TouchableOpacity
              style={styles.betweenFlipBtn}
              onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
              activeOpacity={0.8}
            >
              <FlipCameraIcon size={18} />
              <Text style={styles.betweenFlipText}>Flip camera</Text>
            </TouchableOpacity>
            <View style={styles.timerTrack}>
              <Animated.View
                style={[
                  styles.timerFill,
                  {
                    width: betweenProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {phase === "idle" ? (
          <>
            <Text style={styles.hint}>{totalPhotos} photos · 3 sec apart</Text>
            <View style={styles.shootRow}>
              <View style={{ width: 44 }} />
              <TouchableOpacity
                style={styles.shootBtn}
                onPress={startSequence}
                activeOpacity={0.85}
              >
                <View style={styles.shootRing}>
                  <View style={styles.shootInner} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.flipBtn}
                onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
                activeOpacity={0.8}
              >
                <FlipCameraIcon size={20} />
              </TouchableOpacity>
            </View>
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

const SAFE_TOP = Platform.OS === "ios" ? 60 : 40;
const SAFE_BOTTOM = Platform.OS === "ios" ? 48 : 32;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    backgroundColor: "#FAF5EB",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 32,
  },

  // Top bar
  topBar: {
    paddingTop: SAFE_TOP,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Dots (absolutely centered at the top)
  dotsRow: {
    position: "absolute",
    top: SAFE_TOP + 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotFilled: {
    backgroundColor: "#F5C842",
    borderColor: "#F5C842",
  },
  dotNum: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "700" },
  dotCheck: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Countdown
  countdownWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  smileText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
    ...Platform.select({
      web: { textShadow: "0px 2px 8px rgba(0,0,0,0.5)" },
      default: {
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  countdownText: {
    fontSize: 140,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 150,
    ...Platform.select({
      web: { textShadow: "0px 4px 24px rgba(0,0,0,0.4)" },
      default: {
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 24,
      },
    }),
  },

  // Between shots
  betweenBadge: {
    backgroundColor: "#F5C842",
    color: "#2a2a2a",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 50,
    overflow: "hidden",
  },
  betweenMsg: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.2,
    ...Platform.select({
      web: { textShadow: "0px 2px 12px rgba(0,0,0,0.5)" },
      default: {
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
      },
    }),
  },

  betweenFlipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  betweenFlipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  timerTrack: {
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    marginTop: 10,
  },
  timerFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  betweenPreview: {
    width: 90,
    height: 120,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 8,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: SAFE_BOTTOM,
    paddingTop: 16,
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  hint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  shootRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  shootBtn: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  shootRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shootInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#E8325C",
  },

  // Permission screen
  permEmoji: { fontSize: 64 },
  permText: {
    color: "#333",
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "500",
  },
  permButton: {
    backgroundColor: "#E8325C",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
  },
  permButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
