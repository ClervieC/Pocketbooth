import * as MediaLibrary from 'expo-media-library';

export function useSavePermission() {
  return MediaLibrary.usePermissions();
}

export async function saveStripToGallery(uri: string, requestPermission: () => Promise<MediaLibrary.PermissionResponse | null>, currentPermission: MediaLibrary.PermissionResponse | null) {
  let perm = currentPermission;
  if (!perm?.granted) {
    perm = await requestPermission();
  }
  if (!perm?.granted) {
    throw new Error('permission_denied');
  }
  await MediaLibrary.Asset.create(uri);
}
