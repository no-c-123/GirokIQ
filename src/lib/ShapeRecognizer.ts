import {
  type Point,
  getBoundingBox,
  getDistance,
  getPathLength,
  distToSegment,
} from "./geometry";

export type ShapeType = "line" | "rectangle" | "circle" | "ellipse" | "triangle";

export interface RecognizedShape {
  type: ShapeType;
  confidence: number;
  points: Point[]; // The idealized points for the shape
  originalPoints: Point[]; // For reference/undo
}

export class ShapeRecognizer {
  /**
   * Main entry point for shape recognition.
   * @param rawPoints Flat array of [x, y, x, y, ...]
   * @returns RecognizedShape or null
   */
  static recognize(rawPoints: number[]): RecognizedShape | null {
    if (rawPoints.length < 6) return null; // Need at least 3 points

    // Convert flat array to Point objects
    const points: Point[] = [];
    for (let i = 0; i < rawPoints.length; i += 2) {
      points.push({ x: rawPoints[i], y: rawPoints[i + 1] });
    }

    const pathLength = getPathLength(points);
    if (pathLength < 20) return null; // Too small to be a meaningful shape

    const start = points[0];
    const end = points[points.length - 1];
    const distStartEnd = getDistance(start, end);
    const bbox = getBoundingBox(points);
    const diagonal = Math.hypot(bbox.width, bbox.height);

    // 1. Check for Line
    // Heuristic: End-to-end distance is close to path length
    const linearity = distStartEnd / pathLength;
    if (linearity > 0.95) {
      return {
        type: "line",
        confidence: linearity,
        points: [start, end],
        originalPoints: points,
      };
    }

    // 2. Check for Closed Shapes
    // Heuristic: Start and end are close relative to perimeter or absolute distance
    const isClosed = distStartEnd < pathLength * 0.2 || distStartEnd < 20;

    if (isClosed) {
      // Simplify the polygon to find corners
      // Epsilon is crucial. 2-5% of diagonal is a good heuristic for "significant" corners.
      const epsilon = Math.max(5, diagonal * 0.03);
      const simplified = this.douglasPeucker(points, epsilon);
      
      // Close the simplified polygon if it's not already
      if (getDistance(simplified[0], simplified[simplified.length - 1]) > epsilon) {
          simplified.push(simplified[0]);
      }

      const vertices = simplified.length - 1; // Subtract the closing point

      // Triangle (3 vertices)
      if (vertices === 3) {
        return {
          type: "triangle",
          confidence: 0.85,
          points: simplified,
          originalPoints: points,
        };
      }

      // Rectangle / Quad (4 vertices)
      if (vertices === 4) {
        // Check if it's a rectangle (angles ~90 degrees)
        // or just a generic quad. User asked for "Rectangle".
        // Let's check if it's axis-aligned or rotated rectangle.
        // For simplicity, return the quad as the "snapped" shape.
        // To make it a "perfect" rectangle, we'd need to adjust vertices to form 90 deg angles.
        // For Phase 1, snapping to the 4 corners is a huge improvement over freehand.
        return {
          type: "rectangle",
          confidence: 0.8,
          points: simplified,
          originalPoints: points,
        };
      }

      // Circle / Ellipse (Many vertices or smooth curve)
      // If Douglas-Peucker returns many points, it's likely a curve.
      // Or if few points but high variance from straight lines (checked by simplification error).
      // Let's use the standard deviation from center heuristic.
      
      const center = {
        x: bbox.minX + bbox.width / 2,
        y: bbox.minY + bbox.height / 2,
      };
      
      // Check Ellipse fit
      const rx = bbox.width / 2;
      const ry = bbox.height / 2;
      let error = 0;
      for (const p of points) {
          const dx = (p.x - center.x) / rx;
          const dy = (p.y - center.y) / ry;
          error += Math.abs(Math.sqrt(dx*dx + dy*dy) - 1);
      }
      error /= points.length;

      if (error < 0.15) {
        const aspectRatio = bbox.width / bbox.height;
        const isCircle = aspectRatio > 0.8 && aspectRatio < 1.25;
        const type = isCircle ? "circle" : "ellipse";
        
        // Generate smooth points
        const shapePoints: Point[] = [];
        const steps = 60;
        const finalRx = isCircle ? (rx + ry) / 2 : rx;
        const finalRy = isCircle ? (rx + ry) / 2 : ry;
        
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * 2 * Math.PI;
          shapePoints.push({
            x: center.x + Math.cos(theta) * finalRx,
            y: center.y + Math.sin(theta) * finalRy,
          });
        }
        
        return {
          type,
          confidence: 1 - error,
          points: shapePoints,
          originalPoints: points,
        };
      }
    }

    return null;
  }

  /**
   * Ramer-Douglas-Peucker algorithm to simplify a polyline.
   */
  private static douglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length < 3) return points;
    
    let dmax = 0;
    let index = 0;
    const end = points.length - 1;
    
    for (let i = 1; i < end; i++) {
        const d = distToSegment(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }
    
    if (dmax > epsilon) {
        const rec1 = this.douglasPeucker(points.slice(0, index + 1), epsilon);
        const rec2 = this.douglasPeucker(points.slice(index), epsilon);
        
        return rec1.slice(0, rec1.length - 1).concat(rec2);
    } else {
        return [points[0], points[end]];
    }
  }
}
