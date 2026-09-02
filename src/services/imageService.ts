import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Photos come off a phone camera at ~4000px and several megabytes. Uploading
// that as-is is slow on mobile data and wastes storage, and we never display
// them larger than a phone screen — so resize and re-compress before upload.
const MAX_WIDTH = 1200;
const COMPRESSION = 0.7;

async function compress(uri: string): Promise<string> {
  // Uses the current chainable API (the older manipulateAsync() is deprecated).
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: COMPRESSION,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

export type PhotoAction = 'unchanged' | 'remove' | 'upload';

/**
 * Decides what a save needs to do about the photo.
 *
 * When editing, the field starts out holding the *remote* URL of the existing
 * photo. Uploading that again on every save would cost money, burn bandwidth
 * and create a duplicate file for no reason — so an untouched photo has to be
 * recognised and left alone. Only a freshly picked local file:// URI is new.
 */
export function photoAction(current: string | null, original?: string): PhotoAction {
  if (!current) return original ? 'remove' : 'unchanged';
  if (current === original) return 'unchanged';
  return 'upload';
}

/**
 * Resolves the photo URL to save, uploading only when the photo actually
 * changed. Returns undefined when there should be no photo.
 */
export async function resolvePhotoUrl(
  current: string | null,
  original: string | undefined,
  folder: string
): Promise<string | undefined> {
  switch (photoAction(current, original)) {
    case 'unchanged':
      return original;
    case 'remove':
      return undefined;
    case 'upload':
      return uploadImage(current as string, folder);
  }
}

/**
 * Uploads a local image file to Firebase Storage and returns its public URL.
 *
 * `folder` groups uploads (e.g. 'listings', 'restaurants'). The filename is
 * randomised so two uploads can never overwrite each other.
 */
export async function uploadImage(localUri: string, folder: string): Promise<string> {
  const compressedUri = await compress(localUri);

  // Firebase Storage needs binary data, and React Native's fetch can turn a
  // local file:// URI into a Blob — this is the standard bridge between the
  // two on React Native.
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const storageRef = ref(storage, `${folder}/${filename}`);

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
