import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';

const storage = getStorage(app);

export const uploadTempImage = async (file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `temp/${crypto.randomUUID()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log('[Upload] Temp image uploaded:', url);
    return url;
  } catch (error) {
    console.error('[Upload] Error:', error);
    throw new Error('Failed to upload temp image');
  }
};

export const uploadMessageImage = async (file: File, taskId: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `messages/${taskId}/${crypto.randomUUID()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log('[Upload] Message image uploaded:', url);
    return url;
  } catch (error) {
    console.error('[Upload] Error:', error);
    throw new Error('Failed to upload message image');
  }
}; 