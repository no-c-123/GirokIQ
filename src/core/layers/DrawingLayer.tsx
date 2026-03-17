import { Layer, Group, Path } from "react-konva";
import type { StrokeElement } from "@/elements/types";
import { useMemo, useRef, useEffect, memo, useState } from "react";
import Konva from "konva";
import { spatialIndex } from "@/spatial/SpatialIndex";
import { useSelectionStore } from "@/stores/useSelectionStore";

const TILE_SIZE = 1024;

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface TileKey {
  x: number;
  y: number;
}

// Custom midpoint smoothing algorithm for standard SVG paths
// This replaces perfect-freehand to ensure true constant width
export function getSmoothSvgPath(points: number[]) {
  if (points.length < 4) return "";

  let d = `M ${points[0]} ${points[1]}`;

  for (let i = 2; i < points.length - 2; i += 2) {
    const x1 = points[i];
    const y1 = points[i + 1];
    const x2 = points[i + 2];
    const y2 = points[i + 3];

    // Midpoint formula for quadratic bezier
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    d += ` Q ${x1} ${y1} ${midX} ${midY}`;
  }
  
  // Connect the last point
  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];
  d += ` L ${lastX} ${lastY}`;

  return d;
}

export function getPathData(stroke: StrokeElement) {
  if (stroke.shapeType) {
      if (stroke.points.length < 2) return "";
      
      if (stroke.shapeType === "ellipse") {
          // Calculate bounding box from points
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < stroke.points.length; i += 2) {
              minX = Math.min(minX, stroke.points[i]);
              minY = Math.min(minY, stroke.points[i+1]);
              maxX = Math.max(maxX, stroke.points[i]);
              maxY = Math.max(maxY, stroke.points[i+1]);
          }
          const width = maxX - minX;
          const height = maxY - minY;
          const cx = minX + width / 2;
          const cy = minY + height / 2;
          const rx = width / 2;
          const ry = height / 2;

          // Ellipse path command
          // M cx-rx, cy
          // A rx, ry 0 1, 0 cx+rx, cy
          // A rx, ry 0 1, 0 cx-rx, cy
          return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
      }

      let d = `M ${stroke.points[0]} ${stroke.points[1]}`;
      for (let i = 2; i < stroke.points.length; i += 2) {
          d += ` L ${stroke.points[i]} ${stroke.points[i+1]}`;
      }
      
      if (stroke.shapeType !== "line" && stroke.shapeType !== "arrow" && stroke.points.length > 4) {
          d += " Z";
      }

      if (stroke.shapeType === "arrow" && stroke.points.length >= 4) {
        // Add arrow head at the end
        const endX = stroke.points[stroke.points.length - 2];
        const endY = stroke.points[stroke.points.length - 1];
        const prevX = stroke.points[stroke.points.length - 4];
        const prevY = stroke.points[stroke.points.length - 3];
        
        const angle = Math.atan2(endY - prevY, endX - prevX);
        const headLength = Math.max(10, stroke.width * 3);
        const headAngle = Math.PI / 6; // 30 degrees

        const x1 = endX - headLength * Math.cos(angle - headAngle);
        const y1 = endY - headLength * Math.sin(angle - headAngle);
        const x2 = endX - headLength * Math.cos(angle + headAngle);
        const y2 = endY - headLength * Math.sin(angle + headAngle);

        d += ` M ${endX} ${endY} L ${x1} ${y1} M ${endX} ${endY} L ${x2} ${y2}`;
      }

      return d;
  }
  return getSmoothSvgPath(stroke.points);
}

export function DrawingLayer({
  strokes,
  currentStroke,
  viewport,
  onNodeRef,
}: {
  strokes: StrokeElement[];
  currentStroke: StrokeElement | null;
  viewport?: Viewport;
  onNodeRef?: (id: string, node: Konva.Node | null) => void;
}) {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const visibleTileKeys = useMemo(() => {
    if (!viewport) return [];
    
    // Debug logging
    // console.log(`[Render] Viewport:`, viewport);
    
    const startX = Math.floor((-viewport.x / viewport.zoom) / TILE_SIZE);
    const startY = Math.floor((-viewport.y / viewport.zoom) / TILE_SIZE);
    const endX = Math.floor(((-viewport.x + viewport.width) / viewport.zoom) / TILE_SIZE);
    const endY = Math.floor(((-viewport.y + viewport.height) / viewport.zoom) / TILE_SIZE);

    const keys: TileKey[] = [];
    // Add buffer tiles
    for (let x = startX - 1; x <= endX + 1; x++) {
        for (let y = startY - 1; y <= endY + 1; y++) {
            keys.push({ x, y });
        }
    }
    return keys;
  }, [viewport?.x, viewport?.y, viewport?.width, viewport?.height, viewport?.zoom]);

  // Query strokes for each visible tile
  const renderedTiles = useMemo(() => {
    return visibleTileKeys.map(key => {
        const tileX = key.x * TILE_SIZE;
        const tileY = key.y * TILE_SIZE;
        
        const found = spatialIndex.query({
            x: tileX,
            y: tileY,
            width: TILE_SIZE,
            height: TILE_SIZE
        });
        
        // Deduplicate strokes that might cross tile boundaries if needed,
        // but here we just render them. React key handles uniqueness.
        const tileStrokes = found;
        
        return (
            <Tile 
                key={`${key.x},${key.y}`}
                x={tileX}
                y={tileY}
                strokes={tileStrokes}
                selectedIds={selectedIds}
                zoom={viewport?.zoom || 1}
                onNodeRef={onNodeRef}
            />
        );
    });
  }, [visibleTileKeys, strokes, selectedIds, viewport?.zoom, onNodeRef]); 

  // Current stroke path generation
  const currentStrokePath = useMemo(() => {
    if (!currentStroke) return null;
    const pathData = getPathData(currentStroke);
    
    return (
      <Path
        data={pathData}
        stroke={currentStroke.color}
        strokeWidth={currentStroke.width}
        dash={currentStroke.strokeStyle === "dashed" ? [10, 10] : currentStroke.strokeStyle === "dotted" ? [5, 5] : undefined}
        opacity={currentStroke.opacity ? currentStroke.opacity / 100 : 1}
        fill={currentStroke.backgroundColor && currentStroke.backgroundColor !== "transparent" ? currentStroke.backgroundColor : undefined}
        lineCap="round"
        lineJoin="round"
        perfectDrawEnabled={false}
        listening={false}
      />
    );
  }, [currentStroke, viewport?.zoom]);

  return (
    <Layer listening={true}>
      {renderedTiles}
      {/* {selectedStrokesLayer} */}
      {currentStrokePath}
    </Layer>
  );
}

// Separate component for each tile to handle its own caching
const Tile = memo(function Tile({ 
    x, 
    y, 
    strokes, 
    selectedIds,
    zoom,
    onNodeRef
}: { 
    x: number;
    y: number;
    strokes: StrokeElement[];
    selectedIds: string[];
    zoom: number;
    onNodeRef?: (id: string, node: Konva.Node | null) => void;
}) {
    const groupRef = useRef<Konva.Group>(null);
    const [debouncedZoom, setDebouncedZoom] = useState(zoom);

    // Debounce zoom updates to prevent constant re-caching during zoom gestures
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedZoom(zoom);
        }, 200);
        return () => clearTimeout(handler);
    }, [zoom]);

    const unselectedStrokes = strokes.filter(s => !selectedIds.includes(s.id));

    const unselectedPaths = useMemo(() => {
        return unselectedStrokes.map(stroke => {
            const pathData = getPathData(stroke);
            return (
              <Path
                key={stroke.id}
                id={stroke.id}
                name="stroke"
                data={pathData}
                stroke={stroke.color}
                strokeWidth={Number.isFinite(stroke.strokeWidth) ? stroke.strokeWidth : (Number.isFinite(stroke.width) && stroke.width < 50 ? stroke.width : 2)}
                dash={stroke.strokeStyle === "dashed" ? [10, 10] : stroke.strokeStyle === "dotted" ? [5, 5] : undefined}
                opacity={stroke.opacity ? stroke.opacity / 100 : 1}
                fill={stroke.backgroundColor && stroke.backgroundColor !== "transparent" ? stroke.backgroundColor : undefined}
                lineCap="round"
                lineJoin="round"
                perfectDrawEnabled={false}
                hitStrokeWidth={15} // Makes thin strokes much easier to click/select
                // ONLY unselected items can be dragged if we allow picking them up directly.
                // But generally, we want them selected first.
                // Let's remove draggable from unselected to prevent weird state,
                // or let the select tool handle it.
                ref={node => { 
                    if (onNodeRef) {
                        onNodeRef(stroke.id, node); 
                    }
                }}
              />
            );
        });
    }, [unselectedStrokes, onNodeRef, debouncedZoom]);
    useEffect(() => {
        if (groupRef.current) {
            // Check if group has content
            const bounds = groupRef.current.getClientRect({ skipTransform: true });
            
            if (bounds.width > 0 && bounds.height > 0) {
                 const padding = 100;
                 // Use devicePixelRatio * zoom to ensure sharp rendering at current zoom level
                 // Cap the pixelRatio to prevent memory issues at very high zoom levels
                 const pixelRatio = Math.min(
                     (window.devicePixelRatio || 1) * debouncedZoom, 
                     5 // Cap at 5x resolution (reasonable limit for most devices)
                 );
                 
                 groupRef.current.cache({
                    x: -padding,
                    y: -padding,
                    width: TILE_SIZE + (padding * 2),
                    height: TILE_SIZE + (padding * 2),
                    pixelRatio
                 });
            }
        }
    }, [unselectedPaths, debouncedZoom]);

    if (strokes.length === 0) return null;

    return (
        <>
            <Group listening={true} x={x} y={y}>
                <Group ref={groupRef}>
                    <Group x={-x} y={-y}>
                        {unselectedPaths}
                    </Group>
                </Group>
            </Group>
            {/* Remove the selectedPaths Group — now handled in SelectionLayer */}
        </>
    );
}, (prev, next) => {
    // Only re-render if strokes change (checking lengths and zoom for simplicity)
    if (prev.zoom !== next.zoom) return false;
    if (prev.x !== next.x || prev.y !== next.y) return false;
    if (prev.strokes.length !== next.strokes.length) return false;
    if (prev.onNodeRef !== next.onNodeRef) return false;
    // Check if stroke or selection references are identical
    if (prev.strokes !== next.strokes) return false;
    
    // If strokes are identical, we only need to re-render if the selection status of any stroke in this tile changed
    const prevSelectedCount = prev.strokes.filter(s => prev.selectedIds.includes(s.id)).length;
    const nextSelectedCount = next.strokes.filter(s => next.selectedIds.includes(s.id)).length;
    
    if (prevSelectedCount !== nextSelectedCount) return false;
    
    // Fallback: If we had selected items and their selection state changed
    const prevSelectedInTile = prev.selectedIds.filter(id => prev.strokes.some(s => s.id === id));
    const nextSelectedInTile = next.selectedIds.filter(id => next.strokes.some(s => s.id === id));
    
    if (prevSelectedInTile.length !== nextSelectedInTile.length) return false;
    for (let i = 0; i < prevSelectedInTile.length; i++) {
        if (prevSelectedInTile[i] !== nextSelectedInTile[i]) return false;
    }
    
    return true;
});
