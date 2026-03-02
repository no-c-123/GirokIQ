export type DetectedShapeType = "line" | "rectangle" | "circle" | "triangle" | "arrow" | null;

export interface Point {
  x: number;
  y: number;
}

export function recognizeShape(points: number[]): { type: DetectedShapeType; points: number[] } | null {
  if (points.length < 6) return null;

  const pts: Point[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pts.push({ x: points[i], y: points[i + 1] });
  }

  const bbox = getBoundingBox(pts);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const diagonal = Math.hypot(width, height);

  // 1. Check for Line
  const start = pts[0];
  const end = pts[pts.length - 1];
  const distStartEnd = Math.hypot(end.x - start.x, end.y - start.y);
  if (distStartEnd > diagonal * 0.8) {
    // Check if points are close to the line start-end
    let maxDist = 0;
    for (const p of pts) {
      const d = distToSegment(p, start, end);
      if (d > maxDist) maxDist = d;
    }
    if (maxDist < diagonal * 0.1) {
      return { type: "line", points: [start.x, start.y, end.x, end.y] };
    }
  }

  // 2. Check for Circle/Ellipse
  const center = { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
  const radiusX = width / 2;
  const radiusY = height / 2;
  let circleError = 0;
  for (const p of pts) {
    const dx = (p.x - center.x) / radiusX;
    const dy = (p.y - center.y) / radiusY;
    const dist = Math.hypot(dx, dy);
    circleError += Math.abs(dist - 1);
  }
  circleError /= pts.length;
  if (circleError < 0.15) {
    // Generate smooth circle points
    const circlePts: number[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      circlePts.push(center.x + Math.cos(angle) * radiusX);
      circlePts.push(center.y + Math.sin(angle) * radiusY);
    }
    return { type: "circle", points: circlePts };
  }

  // 3. Check for Rectangle
  // A rectangle has points mostly near the 4 edges of its bounding box
  let rectError = 0;
  for (const p of pts) {
    const distToEdge = Math.min(
      Math.abs(p.x - bbox.minX),
      Math.abs(p.x - bbox.maxX),
      Math.abs(p.y - bbox.minY),
      Math.abs(p.y - bbox.maxY)
    );
    rectError += distToEdge;
  }
  rectError /= (pts.length * diagonal);
  if (rectError < 0.05) {
    return {
      type: "rectangle",
      points: [
        bbox.minX, bbox.minY,
        bbox.maxX, bbox.minY,
        bbox.maxX, bbox.maxY,
        bbox.minX, bbox.maxY,
        bbox.minX, bbox.minY
      ]
    };
  }

  return null;
}

function getBoundingBox(pts: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function distToSegment(p: Point, v: Point, w: Point) {
  const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
