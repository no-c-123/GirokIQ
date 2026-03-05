
export interface Tool {
  name: string;
  onPointerDown(x: number, y: number, pressure: number): void;
  onPointerMove(x: number, y: number, pressure: number): void;
  onPointerUp(x: number, y: number, pressure: number): void;
  activate?(): void;
  deactivate?(): void;
}
