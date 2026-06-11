// Web: no native media library — use browser download instead

export function useSavePermission(): [null, () => Promise<null>] {
  return [null, async () => null];
}

export async function saveStripToGallery(uri: string) {
  const a = document.createElement('a');
  a.href = uri;
  a.download = `pocketbooth-${Date.now()}.png`;
  a.click();
}
