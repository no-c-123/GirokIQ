
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface Notebook {
  id: string;
  name: string;
  folderId: string | null;
  createdAt: number;
}
