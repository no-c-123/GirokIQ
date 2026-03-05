export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialItem<T> extends Rect {
  data: T;
}

export class QuadTree<T> {
  private bounds: Rect;
  private capacity: number;
  private items: SpatialItem<T>[];
  private divided: boolean;
  private children: QuadTree<T>[];

  constructor(bounds: Rect, capacity: number = 10) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.items = [];
    this.divided = false;
    this.children = [];
  }

  insert(item: SpatialItem<T>): boolean {
    if (!this.intersects(this.bounds, item)) {
      return false;
    }

    if (this.items.length < this.capacity && !this.divided) {
      this.items.push(item);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.children[0].insert(item) ||
      this.children[1].insert(item) ||
      this.children[2].insert(item) ||
      this.children[3].insert(item)
    );
  }

  query(range: Rect, found: SpatialItem<T>[] = []): SpatialItem<T>[] {
    if (!this.intersects(this.bounds, range)) {
      return found;
    }

    for (const item of this.items) {
      if (this.intersects(range, item)) {
        found.push(item);
      }
    }

    if (this.divided) {
      this.children[0].query(range, found);
      this.children[1].query(range, found);
      this.children[2].query(range, found);
      this.children[3].query(range, found);
    }

    return found;
  }

  private subdivide() {
    const { x, y, width, height } = this.bounds;
    const w = width / 2;
    const h = height / 2;

    this.children.push(new QuadTree({ x, y, width: w, height: h }, this.capacity));
    this.children.push(new QuadTree({ x: x + w, y, width: w, height: h }, this.capacity));
    this.children.push(new QuadTree({ x, y: y + h, width: w, height: h }, this.capacity));
    this.children.push(new QuadTree({ x: x + w, y: y + h, width: w, height: h }, this.capacity));

    this.divided = true;
  }

  private intersects(a: Rect, b: Rect): boolean {
    return !(
      b.x > a.x + a.width ||
      b.x + b.width < a.x ||
      b.y > a.y + a.height ||
      b.y + b.height < a.y
    );
  }
  
  clear() {
    this.items = [];
    this.children = [];
    this.divided = false;
  }
}
