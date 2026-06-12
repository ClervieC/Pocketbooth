// Web: use Web Share API on iOS Safari (opens share sheet → Save Image → Photos)
// Falls back to blob-URL download on other browsers.

export function useSavePermission(): [null, () => Promise<null>] {
  return [null, async () => null];
}

export async function saveStripToGallery(uri: string): Promise<void> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const fileName = `pocketbooth-${Date.now()}.png`;

  // Web Share API — supported on iOS Safari 15+ and modern Android Chrome.
  // Opens the native share sheet so the user can tap "Save Image" → Photos.
  if (typeof navigator !== "undefined" && navigator.canShare) {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "PocketBooth" });
      return;
    }
  }

  // Fallback: trigger a file download (works on desktop browsers)
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
