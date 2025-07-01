import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a base64 encoded image to Firebase Storage and returns the public URL.
 * @param dataUrl The base64 data URI of the image.
 * @param fileName A unique name for the file.
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageFromDataUrl(dataUrl: string, fileName: string): Promise<string> {
    try {
        const path = `lesson-images/${fileName}.png`;
        const storageRef = ref(storage, path);
        
        const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);

        const snapshot = await uploadString(storageRef, base64Data, 'base64', {
            contentType: 'image/png'
        });
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload image.");
    }
}
