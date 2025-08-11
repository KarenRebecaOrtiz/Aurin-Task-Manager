import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

// Helper function for conditional logging (only in development)
const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
};

// Helper function for conditional error logging (only in development)
const debugError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }
};

const storage = getStorage(app);

export const uploadTempImage = async (file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `temp/${crypto.randomUUID()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    debugLog('[Upload] Temp image uploaded:', url);
    return url;
  } catch (error) {
    debugError('[Upload] Error:', error);
    throw new Error('Failed to upload temp image');
  }
};

export const uploadMessageImage = async (file: File, taskId: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `messages/${taskId}/${crypto.randomUUID()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    debugLog('[Upload] Message image uploaded:', url);
    return url;
  } catch (error) {
    debugError('[Upload] Error:', error);
    throw new Error('Failed to upload message image');
  }
}; 