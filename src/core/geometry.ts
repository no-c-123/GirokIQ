export interface Point {
  x: number;
  y: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function getPathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += getDistance(points[i - 1], points[i]);
  }
  return len;
}

export function getBoundingBox(points: Point[]): BBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function dotProduct(v1: Point, v2: Point): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function magnitude(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Point): Point {
  const m = magnitude(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

export function angleBetween(v1: Point, v2: Point): number {
  const dot = dotProduct(v1, v2);
  const m1 = magnitude(v1);
  const m2 = magnitude(v2);
  if (m1 === 0 || m2 === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2))));
}

export function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
  if (l2 === 0) return getDistance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return getDistance(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y),
  });
}

// Douglas-Peucker simplification could be useful here too, but maybe overkill for now.
