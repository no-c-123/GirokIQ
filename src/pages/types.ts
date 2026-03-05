
export interface Page {
  id: string;
  notebookId: string;
  title: string;
  type: "canvas" | "document";
  createdAt: number;
  updatedAt: number;
  settings: {
    size: string;
    orientation: string;
    grid: string;
    zoom: number;
  };
}
