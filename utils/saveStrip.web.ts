// Web: no native media library — use browser download instead

export function useSavePermission(): [null, () => Promise<null>] {
  return [null, async () => null];
}

export async function saveStripToGallery(uri: string) {
  // Convert data URI → Blob → object URL so iOS Safari triggers a real download
  const res = await fetch(uri);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `pocketbooth-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
