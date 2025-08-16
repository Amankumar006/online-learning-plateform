// src/lib/firestore-utils.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Utility functions for handling Firestore data conversions
 */

/**
 * Convert any object to a Firestore-compatible plain object
 * This handles nested objects and Timestamp conversions
 */
export function toFirestoreData<T>(data: T): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data;
  }

  if (data instanceof Date) {
    return Timestamp.fromDate(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => toFirestoreData(item));
  }

  if (typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = toFirestoreData(value);
    }
    return result;
  }

  return data;
}

/**
 * Convert Firestore data back to typed objects
 * This handles Timestamp conversions and nested objects
 */
export function fromFirestoreData<T>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data as any;
  }

  // Handle Firestore timestamp objects that aren't Timestamp instances
  if (data && typeof data === 'object' && data.seconds !== undefined && data.nanoseconds !== undefined) {
    return new Timestamp(data.seconds, data.nanoseconds) as any;
  }

  if (Array.isArray(data)) {
    return data.map(item => fromFirestoreData(item)) as any;
  }

  if (typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = fromFirestoreData(value);
    }
    return result;
  }

  return data;
}

/**
 * Safely convert data for Firestore operations
 * This ensures compatibility with Firestore's type requirements
 */
export function prepareForFirestore<T>(data: T): Record<string, any> {
  const converted = toFirestoreData(data);
  
  // Ensure we return a plain object
  if (typeof converted === 'object' && converted !== null && !Array.isArray(converted)) {
    return converted;
  }
  
  throw new Error('Data must be an object to store in Firestore');
}

/**
 * Type-safe document data retrieval
 */
export function getDocumentData<T>(docData: any): T {
  return fromFirestoreData<T>(docData);
}