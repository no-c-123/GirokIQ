import { Layer, Rect, Transformer, Path, Group } from "react-konva";
import { useEffect, useRef } from "react";
import Konva from "konva";
import { getPathData } from "@/core/layers/DrawingLayer";
import type { StrokeElement } from "@/elements/types";

interface SelectionLayerProps {
  selectionRectangle: {
    visible: boolean;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  selectedStrokes: StrokeElement[];
  transformerRef: React.RefObject<Konva.Transformer | null>;
  onNodeRef?: (id: string, node: Konva.Node | null) => void;
  onStrokesChange?: (updates: { id: string; points: number[]; strokeWidth?: number }[]) => void;
}

export function SelectionLayer({
  selectionRectangle,
  selectedStrokes,
  transformerRef,
  onNodeRef,
  onStrokesChange,
}: SelectionLayerProps) {
  
  const groupRef = useRef<Konva.Group>(null);
  const selectedIdsStr = selectedStrokes.map(s => s.id).join(',');

  // Calculate shared origin across all selected strokes 
  let groupMinX = Infinity, groupMinY = Infinity; 
  selectedStrokes.forEach(stroke => { 
    for (let i = 0; i < stroke.points.length; i += 2) { 
      groupMinX = Math.min(groupMinX, stroke.points[i]); 
      groupMinY = Math.min(groupMinY, stroke.points[i + 1]); 
    } 
  }); 

  // If no strokes, default to 0 to avoid NaNs
  if (groupMinX === Infinity) {
    groupMinX = 0;
    groupMinY = 0;
  }

  useEffect(() => {
    if (!transformerRef.current) return;
    
    // Select the group if we have selected strokes
    const nodes = (selectedStrokes.length > 0 && groupRef.current) 
      ? [groupRef.current] 
      : [];
      
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIdsStr, selectedStrokes.length]);

  const handleTransformEnd = () => {
    if (!groupRef.current || !onStrokesChange) return;
    
    const group = groupRef.current;
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    const rotation = group.rotation();
    const groupX = group.x(); // this is groupMinX + any translation
    const groupY = group.y();

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const updates = selectedStrokes.map(stroke => {
       const newPoints: number[] = [];
       
       for(let i=0; i<stroke.points.length; i+=2) {
          // Points relative to group origin (groupMinX, groupMinY)
          const relX = (stroke.points[i] - groupMinX) * scaleX;
          const relY = (stroke.points[i+1] - groupMinY) * scaleY;
          
          // Apply rotation around group origin
          const rotX = relX * cos - relY * sin;
          const rotY = relX * sin + relY * cos;
          
          // Translate back to world space using group's current position
          newPoints.push(
            Number.isFinite(rotX + groupX) ? rotX + groupX : stroke.points[i],
            Number.isFinite(rotY + groupY) ? rotY + groupY : stroke.points[i + 1]
          );
       }
       
       const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
       const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
       const originalStrokeWidth = Number.isFinite(stroke.strokeWidth) && stroke.strokeWidth > 0 
         ? stroke.strokeWidth : 2;
       
       return {
         id: stroke.id,
         points: newPoints,
         strokeWidth: originalStrokeWidth * safeScale
       };
    });

    // Reset group transform BEFORE triggering re-render
    group.scaleX(1);
    group.scaleY(1);
    group.rotation(0);
    // Don't reset x/y — React will reposition from new groupMinX/Y on next render
    
    onStrokesChange(updates);
  };

  return (
    <Layer>
      {/* Group all selected strokes so they move/transform together */}
      {selectedStrokes.length > 0 && (
        <Group
          ref={groupRef}
          x={groupMinX}
          y={groupMinY}
          draggable
          onDragEnd={handleTransformEnd}
          onTransformEnd={handleTransformEnd}
        >
          {selectedStrokes.map(stroke => {
            const offsetStroke = {
              ...stroke,
              points: stroke.points.map((p, i) => i % 2 === 0 ? p - groupMinX : p - groupMinY)
            };

            const pathData = getPathData(offsetStroke);
            return (
              <Path
                key={stroke.id}
                id={stroke.id}
                name="stroke"
                // Position is 0,0 relative to Group
                x={0}
                y={0}
                data={pathData}
                stroke={stroke.color}
                strokeWidth={Number.isFinite(stroke.strokeWidth) ? stroke.strokeWidth : 2}
                dash={stroke.strokeStyle === "dashed" ? [10, 10] : stroke.strokeStyle === "dotted" ? [5, 5] : undefined}
                opacity={stroke.opacity ? stroke.opacity / 100 : 1}
                fill={stroke.backgroundColor && stroke.backgroundColor !== "transparent" ? stroke.backgroundColor : undefined}
                lineCap="round"
                lineJoin="round"
                perfectDrawEnabled={false}
                hitStrokeWidth={15}
                // Individual strokes are NOT draggable, the Group is
                draggable={false}
                ref={node => {
                  if (onNodeRef) onNodeRef(stroke.id, node);
                }}
              />
            );
          })}
        </Group>
      )}

      {/* Single transformer for the Group */}
      <Transformer
        ref={transformerRef}

        keepRatio={false}
        shiftBehavior="inverted"  // hold shift TO keep ratio, default is free resize
        boundBoxFunc={(oldBox, newBox) => {
          if (
            newBox.width < 5 || newBox.height < 5 ||
            !Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)
          ) {
            return oldBox;
          }
          return newBox;
        }}
      />

      {/* Selection rectangle */}
      {selectionRectangle.visible && 
       Number.isFinite(selectionRectangle.x1) && 
       Number.isFinite(selectionRectangle.y1) && 
       Number.isFinite(selectionRectangle.x2) && 
       Number.isFinite(selectionRectangle.y2) && (
        <Rect
          x={Math.min(selectionRectangle.x1, selectionRectangle.x2)}
          y={Math.min(selectionRectangle.y1, selectionRectangle.y2)}
          width={Math.abs(selectionRectangle.x2 - selectionRectangle.x1)}
          height={Math.abs(selectionRectangle.y2 - selectionRectangle.y1)}
          fill="rgba(0,0,255,0.2)"
          stroke="rgba(0,0,255,0.5)"
          strokeWidth={1}
          listening={false}
        />
      )}
    </Layer>
  );
}
