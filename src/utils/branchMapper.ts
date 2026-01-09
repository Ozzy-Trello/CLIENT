/**
 * Maps full branch names to their short codes
 * Handles case-insensitive matching for branch names
 */

const ozzyClothingShort: Record<string, string> = {
  "ozzy clothing warungboto": "WBT",
  "ozzy clothing maguwo": "MGW",
  "ozzy clothing kabupaten": "KBT",
  "ozzy clothing klaten": "KLT",
  "ozzy clothing solo": "SLO",
  "ozzy clothing indonesia": "IDN",
};

/**
 * Maps a branch name to its short code
 * @param branchName - The full branch name to map
 * @returns The short code for the branch, or the original name if no mapping found
 */
export const mapBranchNameToShort = (branchName: string | null | undefined): string => {
  
  if (!branchName) return "";
  
  const normalizedBranchName = branchName.toLowerCase().trim();
  return ozzyClothingShort[normalizedBranchName] || branchName;
};

/**
 * Gets all available branch mappings
 * @returns Object containing all branch name to short code mappings
 */
export const getAllBranchMappings = (): Record<string, string> => {
  return { ...ozzyClothingShort };
};