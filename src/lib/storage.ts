import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const snapshot = await uploadBytes(storageRef, blob, {
            contentType: 'image/png'
        });
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload image.");
    }
}
