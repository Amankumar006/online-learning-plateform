/**
 * Context management for Buddy AI tools
 * Handles user state and data sharing between tools
 */

// Global variables to store current user context and data
let currentUserId: string | null = null;
let currentUserProgress: any = null;
let currentAvailableLessons: any = null;

export async function setCurrentUserId(userId: string | null) {
    currentUserId = userId;
}

export async function setCurrentUserData(userProgress: any, availableLessons: any) {
    currentUserProgress = userProgress;
    currentAvailableLessons = availableLessons;
}

export function getCurrentContext() {
    return {
        currentUserId,
        currentUserProgress,
        currentAvailableLessons
    };
}