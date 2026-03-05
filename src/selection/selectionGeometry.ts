export function isPointInPolygon(point: { x: number, y: number }, polygon: number[]): boolean {
  const x = point.x;
  const y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length / 2 - 1; i < polygon.length / 2; j = i++) {
    const xi = polygon[i * 2], yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2], yj = polygon[j * 2 + 1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isStrokeInPolygon(strokePoints: number[], polygon: number[]): boolean {
  // Check if any point of the stroke is in the polygon
  // For better accuracy, we could check if all points are in, or if segments intersect
  for (let i = 0; i < strokePoints.length; i += 2) {
    if (isPointInPolygon({ x: strokePoints[i], y: strokePoints[i + 1] }, polygon)) {
      return true;
    }
  }
  return false;
}

export function isRectInPolygon(rect: { x: number, y: number, width: number, height: number }, polygon: number[]): boolean {
  // Check corners of the rect
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
  for (const corner of corners) {
    if (isPointInPolygon(corner, polygon)) return true;
  }
  return false;
}
