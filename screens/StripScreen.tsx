import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import Svg, { Path as SvgPath } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import { saveStripToGallery, useSavePermission } from "../utils/saveStrip";

const { width } = Dimensions.get("window");

const STRIP_WIDTH = Math.min(width * 0.48, 200);
const PHOTO_WIDTH = STRIP_WIDTH - 16;
const PHOTO_HEIGHT = Math.round(PHOTO_WIDTH * 0.75);

const STRIP_BG_COLORS = ["#ffffff", "#1a1a1a", "#FAF5EB", "#fce4ec", "#e8f5e9"];

export type FilterType = "none" | "bw" | "sepia" | "vintage";
type PanelTab = "filter" | "bg" | "sticker" | "draw";

const FILTERS: { id: FilterType; label: string; color: string }[] = [
  { id: "none", label: "Original", color: "#E8325C" },
  { id: "bw", label: "B&W", color: "#555" },
  { id: "sepia", label: "Sepia", color: "#b07c3f" },
  { id: "vintage", label: "Vintage", color: "#9b6b4a" },
];

const STICKER_EMOJIS = [
  // Hearts & love
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "💕",
  "🫶",
  // Faces
  "😍",
  "🥰",
  "😘",
  "🤩",
  "😎",
  "😜",
  "🥳",
  "😇",
  "🤪",
  "🫠",
  // Sparkles & sky
  "✨",
  "⭐",
  "🌟",
  "💫",
  "🌈",
  "🌙",
  "☀️",
  "⚡",
  "🌠",
  // Party
  "🎉",
  "🎊",
  "🎈",
  "🥂",
  "🎁",
  "🎀",
  // Nature & flowers
  "🌸",
  "🌺",
  "🌻",
  "🌷",
  "🌹",
  "🍀",
  "🦋",
  "🐝",
  // Fun & glam
  "🔥",
  "💎",
  "👑",
  "💅",
  "🕶️",
  "💯",
  "🫧",
  "🌊",
  "🦄",
];
const DRAW_COLORS = [
  "#E8325C",
  "#F5C842",
  "#ffffff",
  "#000000",
  "#4CAF50",
  "#2196F3",
  "#FF9800",
  "#E040FB",
];

interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

interface StickerItem {
  id: string;
  emoji: string;
  pos: Animated.ValueXY;
}

type Layer =
  | { type: "sticker"; data: StickerItem }
  | { type: "path"; data: DrawPath };

interface Props {
  photos: string[];
  onRetake: () => void;
  onHome: () => void;
}

const SAFE_TOP = Platform.OS === "ios" ? 60 : 40;
const SAFE_BOTTOM =
  Platform.OS === "ios" ? 34 : Platform.OS === "android" ? 16 : 0;

function buildPathD(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function StickerView({
  sticker,
  showRemove,
  onRemove,
  stripWidth,
  stripHeight,
  scaleRef,
}: {
  sticker: StickerItem;
  showRemove: boolean;
  onRemove: () => void;
  stripWidth: number;
  stripHeight: number;
  scaleRef: { current: number };
}) {
  const showRemoveRef = useRef(showRemove);
  showRemoveRef.current = showRemove;
  const stripWidthRef = useRef(stripWidth);
  stripWidthRef.current = stripWidth;
  const stripHeightRef = useRef(stripHeight);
  stripHeightRef.current = stripHeight;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => showRemoveRef.current,
      onMoveShouldSetPanResponder: () => showRemoveRef.current,
      onPanResponderGrant: () => {
        sticker.pos.setOffset({
          x: (sticker.pos.x as any)._value,
          y: (sticker.pos.y as any)._value,
        });
        sticker.pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        const s = scaleRef.current;
        sticker.pos.setValue({ x: g.dx / s, y: g.dy / s });
      },
      onPanResponderRelease: () => {
        sticker.pos.flattenOffset();
        const EMOJI_SIZE = 36;
        const rawX = (sticker.pos.x as any)._value;
        const rawY = (sticker.pos.y as any)._value;
        const clampedX = Math.max(
          0,
          Math.min(rawX, stripWidthRef.current - EMOJI_SIZE),
        );
        const clampedY = Math.max(
          0,
          Math.min(rawY, stripHeightRef.current - EMOJI_SIZE),
        );
        if (rawX !== clampedX || rawY !== clampedY) {
          sticker.pos.setValue({ x: clampedX, y: clampedY });
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.stickerWrap,
        { transform: sticker.pos.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
      {showRemove && (
        <TouchableOpacity
          style={styles.stickerX}
          onPress={onRemove}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <Text style={styles.stickerXText}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function StripScreen({ photos, onRetake, onHome }: Props) {
  const [filter, setFilter] = useState<FilterType>("none");
  const [bgIndex, setBgIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("filter");

  const [layers, setLayers] = useState<Layer[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawThick, setDrawThick] = useState(false);
  const [stripSize, setStripSize] = useState({ width: STRIP_WIDTH, height: 0 });

  const [showDate, setShowDate] = useState(true);

  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const stripScaleAnim = useRef(new Animated.Value(1)).current;

  const [mediaPermission, requestMediaPermission] = useSavePermission();
  const stripRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    if (stripSize.height === 0 || scrollAreaHeight === 0) return;
    const byHeight = (scrollAreaHeight - 32) / stripSize.height;
    const byWidth = (width - 48) / stripSize.width;
    const target = panelCollapsed ? Math.min(byHeight, byWidth, 2.5) : 1;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.spring(stripScaleAnim, {
      toValue: target,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [panelCollapsed, stripSize.height, scrollAreaHeight]);

  const panelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, g) => {
        if (Platform.OS !== "web") {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        if (g.dy > 20) setPanelCollapsed(true);
        else if (g.dy < -20) setPanelCollapsed(false);
      },
    }),
  ).current;

  // Refs to avoid stale closures inside the PanResponder created once via useRef
  const stripScaleRef = useRef(1);
  const stripDrawWidthRef = useRef(STRIP_WIDTH);
  const stripDrawHeightRef = useRef(0);
  const panelTabRef = useRef<PanelTab>("filter");
  const drawColorRef = useRef(drawColor);
  const drawThickRef = useRef(false);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  stripScaleRef.current =
    panelCollapsed && stripSize.height > 0 && scrollAreaHeight > 0
      ? Math.min(
          (scrollAreaHeight - 32) / stripSize.height,
          (width - 48) / stripSize.width,
          2.5,
        )
      : 1;
  stripDrawWidthRef.current = stripSize.width;
  stripDrawHeightRef.current = stripSize.height;
  panelTabRef.current = panelTab;
  drawColorRef.current = drawColor;
  drawThickRef.current = drawThick;

  const drawPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => panelTabRef.current === "draw",
      onMoveShouldSetPanResponder: () => panelTabRef.current === "draw",
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const s = stripScaleRef.current;
        currentPathRef.current = [{ x: locationX / s, y: locationY / s }];
        setCurrentPath([{ x: locationX / s, y: locationY / s }]);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const s = stripScaleRef.current;
        currentPathRef.current = [...currentPathRef.current, { x: locationX / s, y: locationY / s }];
        setCurrentPath([...currentPathRef.current]);
      },
      onPanResponderRelease: () => {
        // Capture before clearing — the functional updater runs async,
        // so currentPathRef.current would already be [] by then.
        const pts = currentPathRef.current;
        const col = drawColorRef.current;
        const sw = drawThickRef.current ? 8 : 3;
        currentPathRef.current = [];
        setCurrentPath([]);
        if (pts.length > 1) {
          setLayers((prev) => [
            ...prev,
            {
              type: "path",
              data: {
                id: String(Date.now() + Math.random()),
                points: pts,
                color: col,
                strokeWidth: sw,
              },
            },
          ]);
        }
      },
    }),
  ).current;

  const addSticker = (emoji: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const h = stripSize.height > 0 ? stripSize.height : 4 * PHOTO_HEIGHT + 62;
    const w = stripSize.width;
    const EMOJI = 36; // approximate rendered emoji size
    const pad = 8;
    const x = pad + Math.random() * Math.max(0, w - EMOJI - pad * 2);
    const y = pad + Math.random() * Math.max(0, h - EMOJI - pad * 2);
    const newSticker: StickerItem = {
      id: String(Date.now() + Math.random()),
      emoji,
      pos: new Animated.ValueXY({ x, y }),
    };
    setLayers((prev) => [...prev, { type: "sticker", data: newSticker }]);
  };

  const shareStrip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const uri: string = await stripRef.current.capture();
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = uri;
        a.download = "pocketbooth.png";
        a.click();
      } else {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share your strip",
          });
        }
      }
    } catch {
      // user dismissed — ignore
    } finally {
      setSaving(false);
    }
  };

  const saveStrip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const uri: string = await stripRef.current.capture();
      await saveStripToGallery(
        uri,
        requestMediaPermission as any,
        mediaPermission as any,
      );
      if (Platform.OS !== "web") {
        Alert.alert("Saved!", "Your strip has been saved to your gallery 📸");
      }
    } catch (e: any) {
      if (e?.message === "permission_denied") {
        Alert.alert(
          "Permission required",
          "Please allow gallery access to save.",
        );
      } else if (Platform.OS !== "web") {
        Alert.alert("Error", "Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const isDrawMode = panelTab === "draw";
  const isStickerMode = panelTab === "sticker";

  return (
    <View style={styles.root}>
      {/* ── Zone du strip ── */}
      <View style={styles.stripZone}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onHome} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your strip</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.stripScroll,
            panelCollapsed && scrollAreaHeight > 0
              ? { height: scrollAreaHeight }
              : { flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={!panelCollapsed}
          scrollEnabled={!panelCollapsed && !isDrawMode && !isStickerMode}
          onLayout={(e) => setScrollAreaHeight(e.nativeEvent.layout.height)}
        >
          <Animated.View
            style={[
              styles.stripCard,
              { transform: [{ scale: stripScaleAnim }] },
            ]}
          >
            <ViewShot
              ref={stripRef}
              options={{ format: "png", quality: 1.0 }}
              style={{ borderRadius: 10, overflow: "hidden" }}
            >
              <View
                style={[
                  styles.strip,
                  { backgroundColor: STRIP_BG_COLORS[bgIndex] },
                ]}
                onLayout={(e) =>
                  setStripSize({
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height,
                  })
                }
              >
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoWrap}>
                    <Image
                      source={{ uri }}
                      style={[styles.photo, getImageFilterStyle(filter)]}
                      resizeMode="cover"
                    />
                  </View>
                ))}

                {showDate && (
                  <View style={styles.dateLine}>
                    <Text
                      style={[
                        styles.dateText,
                        { color: bgIndex === 1 ? "#888" : "#aaa" },
                      ]}
                    >
                      {formatDate(new Date())}
                    </Text>
                    <Text style={styles.brandText}>PocketBooth</Text>
                  </View>
                )}

                {/* Interleaved stickers, text and paths in creation order */}
                {layers.map((layer) => {
                  if (layer.type === "sticker") {
                    return (
                      <StickerView
                        key={`s-${layer.data.id}`}
                        sticker={layer.data}
                        showRemove={isStickerMode}
                        onRemove={() =>
                          setLayers((prev) =>
                            prev.filter(
                              (l) =>
                                !(
                                  l.type === "sticker" &&
                                  l.data.id === layer.data.id
                                ),
                            ),
                          )
                        }
                        stripWidth={stripSize.width}
                        stripHeight={stripSize.height}
                        scaleRef={stripScaleRef}
                      />
                    );
                  }
                  if (stripSize.height === 0) return null;
                  return (
                    <View
                      key={`p-${layer.data.id}`}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    >
                      <Svg width={stripSize.width} height={stripSize.height}>
                        <SvgPath
                          d={buildPathD(layer.data.points)}
                          stroke={layer.data.color}
                          strokeWidth={layer.data.strokeWidth}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  );
                })}

                {/* Live stroke — always on top while drawing */}
                {currentPath.length > 0 && stripSize.height > 0 && (
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg width={stripSize.width} height={stripSize.height}>
                      <SvgPath
                        d={buildPathD(currentPath)}
                        stroke={drawColor}
                        strokeWidth={drawThick ? 8 : 3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                )}

                {/* Touch capture — transparent unless in draw mode */}
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    isDrawMode && styles.drawOverlay,
                  ]}
                  pointerEvents={isDrawMode ? "box-only" : "none"}
                  {...drawPanResponder.panHandlers}
                />
              </View>
            </ViewShot>
          </Animated.View>
        </ScrollView>
      </View>

      {/* ── Panneau de contrôles ── */}
      <View style={styles.panel}>
        {/* Collapse handle — always visible */}
        <View style={styles.panelHandleArea} {...panelPanResponder.panHandlers}>
          <TouchableOpacity
            style={styles.panelHandle}
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS !== "web") {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
              }
              setPanelCollapsed((prev) => !prev);
            }}
          >
            <View style={styles.handlePill} />
          </TouchableOpacity>
        </View>

        {!panelCollapsed && (
          <>
            {/* Tab bar */}
            <View style={styles.tabBar}>
              {(["filter", "bg", "sticker", "draw"] as PanelTab[]).map(
                (tab) => {
                  const labels: Record<PanelTab, string> = {
                    filter: "🎞️ Filter",
                    bg: "🎨 BG",
                    sticker: "🩷 Stickers",
                    draw: "✏️ Draw",
                  };
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setPanelTab(tab)}
                      style={[
                        styles.tabItem,
                        panelTab === tab && styles.tabItemActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          panelTab === tab && styles.tabTextActive,
                        ]}
                      >
                        {labels[tab]}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            {/* Tab content */}
            <View style={styles.tabContent}>
              {panelTab === "filter" && (
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
                      <Text
                        style={[
                          styles.filterPillText,
                          filter === f.id && { color: "#fff" },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {panelTab === "bg" && (
                <View style={{ gap: 10 }}>
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
                        {bgIndex === i && (
                          <Text
                            style={[
                              styles.bgCheck,
                              { color: i === 1 ? "#fff" : "#333" },
                            ]}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDate((v) => !v)}
                    style={[styles.ghostBtn, { alignSelf: "flex-start" }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ghostBtnText}>
                      {showDate ? "🗓 Hide date" : "🗓 Show date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {panelTab === "sticker" && (
                <View style={{ gap: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.stickerPickerRow}>
                      {STICKER_EMOJIS.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => addSticker(emoji)}
                          style={styles.stickerPickerBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.stickerPickerText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={styles.drawToolRow}>
                    <TouchableOpacity
                      onPress={() =>
                        setLayers((prev) => {
                          const idx = [...prev]
                            .reverse()
                            .findIndex((l) => l.type === "sticker");
                          if (idx === -1) return prev;
                          return prev.filter(
                            (_, i) => i !== prev.length - 1 - idx,
                          );
                        })
                      }
                      style={styles.ghostBtn}
                      activeOpacity={0.8}
                      disabled={!layers.some((l) => l.type === "sticker")}
                    >
                      <Text style={styles.ghostBtnText}>↩ Undo</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() =>
                        setLayers((prev) =>
                          prev.filter((l) => l.type !== "sticker"),
                        )
                      }
                      style={styles.ghostBtn}
                      activeOpacity={0.8}
                      disabled={!layers.some((l) => l.type === "sticker")}
                    >
                      <Text style={styles.ghostBtnText}>Clear all</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {panelTab === "draw" && (
                <View style={{ gap: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.drawColorRow}>
                      {DRAW_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setDrawColor(c)}
                          style={[
                            styles.colorDot,
                            { backgroundColor: c },
                            c === "#ffffff" && styles.colorDotWhite,
                            drawColor === c && styles.colorDotActive,
                          ]}
                          activeOpacity={0.8}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <View style={styles.drawToolRow}>
                    <TouchableOpacity
                      onPress={() => setDrawThick(false)}
                      style={[
                        styles.brushBtn,
                        !drawThick && styles.brushBtnActive,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.brushBtnText,
                          !drawThick && styles.brushBtnTextActive,
                        ]}
                      >
                        Thin
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDrawThick(true)}
                      style={[
                        styles.brushBtn,
                        drawThick && styles.brushBtnActive,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.brushBtnText,
                          drawThick && styles.brushBtnTextActive,
                        ]}
                      >
                        Thick
                      </Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() =>
                        setLayers((prev) => {
                          const idx = [...prev]
                            .reverse()
                            .findIndex((l) => l.type === "path");
                          if (idx === -1) return prev;
                          return prev.filter(
                            (_, i) => i !== prev.length - 1 - idx,
                          );
                        })
                      }
                      style={styles.ghostBtn}
                      activeOpacity={0.8}
                      disabled={!layers.some((l) => l.type === "path")}
                    >
                      <Text style={styles.ghostBtnText}>↩ Undo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setLayers((prev) =>
                          prev.filter((l) => l.type !== "path"),
                        )
                      }
                      style={[styles.ghostBtn, { marginLeft: 8 }]}
                      activeOpacity={0.8}
                      disabled={!layers.some((l) => l.type === "path")}
                    >
                      <Text style={styles.ghostBtnText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveStrip}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving
                  ? "Saving…"
                  : Platform.OS === "web"
                    ? "Download ↓"
                    : "Save to gallery 📷"}
              </Text>
            </TouchableOpacity>

            {/* Secondary actions */}
            <View style={styles.secondaryRow}>
              {Platform.OS !== "web" && (
                <>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={shareStrip}
                    activeOpacity={0.8}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryText}>🔗 Share</Text>
                  </TouchableOpacity>
                  <View style={styles.sep} />
                </>
              )}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onRetake}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryText}>🔄 Retake</Text>
              </TouchableOpacity>
              <View style={styles.sep} />
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onHome}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryText}>🏠 Home</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: SAFE_BOTTOM }} />
      </View>
    </View>
  );
}

function getImageFilterStyle(filter: FilterType) {
  if (filter === "none") return {};

  if (Platform.OS === "web") {
    switch (filter) {
      case "bw":
        return { filter: "grayscale(1)" } as any;
      case "sepia":
        return { filter: "sepia(0.9)" } as any;
      case "vintage":
        return {
          filter: "sepia(0.4) contrast(1.1) brightness(0.92) saturate(0.75)",
        } as any;
      default:
        return {};
    }
  }

  switch (filter) {
    case "bw":
      return { filter: [{ grayscale: 1 }] } as any;
    case "sepia":
      return { filter: [{ sepia: 0.9 }] } as any;
    case "vintage":
      return {
        filter: [
          { sepia: 0.4 },
          { contrast: 1.1 },
          { brightness: 0.92 },
          { saturate: 0.75 },
        ],
      } as any;
    default:
      return {};
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#666",
    ...Platform.select({ web: { overflow: "hidden" as any } }),
  },

  // ─── Strip zone ───
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
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  scrollArea: {
    flex: 1,
    backgroundColor: "#666",
  },
  stripCard: {
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
      default: { boxShadow: "0px 4px 20px rgba(0,0,0,0.55)" },
    }),
  },
  stripScroll: {
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
    overflow: "hidden",
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
  brandText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#E8325C",
    letterSpacing: 0.3,
  },

  // ─── Sticker ───
  stickerWrap: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  stickerEmoji: {
    fontSize: 32,
    lineHeight: 36,
  },
  stickerX: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E8325C",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerXText: { color: "#fff", fontSize: 8, fontWeight: "800" },

  // ─── Draw overlay ───
  drawOverlay: {
    ...(Platform.OS === "web" ? ({ cursor: "crosshair" } as any) : {}),
  },

  // ─── Panel ───
  panel: {
    backgroundColor: "#FAF5EB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 14,
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

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: { boxShadow: "0px 1px 4px rgba(0,0,0,0.1)" },
    }),
  },
  tabText: { fontSize: 11, fontWeight: "600", color: "#999" },
  tabTextActive: { color: "#333", fontWeight: "700" },

  tabContent: { minHeight: 52 },

  // Filters
  filterRow: { flexDirection: "row", gap: 8 },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: "center",
  },
  filterPillText: { fontSize: 12, fontWeight: "700", color: "#444" },

  // BG swatches
  bgRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  bgSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bgSwatchActive: { borderColor: "#E8325C", borderWidth: 2.5 },
  bgCheck: { fontSize: 16, fontWeight: "800" },

  // Sticker picker
  stickerPickerRow: { flexDirection: "row", gap: 6 },
  stickerPickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerPickerText: { fontSize: 24 },

  // Draw colors
  drawColorRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingVertical: 2,
  },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotWhite: { borderWidth: 1.5, borderColor: "rgba(0,0,0,0.15)" },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "#E8325C",
    transform: [{ scale: 1.2 }],
  },

  drawToolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brushBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.15)",
  },
  brushBtnActive: { backgroundColor: "#333", borderColor: "#333" },
  brushBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  brushBtnTextActive: { color: "#fff" },

  ghostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
  },
  ghostBtnText: { fontSize: 12, fontWeight: "600", color: "#888" },

  // ─── Panel collapse handle ───
  panelHandleArea: {
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginHorizontal: -60,
  },
  panelHandle: {
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  handleChevron: {
    fontSize: 10,
    color: "#bbb",
    fontWeight: "700",
  },

  // ─── Save / secondary ───
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginVertical: -4,
  },
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

  // Text sticker
  textStickerText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
    ...Platform.select({
      web: { textShadow: "0px 1px 3px rgba(0,0,0,0.5)" },
      default: {
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  textStickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textStickerInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#333",
  },
  textColorDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  textStickerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#E8325C",
    alignItems: "center",
    justifyContent: "center",
  },
  textStickerAddText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
});
