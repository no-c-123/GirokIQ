import { QuadTree, type SpatialItem } from "./QuadTree";
import type { StrokeElement } from "@/elements/types";

// Singleton class to manage spatial indexing of strokes
export class SpatialIndex {
  private tree: QuadTree<StrokeElement>;
  private itemMap: Map<string, SpatialItem<StrokeElement>>;
  private version: number = 0;
  private currentBounds: { x: number; y: number; width: number; height: number };

  constructor() {
    // Initial bounds for the quadtree
    // We start with a reasonable size, but it will expand dynamically
    const minX = -10000;
    const minY = -10000;
    const maxX = 10000;
    const maxY = 10000;

    this.currentBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    this.tree = new QuadTree<StrokeElement>(this.currentBounds);
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

    // Check if the item fits in the current bounds
    if (
      minX < this.currentBounds.x ||
      minY < this.currentBounds.y ||
      maxX > this.currentBounds.x + this.currentBounds.width ||
      maxY > this.currentBounds.y + this.currentBounds.height
    ) {
      this.expandBounds(item);
    }

    this.tree.insert(item);
    this.itemMap.set(stroke.id, item);
    this.version++;
  }

  private expandBounds(newItem: SpatialItem<StrokeElement>) {
    // Determine new bounds that include the new item
    let newX = this.currentBounds.x;
    let newY = this.currentBounds.y;
    let newWidth = this.currentBounds.width;
    let newHeight = this.currentBounds.height;

    // Expand to the left
    if (newItem.x < newX) {
      const diff = newX - newItem.x;
      const expansion = Math.max(diff, newWidth); // at least double the size
      newX -= expansion;
      newWidth += expansion;
    }
    // Expand to the top
    if (newItem.y < newY) {
      const diff = newY - newItem.y;
      const expansion = Math.max(diff, newHeight);
      newY -= expansion;
      newHeight += expansion;
    }
    // Expand to the right
    if (newItem.x + newItem.width > newX + newWidth) {
      const diff = (newItem.x + newItem.width) - (newX + newWidth);
      const expansion = Math.max(diff, newWidth);
      newWidth += expansion;
    }
    // Expand to the bottom
    if (newItem.y + newItem.height > newY + newHeight) {
      const diff = (newItem.y + newItem.height) - (newY + newHeight);
      const expansion = Math.max(diff, newHeight);
      newHeight += expansion;
    }

    // Update current bounds
    this.currentBounds = {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    };

    // Rebuild the tree
    const allItems = Array.from(this.itemMap.values());
    this.tree = new QuadTree<StrokeElement>(this.currentBounds);
    
    // Re-insert all items into the new tree
    for (const item of allItems) {
      this.tree.insert(item);
    }
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

  get(id: string): StrokeElement | undefined {
    return this.itemMap.get(id)?.data;
  }

  getVersion() {
    return this.version;
  }
}

export const spatialIndex = new SpatialIndex();
