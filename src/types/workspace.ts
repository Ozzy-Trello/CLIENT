export interface Workspace {
  id: string;
  name: string;
  description: string;
  slug: string;
  memberIds?: string[];
  isRestricted?: boolean;
}
