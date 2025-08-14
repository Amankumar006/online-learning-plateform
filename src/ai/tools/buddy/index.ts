/**
 * Buddy AI Tools - Modular tool collection
 * Exports all tools and context management functions
 */

import { createExerciseTool } from './exercise-tool';
import { searchTheWebTool } from './search-tool';
import { analyzeCodeComplexityTool } from './analysis-tool';
import { suggestTopicsTool } from './study-tool';
import { generateImageForExplanationTool, processImageTool } from './visual-tool';
import { setCurrentUserId, setCurrentUserData, getCurrentContext } from './context';

// Export context management functions
export { setCurrentUserId, setCurrentUserData };

// Export the tools array - context is handled via global state for now
export async function getBuddyChatTools() {
    return [
        createExerciseTool,
        suggestTopicsTool,
        searchTheWebTool,
        generateImageForExplanationTool,
        analyzeCodeComplexityTool,
        processImageTool
    ];
}