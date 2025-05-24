import { Card } from "./card";

export type AnyList = List | FilterList;

// Regular List/Column
export interface List {
  id: string;
  boardId: string;
  name?: string;
  cover?: string;
  cardIds?: string[];
  cards?: Card[];
  position?: number;
  type?: string;
}

// Filter List/Column
export interface FilterList {
  id: string;
  boardId: string;
  name?: string;
  type?: "filter";
  cardIds?: string[];
  cards?: Card[];
  position?: number;
  filterCriteria?: any; // Define specific filter criteria structure
}