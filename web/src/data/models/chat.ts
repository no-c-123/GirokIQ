export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  deleted?: boolean;
}
