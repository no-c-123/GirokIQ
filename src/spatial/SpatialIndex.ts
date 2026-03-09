import { QuadTree, type SpatialItem } from "./QuadTree";
import type { StrokeElement } from "@/elements/types";

// Singleton class to manage spatial indexing of strokes
export class SpatialIndex {
  private tree: QuadTree<StrokeElement>;
  private itemMap: Map<string, SpatialItem<StrokeElement>>;
  private version: number = 0;

  constructor() {
    // Large fixed bounds for infinite canvas
    // TODO: Ideally this should expand dynamically, but for now fixed large bounds is okay as per current implementation
    const minX = -1000000;
    const minY = -1000000;
    const maxX = 1000000;
    const maxY = 1000000;

    this.tree = new QuadTree<StrokeElement>({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
    this.itemMap = new Map();
  }

  // Clear and rebuild from scratch (e.g. page load)
  initialize(strokes: StrokeElement[]) {
    this.tree.clear();
    this.itemMap.clear();
    this.version++;

    for (const stroke of strokes) {
      this.insert(stroke);
    }
  }

  insert(stroke: StrokeElement) {
    if (this.itemMap.has(stroke.id)) {
      this.remove(stroke.id);
    }

    if (!stroke.points || stroke.points.length < 2) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < stroke.points.length; i += 2) {
      minX = Math.min(minX, stroke.points[i]);
      minY = Math.min(minY, stroke.points[i + 1]);
      maxX = Math.max(maxX, stroke.points[i]);
      maxY = Math.max(maxY, stroke.points[i + 1]);
    }

    // Handle single point or very small strokes
    if (maxX === minX) maxX += 1;
    if (maxY === minY) maxY += 1;

    const item: SpatialItem<StrokeElement> = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      data: stroke,
    };

    this.tree.insert(item);
    this.itemMap.set(stroke.id, item);
    this.version++;
  }

  remove(id: string) {
    const item = this.itemMap.get(id);
    if (item) {
      this.tree.remove(item);
      this.itemMap.delete(id);
      this.version++;
    }
  }

  update(stroke: StrokeElement) {
    this.insert(stroke); // insert handles removal of old entry via ID check
  }

  query(rect: { x: number; y: number; width: number; height: number }): StrokeElement[] {
    return this.tree.query(rect).map((item) => item.data);
  }

  getVersion() {
    return this.version;
  }
}

export const spatialIndex = new SpatialIndex();
