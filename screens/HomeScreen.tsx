import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface Props {
  onStart: () => void;
}

// 4 polaroid frames: each has a rotation, slight offset, and a tint color
const FRAMES = [
  { rotate: "-12deg", tx: -60, ty: 10, bg: "#F5C842" },
  { rotate: "-4deg", tx: -20, ty: -12, bg: "#fce4ec" },
  { rotate: "5deg", tx: 22, ty: 6, bg: "#e8f5e9" },
  { rotate: "14deg", tx: 62, ty: 16, bg: "#fce4ec" },
];

export default function HomeScreen({ onStart }: Props) {
  return (
    <View style={styles.container}>
      {/* Pink blob accent in the background */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      {/* Scattered polaroid frames */}
      <View style={styles.framesArea}>
        {FRAMES.map((f, i) => (
          <View
            key={i}
            style={[
              styles.frame,
              {
                backgroundColor: f.bg,
                transform: [
                  { translateX: f.tx },
                  { translateY: f.ty },
                  { rotate: f.rotate },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Logo */}
      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/Designer.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Tagline */}
      <Text style={styles.tagline}>4 shots. 1 strip.{"\n"}pure fun.</Text>

      {/* CTA */}
      <TouchableOpacity
        style={styles.button}
        onPress={onStart}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Start →</Text>
      </TouchableOpacity>

      {/* Small hint */}
      <Text style={styles.hint}>front camera · 3 sec timer · filters</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5EB",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 48,
    gap: 20,
    overflow: "hidden",
  },

  // Decorative blobs
  blobTop: {
    position: "absolute",
    top: -width * 0.35,
    right: -width * 0.25,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: "#E8325C",
    opacity: 0.08,
  },
  blobBottom: {
    position: "absolute",
    bottom: -width * 0.3,
    left: -width * 0.2,
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    backgroundColor: "#F5C842",
    opacity: 0.25,
  },

  // Polaroid frames cluster
  framesArea: {
    width: 220,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  frame: {
    position: "absolute",
    width: 80,
    height: 96,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#fff",
    // subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {
        boxShadow: "0px 3px 8px rgba(0,0,0,0.12)",
      },
    }),
  },

  // Logo
  logoWrap: {
    alignItems: "center",
  },
  logo: {
    width: Math.min(width * 0.55, 220),
    height: Math.min(width * 0.55, 220),
    borderRadius: "20px",
  },

  // Text
  tagline: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2a2a2a",
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: 0.2,
    marginTop: -8,
  },

  // Button
  button: {
    backgroundColor: "#E8325C",
    paddingHorizontal: 52,
    paddingVertical: 18,
    borderRadius: 50,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#E8325C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {
        boxShadow: "0px 8px 24px rgba(232,50,92,0.38)",
      },
    }),
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  hint: {
    fontSize: 12,
    color: "#bbb",
    letterSpacing: 0.4,
    marginTop: -8,
  },
});
