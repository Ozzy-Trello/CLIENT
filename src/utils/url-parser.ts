/**
 * Utility functions for parsing URLs and extracting parameters
 */

/**
 * Extract cardId from a URL
 * Supports URLs like: http://localhost:3000/workspace/.../board/...?cardId=123
 * @param url - The URL to parse
 * @returns The cardId if found, null otherwise
 */
export function extractCardIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const cardId = urlObj.searchParams.get('cardId');
    
    // Validate that cardId looks like a UUID
    if (cardId && isValidUUID(cardId)) {
      return cardId;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Extract boardId from a URL
 * Supports URLs like: http://localhost:3000/workspace/.../board/82aaf8dc-69f4-43f5-b9a1-19e1f17d0cd6
 * @param url - The URL to parse
 * @returns The boardId if found, null otherwise
 */
export function extractBoardIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    
    // Find the segment after 'board'
    const boardIndex = pathSegments.findIndex(segment => segment === 'board');
    if (boardIndex !== -1 && boardIndex + 1 < pathSegments.length) {
      const boardId = pathSegments[boardIndex + 1];
      
      // Validate that boardId looks like a UUID
      if (isValidUUID(boardId)) {
        return boardId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Extract listId from a URL
 * Supports URLs like: http://localhost:3000/workspace/.../board/...?listId=123
 * @param url - The URL to parse
 * @returns The listId if found, null otherwise
 */
export function extractListIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const listId = urlObj.searchParams.get('listId');
    
    // Validate that listId looks like a UUID
    if (listId && isValidUUID(listId)) {
      return listId;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Extract workspaceId from a URL
 * Supports URLs like: http://localhost:3000/workspace/eb65c15c-12cc-49e4-9827-16ef1c838c4d/board/...
 * @param url - The URL to parse
 * @returns The workspaceId if found, null otherwise
 */
export function extractWorkspaceIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    
    // Find the segment after 'workspace'
    const workspaceIndex = pathSegments.findIndex(segment => segment === 'workspace');
    if (workspaceIndex !== -1 && workspaceIndex + 1 < pathSegments.length) {
      const workspaceId = pathSegments[workspaceIndex + 1];
      
      // Validate that workspaceId looks like a UUID
      if (isValidUUID(workspaceId)) {
        return workspaceId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Parse a URL and extract all relevant IDs
 * @param url - The URL to parse
 * @returns Object containing all extracted IDs
 */
export function parseUrlIds(url: string): {
  cardId: string | null;
  boardId: string | null;
  listId: string | null;
  workspaceId: string | null;
} {
  return {
    cardId: extractCardIdFromUrl(url),
    boardId: extractBoardIdFromUrl(url),
    listId: extractListIdFromUrl(url),
    workspaceId: extractWorkspaceIdFromUrl(url),
  };
}

/**
 * Validate if a string looks like a UUID
 * @param str - The string to validate
 * @returns True if it looks like a UUID, false otherwise
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if a string is a valid URL
 * @param str - The string to check
 * @returns True if it's a valid URL, false otherwise
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}