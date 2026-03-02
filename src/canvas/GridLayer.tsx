import { Layer, Line } from "react-konva";
import { memo } from "react";

export const GridLayer = memo(function GridLayer({
  width,
  height,
  minX = 0,
  minY = 0,
  gridSize = 40,
}: {
  width: number;
  height: number;
  minX?: number;
  minY?: number;
  gridSize?: number;
}) {
  const startX = Math.floor(minX / gridSize) * gridSize;
  const startY = Math.floor(minY / gridSize) * gridSize;
  
  const verticalLineCount = Math.ceil((width) / gridSize) + 1;
  const horizontalLineCount = Math.ceil((height) / gridSize) + 1;

  return (
    <Layer listening={false} opacity={0.12}>
      {Array.from({ length: verticalLineCount + 1 }, (_, index) => {
        const x = startX + index * gridSize;
        return (
          <Line
            key={`v-${x}`}
            points={[x, minY, x, minY + height]}
            stroke="#ffffff"
            strokeWidth={1}
          />
        );
      })}

      {Array.from({ length: horizontalLineCount + 1 }, (_, index) => {
        const y = startY + index * gridSize;
        return (
          <Line
            key={`h-${y}`}
            points={[minX, y, minX + width, y]}
            stroke="#ffffff"
            strokeWidth={1}
          />
        );
      })}
    </Layer>
  );
});
