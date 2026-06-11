import { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { saveStripToGallery, useSavePermission } from "../utils/saveStrip";

const { width } = Dimensions.get("window");

// Narrow strip — real photobooth proportions, fits on screen
const STRIP_WIDTH = Math.min(width * 0.48, 200);
const PHOTO_WIDTH = STRIP_WIDTH - 16;
const PHOTO_HEIGHT = Math.round(PHOTO_WIDTH * 0.75);

const STRIP_BG_COLORS = ["#ffffff", "#1a1a1a", "#FAF5EB", "#fce4ec", "#e8f5e9"];

export type FilterType = "none" | "bw" | "sepia" | "vintage";

const FILTERS: { id: FilterType; label: string; color: string }[] = [
  { id: "none",    label: "Original", color: "#E8325C" },
  { id: "bw",      label: "N&B",      color: "#555"    },
  { id: "sepia",   label: "Sépia",    color: "#b07c3f" },
  { id: "vintage", label: "Vintage",  color: "#9b6b4a" },
];

interface Props {
  photos: string[];
  onRetake: () => void;
  onHome: () => void;
}

const SAFE_TOP    = Platform.OS === "ios" ? 60 : 40;
const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 16;

export default function StripScreen({ photos, onRetake, onHome }: Props) {
  const [filter, setFilter]     = useState<FilterType>("none");
  const [bgIndex, setBgIndex]   = useState(0);
  const [saving, setSaving]     = useState(false);
  const [mediaPermission, requestMediaPermission] = useSavePermission();
  const stripRef = useRef<any>(null);

  const saveStrip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const uri: string = await stripRef.current.capture();
      await saveStripToGallery(uri, requestMediaPermission as any, mediaPermission as any);
      if (Platform.OS !== "web") {
        Alert.alert("Sauvegardé !", "Ton strip est dans ta galerie 📸");
      }
    } catch (e: any) {
      if (e?.message === "permission_denied") {
        Alert.alert("Permission requise", "Autorise l'accès à la galerie pour sauvegarder.");
      } else if (Platform.OS !== "web") {
        Alert.alert("Erreur", "Impossible de sauvegarder. Réessaie.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>

      {/* ── Zone du strip ── */}
      <View style={styles.stripZone}>
        {/* Header minimal */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onHome} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ton strip</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Strip scrollable si trop grand */}
        <ScrollView
          contentContainerStyle={styles.stripScroll}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <ViewShot
            ref={stripRef}
            options={{ format: "png", quality: 1.0 }}
            style={{ borderRadius: 10, overflow: "hidden" }}
          >
            <View style={[styles.strip, { backgroundColor: STRIP_BG_COLORS[bgIndex] }]}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image
                    source={{ uri }}
                    style={[styles.photo, getImageFilterStyle(filter)]}
                    resizeMode="cover"
                  />
                </View>
              ))}
              <View style={styles.dateLine}>
                <Text style={[styles.dateText, { color: bgIndex === 1 ? "#888" : "#aaa" }]}>
                  {formatDate(new Date())}
                </Text>
                <Text style={styles.brandText}>PocketBooth</Text>
              </View>
            </View>
          </ViewShot>
        </ScrollView>
      </View>

      {/* ── Panneau de contrôles fixé en bas ── */}
      <View style={styles.panel}>

        {/* Filtres */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Filtre</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                activeOpacity={0.8}
                style={[
                  styles.filterPill,
                  { borderColor: f.color },
                  filter === f.id && { backgroundColor: f.color },
                ]}
              >
                <Text style={[styles.filterPillText, filter === f.id && { color: "#fff" }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fond */}
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Fond</Text>
          <View style={styles.bgRow}>
            {STRIP_BG_COLORS.map((color, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setBgIndex(i)}
                activeOpacity={0.8}
                style={[
                  styles.bgSwatch,
                  { backgroundColor: color },
                  bgIndex === i && styles.bgSwatchActive,
                ]}
              >
                {bgIndex === i && <Text style={[styles.bgCheck, { color: i === 1 ? "#fff" : "#333" }]}>✓</Text>}
              </TouchableOpacity>
            ))}
            {/* Labels sous les swatches */}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bouton principal */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveStrip}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Sauvegarde…" : Platform.OS === "web" ? "Télécharger ↓" : "Sauvegarder dans la galerie 📷"}
          </Text>
        </TouchableOpacity>

        {/* Actions secondaires */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onRetake} activeOpacity={0.8}>
            <Text style={styles.secondaryText}>🔄 Reprendre</Text>
          </TouchableOpacity>
          <View style={styles.sep} />
          <TouchableOpacity style={styles.secondaryBtn} onPress={onHome} activeOpacity={0.8}>
            <Text style={styles.secondaryText}>🏠 Accueil</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SAFE_BOTTOM }} />
      </View>
    </View>
  );
}

function getImageFilterStyle(filter: FilterType) {
  if (filter === "none") return {};

  if (Platform.OS === "web") {
    switch (filter) {
      case "bw":      return { filter: "grayscale(1)" } as any;
      case "sepia":   return { filter: "sepia(0.9)" } as any;
      case "vintage": return { filter: "sepia(0.4) contrast(1.1) brightness(0.92) saturate(0.75)" } as any;
      default:        return {};
    }
  }

  switch (filter) {
    case "bw":      return { filter: [{ grayscale: 1 }] } as any;
    case "sepia":   return { filter: [{ sepia: 0.9 }] } as any;
    case "vintage": return { filter: [{ sepia: 0.4 }, { contrast: 1.1 }, { brightness: 0.92 }, { saturate: 0.75 }] } as any;
    default:        return {};
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },

  // ─── Zone strip ───
  stripZone: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SAFE_TOP,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  stripScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  strip: {
    width: STRIP_WIDTH,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
  },
  photoWrap: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#ddd",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  dateLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 2,
    marginTop: 2,
  },
  dateText: { fontSize: 9, letterSpacing: 0.2 },
  brandText: { fontSize: 9, fontWeight: "800", color: "#E8325C", letterSpacing: 0.3 },

  // ─── Panneau bas ───
  panel: {
    backgroundColor: "#FAF5EB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: { boxShadow: "0px -4px 16px rgba(0,0,0,0.12)" },
    }),
  },

  controlRow: {
    gap: 10,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Filtres pills
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: "center",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },

  // BG swatches
  bgRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  bgSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bgSwatchActive: {
    borderColor: "#E8325C",
    borderWidth: 2.5,
  },
  bgCheck: { fontSize: 16, fontWeight: "800" },

  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginVertical: -4,
  },

  // Save button
  saveBtn: {
    backgroundColor: "#E8325C",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#E8325C",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: { boxShadow: "0px 6px 20px rgba(232,50,92,0.35)" },
    }),
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Secondaires
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  sep: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
});
