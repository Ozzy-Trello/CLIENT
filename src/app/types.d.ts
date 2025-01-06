export interface Task {
    id: string;
    content: string;
  }
  
  export interface Column {
    id: string;
    title: string;
    taskIds: string[];
  }
  
  export interface BoardData {
    columns: { [key: string]: Column };
    tasks: { [key: string]: Task };
    columnOrder: string[];
  }
  