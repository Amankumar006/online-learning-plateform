
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

    } catch (error: any) {
        console.error("Firebase Storage upload error:", error);
        const errorMessage = error.code ? `Firebase Storage Error: ${error.code}` : "Failed to upload image due to an unknown error.";
        throw new Error(errorMessage);
    }
}


/**
 * Uploads a base64 encoded audio file (WAV) to Firebase Storage and returns the public URL.
 * @param dataUrl The base64 data URI of the audio file.
 * @param fileName A unique name for the file.
 * @returns The public URL of the uploaded audio file.
 */
export async function uploadAudioFromDataUrl(dataUrl: string, fileName: string): Promise<string> {
    try {
        const path = `lesson-audio/${fileName}.wav`;
        const storageRef = ref(storage, path);
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        const snapshot = await uploadBytes(storageRef, blob, {
            contentType: 'audio/wav'
        });
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error: any) {
        console.error("Firebase Storage audio upload error:", error);
        const errorMessage = error.code ? `Firebase Storage Error: ${error.code}` : "Failed to upload audio due to an unknown error.";
        throw new Error(errorMessage);
    }
}
