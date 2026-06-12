import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import CameraScreen from "./screens/CameraScreen";
import StripScreen from "./screens/StripScreen";

export type Screen = "home" | "camera" | "strip";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <>
      <StatusBar style="dark" />
      {screen === "home" && <HomeScreen onStart={() => setScreen("camera")} />}
      {screen === "camera" && (
        <CameraScreen
          onDone={(uris) => {
            setPhotos(uris);
            setScreen("strip");
          }}
          onCancel={() => setScreen("home")}
        />
      )}
      {screen === "strip" && (
        <StripScreen
          photos={photos}
          onRetake={() => {
            setPhotos([]);
            setScreen("camera");
          }}
          onHome={() => {
            setPhotos([]);
            setScreen("home");
          }}
        />
      )}
    </>
  );
}
