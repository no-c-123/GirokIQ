import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { Stage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Minus, Plus } from "lucide-react";
import { generateId } from "@/utils";
import { useShapeSnapping } from "@/hooks/useShapeSnapping";
import type { RecognizedShape } from "@/core/ShapeRecognizer";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useUIStore } from "@/stores/useUIStore";
import { useBlockStore } from "@/stores/useBlockStore";
import { useHistoryStore } from "@/history/useHistoryStore";
import { useAppStore } from "@/store/useAppStore";
import { DrawingLayer } from "@/core/layers/DrawingLayer";
import { GridLayer } from "@/core/layers/GridLayer";
import { ImageLayer } from "@/core/layers/ImageLayer";
import { SelectionLayer } from "@/core/layers/SelectionLayer";
import { useImagePaste } from "@/hooks/useImagePaste";
import { SelectionOverlay } from "@/ui/overlays/SelectionOverlay";

import Konva from "konva";
import type { StrokeElement } from "@/elements/types";
import { spatialIndex } from "@/spatial/SpatialIndex";

import { useSelectionStore } from "@/stores/useSelectionStore";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;
const ZOOM_ANIMATION_MS = 200;
const ERASE_RADIUS = 10;

export default function CanvasArea({
  children,
  onDoubleClickPage,
}: {
  children?: ReactNode;
  onDoubleClickPage?: (pageId: string, x: number, y: number) => void;
}) {
  const activePageId = useAppStore((s) => s.activePageId);
  const pages = useAppStore((s) => s.pages);
  const activePage = useMemo(() => pages.find((p) => p.id === activePageId), [pages, activePageId]);
  
  const rawPattern = activePage?.settings?.grid;
  // Handle legacy "dotted" which was drawing squares
  const gridPattern = (rawPattern === "dotted" ? "squares" : (rawPattern || "squares")) as any;

  const selectBlock = useBlockStore((s) => s.selectBlock);
  const updateBlocks = useBlockStore((s) => s.updateBlocks);
  const updateBlockSize = useBlockStore((s) => s.updateBlockSize);
  const blocks = useBlockStore((s) => s.blocks);
  const historyPush = useHistoryStore((s) => s.push);
  
  const elements = useCanvasStore((s) => s.elements);
  const addElement = useCanvasStore((s) => s.addElement);
  const removeElement = useCanvasStore((s) => s.removeElement);
  // const updateElement = useCanvasStore((s) => s.updateElement);
  const updateElements = useCanvasStore((s) => s.updateElements);
  const loadStrokesForPage = useCanvasStore((s) => s.loadStrokesForPage);

  const strokes = useMemo(() => elements.filter((e): e is StrokeElement => e.type === 'stroke'), [elements]);

  const tool = useUIStore((s) => s.tool);
  const strokeWidth = useUIStore((s) => s.strokeWidth);
  const color = useUIStore((s) => s.color);
  const strokeStyle = useUIStore((s) => s.strokeStyle);
  const opacity = useUIStore((s) => s.opacity);

  // Theme aware colors - we need to listen to theme changes
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    // Initial check
    checkTheme();
    
    // Observer for class changes on html element
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const gridColor = isDark ? "#3f3f46" : "#d4d4d8"; // Dark: zinc-700, Light: zinc-300
  const backgroundColor = isDark ? "#09090b" : "#ffffff"; // Dark: zinc-950, Light: white
  const gridOpacity = isDark ? 0.3 : 0.4;
  
  // TODO: Migrate these to proper stores
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);
  const selectionFilter = { images: true, text: true, strokes: true }; 
  
  const updateStrokes = async (updates: { id: string; points: number[] }[]) => {
      updateElements(updates.map(u => ({ id: u.id, changes: { points: u.points } })));
  };

  const eraseAtPoint = (pageId: string, point: { x: number; y: number }) => {
    const eraseRadiusSquared = ERASE_RADIUS * ERASE_RADIUS;
    
    // Use spatial index for fast querying
    const candidates = spatialIndex.query({
        x: point.x - ERASE_RADIUS,
        y: point.y - ERASE_RADIUS,
        width: ERASE_RADIUS * 2,
        height: ERASE_RADIUS * 2
    });

    const strokeToErase = candidates.find((stroke) => {
      if (stroke.pageId !== pageId) return false;
      for (let index = 0; index < stroke.points.length; index += 2) {
        const dx = stroke.points[index] - point.x;
        const dy = stroke.points[index + 1] - point.y;
        if (dx * dx + dy * dy <= eraseRadiusSquared) return true;
      }
      return false;
    });

    if (strokeToErase) {
      removeElement(strokeToErase.id);
      return strokeToErase;
    }
    return null;
  };


  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const viewAnimationTimeoutRef = useRef<number | null>(null);
  const isPointerDownRef = useRef(false);
  const isErasingRef = useRef(false);
  const isGestureRef = useRef(false);
  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const lastPanPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastGestureCenterRef = useRef<{ x: number; y: number } | null>(null);
  const lastGestureDistanceRef = useRef<number | null>(null);
  const activePenPointerIdRef = useRef<number | null>(null);
  const isPenActiveRef = useRef(false);
  const [selectionRectangle, setSelectionRectangle] = useState({ 
    visible: false, 
    x1: 0, 
    y1: 0, 
    x2: 0, 
    y2: 0, 
  }); 
  
  const isSelecting = useRef(false); 
  const transformerRef = useRef<Konva.Transformer>(null); 
  const rectRefs = useRef(new Map<string, Konva.Node>()); 

  const [tempStroke, setTempStroke] = useState<any | null>(null);
  const tempStrokeRef = useRef<any | null>(null);
  const tempPointsRef = useRef<number[]>([]);

  const [stageSize, setStageSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [view, setView] = useState(() => ({
     zoom: 1,
     position: { x: 0, y: 0 },
     animate: false,
   }));

   // Use the new image paste hook
   useImagePaste(stageSize, view);

    const onSnapShape = useCallback((shape: RecognizedShape) => {
        const shapePoints = shape.points.flatMap(p => [p.x, p.y]);
        
        // Update temp stroke to show the snapped shape
        setTempStroke((prev: any) => {
            if (!prev) return null;
            return {
                ...prev,
                points: shapePoints,
                shapeType: shape.type
            };
        });
    }, []);

    const onCancelSnap = useCallback(() => {
        // Revert to raw points if user continues drawing
        const rawPoints = tempPointsRef.current;
        setTempStroke((prev: any) => {
            if (!prev) return null;
            const { shapeType, ...rest } = prev;
            return {
                ...rest,
                points: [...rawPoints]
            };
        });
    }, []);

    const snapHook = useShapeSnapping({
        onSnap: onSnapShape,
        onCancel: onCancelSnap,
        enabled: useUIStore((s) => s.shapeRecognitionEnabled)
    });






  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const nextWidth = element.clientWidth;
      const nextHeight = element.clientHeight;
      if (nextWidth <= 0 || nextHeight <= 0) return;
      
      const nextStageSize = {
        width: nextWidth,
        height: nextHeight,
      };
      setStageSize(nextStageSize);
      setView((prev) => ({
        ...prev,
        position: constrainPosition(prev.position, prev.zoom, nextStageSize),
      }));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (viewAnimationTimeoutRef.current) {
        window.clearTimeout(viewAnimationTimeoutRef.current);
        viewAnimationTimeoutRef.current = null;
      }
    };
  }, []);

  const baseScale = 1;
  const stageScale = view.zoom;

  const pageStrokes = useMemo(
    () => (activePageId ? strokes.filter((stroke) => stroke.pageId === activePageId) : []),
    [strokes, activePageId],
  );

  const pageCurrentStroke = tempStroke;

  const selectedStrokes = useMemo(
    () => selectedIds.map(id => strokes.find(s => s.id === id)).filter((s): s is StrokeElement => s !== undefined),
    [selectedIds, strokes]
  );

  const selectedBlocks = useMemo(
    () => selectedIds.map(id => blocks.find(b => b.id === id)).filter((b) => b !== undefined),
    [selectedIds, blocks]
  );

  const deleteBlock = useBlockStore((s) => s.deleteBlock);

  const handleDeleteSelected = useCallback(() => {
    selectedStrokes.forEach(s => removeElement(s.id));
    selectedBlocks.forEach(b => deleteBlock(b.id));
    setSelectedIds([]);
    useSelectionStore.getState().clearSelection();
  }, [selectedStrokes, selectedBlocks, removeElement, deleteBlock, setSelectedIds]);

  useEffect(() => {
    if (!activePageId) return;
    void loadStrokesForPage(activePageId);
  }, [activePageId, loadStrokesForPage]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const clampLocal = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const zoomAtLocal = (
      anchor: { x: number; y: number },
      nextZoom: number,
      prev: { zoom: number; position: { x: number; y: number } },
    ) => {
      const nextClampedZoom = clampLocal(nextZoom, ZOOM_MIN, ZOOM_MAX);
      const prevScale = baseScale * prev.zoom;
      const nextScale = baseScale * nextClampedZoom;
      const worldX = (anchor.x - prev.position.x) / prevScale;
      const worldY = (anchor.y - prev.position.y) / prevScale;
      const nextPosition = {
        x: anchor.x - worldX * nextScale,
        y: anchor.y - worldY * nextScale,
      };
      return {
        zoom: nextClampedZoom,
        position: constrainPosition(nextPosition, nextClampedZoom, stageSize),
      };
    };

    const setAnimatedViewLocal = (
      updater: (prev: { zoom: number; position: { x: number; y: number }; animate: boolean }) => {
        zoom: number;
        position: { x: number; y: number };
        animate: boolean;
      },
    ) => {
      setView((prev) => {
        const next = updater(prev);
        return { ...next, animate: true };
      });
      if (viewAnimationTimeoutRef.current) {
        window.clearTimeout(viewAnimationTimeoutRef.current);
      }
      viewAnimationTimeoutRef.current = window.setTimeout(() => {
        setView((prev) => ({ ...prev, animate: false }));
        viewAnimationTimeoutRef.current = null;
      }, ZOOM_ANIMATION_MS);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      // Space key for panning mode
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        if (viewportRef.current) viewportRef.current.style.cursor = "grab";
        return;
      }

      // Arrow keys for panning or moving selection
      const panStep = e.shiftKey ? 200 : 50;
      const moveStep = e.shiftKey ? 10 : 1;

      // If selection is active, move selection with Modifier keys (Cmd/Ctrl)
      const isMoveModifier = e.metaKey || e.ctrlKey;
      
      if (selectedIds.length > 0 && isMoveModifier) {
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -moveStep;
        if (e.key === "ArrowRight") dx = moveStep;
        if (e.key === "ArrowUp") dy = -moveStep;
        if (e.key === "ArrowDown") dy = moveStep;

        if (dx !== 0 || dy !== 0) {
            e.preventDefault();
            
            // Move strokes
            const strokeUpdates = selectedIds
                .map(id => {
                    const s = strokes.find(st => st.id === id) || spatialIndex.get(id);
                    if (!s) return null;
                    return {
                        id,
                        points: s.points.map((p, i) => i % 2 === 0 ? p + dx : p + dy)
                    };
                })
                .filter((u): u is { id: string; points: number[] } => u !== null);
            
            if (strokeUpdates.length > 0) void updateStrokes(strokeUpdates);

            // Move blocks
            const blockUpdates = selectedIds
                .map(id => {
                    const b = useBlockStore.getState().blocks.find(bl => bl.id === id);
                    if (!b) return null;
                    return { id, x: b.x + dx, y: b.y + dy };
                })
                .filter((u): u is { id: string; x: number; y: number } => u !== null);
            
            if (blockUpdates.length > 0) void updateBlocks(blockUpdates);
            
            return;
        }
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setView((prev) => ({
          ...prev,
          position: { ...prev.position, x: prev.position.x + panStep },
        }));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setView((prev) => ({
          ...prev,
          position: { ...prev.position, x: prev.position.x - panStep },
        }));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setView((prev) => ({
          ...prev,
          position: { ...prev.position, y: prev.position.y + panStep },
        }));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setView((prev) => ({
          ...prev,
          position: { ...prev.position, y: prev.position.y - panStep },
        }));
      }

      if (!(e.metaKey || e.ctrlKey)) return;

      const key = e.key;
      if (key === "+" || key === "=") {
        e.preventDefault();
        const anchor = { x: stageSize.width / 2, y: stageSize.height / 2 };
        setAnimatedViewLocal((prev) => {
          const next = zoomAtLocal(anchor, prev.zoom * 1.1, prev);
          return { ...prev, ...next };
        });
      }
      if (key === "-" || key === "_") {
        e.preventDefault();
        const anchor = { x: stageSize.width / 2, y: stageSize.height / 2 };
        setAnimatedViewLocal((prev) => {
          const next = zoomAtLocal(anchor, prev.zoom / 1.1, prev);
          return { ...prev, ...next };
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        isPanningRef.current = false;
        
        // Restore cursor
        if (viewportRef.current) {
          if (["pen", "eraser", "lasso", "rectangle", "diamond", "ellipse", "arrow", "line"].includes(tool)) {
            viewportRef.current.style.cursor = "crosshair";
          } else if (tool === "text") {
            viewportRef.current.style.cursor = "text";
          } else {
            viewportRef.current.style.cursor = "default";
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [stageSize, baseScale, tool]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (["pen", "eraser", "lasso", "rectangle", "diamond", "ellipse", "arrow", "line"].includes(tool)) {
      viewport.style.cursor = "crosshair";
    } else if (tool === "text") {
      viewport.style.cursor = "text";
    } else {
      viewport.style.cursor = "default";
    }
  }, [tool]);

  if (!activePageId) return null;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const getContainerPoint = (evt: { clientX: number; clientY: number }) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const getStagePoint = (containerPoint: { x: number; y: number }, zoom: number, position: { x: number; y: number }) => {
    const scale = baseScale * zoom;
    return {
      x: (containerPoint.x - position.x) / scale,
      y: (containerPoint.y - position.y) / scale,
    };
  };

  const zoomAt = (
    anchor: { x: number; y: number },
    nextZoom: number,
    prev: { zoom: number; position: { x: number; y: number } },
  ) => {
    const nextClampedZoom = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
    const prevScale = baseScale * prev.zoom;
    const nextScale = baseScale * nextClampedZoom;
    const worldX = (anchor.x - prev.position.x) / prevScale;
    const worldY = (anchor.y - prev.position.y) / prevScale;
    const nextPosition = {
      x: anchor.x - worldX * nextScale,
      y: anchor.y - worldY * nextScale,
    };
    return {
      zoom: nextClampedZoom,
      position: constrainPosition(nextPosition, nextClampedZoom, stageSize),
    };
  };

  const setAnimatedView = (updater: (prev: typeof view) => typeof view) => {
    setView((prev) => {
      const next = updater(prev);
      return { ...next, animate: true };
    });
    if (viewAnimationTimeoutRef.current) {
      window.clearTimeout(viewAnimationTimeoutRef.current);
    }
    viewAnimationTimeoutRef.current = window.setTimeout(() => {
      setView((prev) => ({ ...prev, animate: false }));
      viewAnimationTimeoutRef.current = null;
    }, ZOOM_ANIMATION_MS);
  };

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    //e.evt.preventDefault();
    if (isGestureRef.current) return;

    // Must be first — walk full parent chain to detect transformer anchors
    let tNode: Konva.Node | null = e.target;
    while (tNode) {
      if (tNode.getClassName() === 'Transformer') {
        isSelecting.current = false;
        return;
      }
      tNode = tNode.getParent ? tNode.getParent() : null;
    }

    // Only preventDefault for non-transformer interactions 
    e.evt.preventDefault();

    // Check for space key or middle mouse button (button 1) or hand tool
    if (isSpacePressedRef.current || e.evt.button === 1 || tool === "hand") {
      isPanningRef.current = true;
      lastPanPositionRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      if (viewportRef.current) viewportRef.current.style.cursor = "grabbing";
      return;
    }

    isPointerDownRef.current = true;
    pointerDownTimeRef.current = Date.now();

    const containerPoint = getContainerPoint(e.evt);
    if (!containerPoint) return;
    const localPoint = getStagePoint(containerPoint, view.zoom, view.position);

    if ((tool as any) === "select") {
      isSelecting.current = true;
      setSelectionRectangle({
        visible: true,
        x1: localPoint.x,
        y1: localPoint.y,
        x2: localPoint.x,
        y2: localPoint.y,
      });

      if (e.target === e.target.getStage()) {
        setSelectedIds([]);
        useSelectionStore.getState().clearSelection();
      } else {
        const clickedId = e.target.id();
        if (clickedId && (strokes.some(s => s.id === clickedId) || useBlockStore.getState().blocks.some(b => b.id === clickedId))) {
          const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
          const isSelected = selectedIds.includes(clickedId);
          if (!metaPressed && !isSelected) {
            setSelectedIds([clickedId]);
          } else if (metaPressed && isSelected) {
            setSelectedIds(selectedIds.filter(id => id !== clickedId));
          } else if (metaPressed && !isSelected) {
            setSelectedIds([...selectedIds, clickedId]);
          }
        }
      }
      return;
    }

    selectBlock(null);
    useSelectionStore.getState().clearSelection();

    if (tool === "eraser") {
      if ((e.evt as any).pointerType === "pen") {
        activePenPointerIdRef.current = (e.evt as any).pointerId ?? null;
        isPenActiveRef.current = true;
      } else if (isPenActiveRef.current) {
        return;
      }
      
      isErasingRef.current = true;
      const erased = eraseAtPoint(activePageId, localPoint);
      if (erased) historyPush({ type: "DELETE_STROKE", stroke: erased });
      return;
    }

    const isDrawingTool = ["pen", "rectangle", "diamond", "ellipse", "arrow", "line"].includes(tool);
    if (!isDrawingTool) return;
    
    // Palm rejection: if pen was recently used, ignore touch
    if ((e.evt as any).pointerType === "pen") {
      activePenPointerIdRef.current = (e.evt as any).pointerId ?? null;
      isPenActiveRef.current = true;
    } else if (isPenActiveRef.current) {
      // Ignore touch if pen is active
      return;
    }

    const initialPressure = (e.evt as PointerEvent).pressure !== undefined ? (e.evt as PointerEvent).pressure : 0.5;

    const stroke = {
      id: generateId(),
      pageId: activePageId,
      points: [localPoint.x, localPoint.y],
      color,
      strokeWidth,
      width: 0,
      height: 0,
      x: localPoint.x,
      y: localPoint.y,
      pressures: [initialPressure],
      shapeType: tool === "pen" ? undefined : tool,
      strokeStyle,
      opacity,
    } as StrokeElement;

    setTempStroke(stroke);
    tempStrokeRef.current = stroke;
    tempPointsRef.current = [localPoint.x, localPoint.y];
  };

  const getShapePoints = (tool: string, startX: number, startY: number, endX: number, endY: number): number[] => {
      if (tool === "line" || tool === "arrow") {
          return [startX, startY, endX, endY];
      }
      if (tool === "rectangle") {
          return [startX, startY, endX, startY, endX, endY, startX, endY, startX, startY];
      }
      if (tool === "diamond") {
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          return [midX, startY, endX, midY, midX, endY, startX, midY, midX, startY];
      }
      if (tool === "ellipse") {
          // Store bounding box points
          return [startX, startY, endX, endY];
      }
      return [startX, startY];
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    // Don't interfere if transformer is active
    let tNode: Konva.Node | null = e.target;
    while (tNode) {
      if (tNode.getClassName() === 'Transformer') {
        isSelecting.current = false;
        return;
      }
      tNode = tNode.getParent ? tNode.getParent() : null;
    }

    if ((tool as any) === "select" && isSelecting.current) {
      const containerPoint = getContainerPoint(e.evt);
      if (!containerPoint) return;
      const localPoint = getStagePoint(containerPoint, view.zoom, view.position);
      setSelectionRectangle(prev => ({
        ...prev,
        x2: localPoint.x,
        y2: localPoint.y,
      }));
      return;
    }

    e.evt.preventDefault();
    if (isGestureRef.current) return;
    if (isPenActiveRef.current && (e.evt as any).pointerType !== "pen") return;

    if (isPanningRef.current && lastPanPositionRef.current) {
      const dx = e.evt.clientX - lastPanPositionRef.current.x;
      const dy = e.evt.clientY - lastPanPositionRef.current.y;
      lastPanPositionRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      setView((prev) => ({
        ...prev,
        position: { x: prev.position.x + dx, y: prev.position.y + dy },
      }));
      return;
    }

    const containerPoint = getContainerPoint(e.evt);
    if (!containerPoint) return;
    const localPoint = getStagePoint(containerPoint, view.zoom, view.position);

    if (isErasingRef.current && tool === "eraser") {
      const erased = eraseAtPoint(activePageId, localPoint);
      if (erased) historyPush({ type: "DELETE_STROKE", stroke: erased });
      return;
    }

    const isDrawingTool = ["pen", "rectangle", "diamond", "ellipse", "arrow", "line"].includes(tool);
    if (!isDrawingTool) return;
    if (!tempStrokeRef.current) return;

    if (tool !== "pen") {
      const startX = tempPointsRef.current[0];
      const startY = tempPointsRef.current[1];
      const newPoints = getShapePoints(tool, startX, startY, localPoint.x, localPoint.y);
      setTempStroke((prev: any) => {
        if (!prev) return null;
        return { ...prev, points: newPoints };
      });
      return;
    }

    const rawEvents = (e.evt as any).getCoalescedEvents
      ? (e.evt as any).getCoalescedEvents()
      : [e.evt];

    const newPoints: number[] = [];
    const newPressures: number[] = [];
    for (const evt of rawEvents) {
      const cp = getContainerPoint(evt);
      if (!cp) continue;
      const lp = getStagePoint(cp, view.zoom, view.position);
      const pressure = evt.pressure !== undefined ? evt.pressure : 0.5;

      if (tempPointsRef.current.length >= 2) {
        const lastX = tempPointsRef.current[tempPointsRef.current.length - 2];
        const lastY = tempPointsRef.current[tempPointsRef.current.length - 1];
        const dx = lp.x - lastX;
        const dy = lp.y - lastY;
        if (dx * dx + dy * dy < 0.25) continue;
      } else if (newPoints.length >= 2) {
        const lastX = newPoints[newPoints.length - 2];
        const lastY = newPoints[newPoints.length - 1];
        const dx = lp.x - lastX;
        const dy = lp.y - lastY;
        if (dx * dx + dy * dy < 0.25) continue;
      }
      newPoints.push(lp.x, lp.y);
      newPressures.push(pressure);
      tempPointsRef.current.push(lp.x, lp.y);
    }

    if (newPoints.length > 0) {
      snapHook.handleMove(tempPointsRef.current);
      if (!snapHook.isSnapping) {
        setTempStroke((prev: any) => {
          if (!prev) return null;
          return { 
            ...prev, 
            points: [...tempPointsRef.current],
            pressures: [...(prev.pressures || []), ...newPressures]
          };
        });
      }
    }
  };

  const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
    // Don't interfere if transformer is active
    let tNode: Konva.Node | null = e.target;
    while (tNode) {
      if (tNode.getClassName() === 'Transformer') return;
      tNode = tNode.getParent ? tNode.getParent() : null;
    }

    isPointerDownRef.current = false;
    if (activePenPointerIdRef.current !== null && (e.evt as any).pointerId === activePenPointerIdRef.current) {
      activePenPointerIdRef.current = null;
      // Palm rejection timeout: keep ignoring touches for 1s after pen lifts
      setTimeout(() => {
        isPenActiveRef.current = false;
      }, 1000);
    }

    if (isSelecting.current) {
      isSelecting.current = false;
      setTimeout(() => {
        setSelectionRectangle(prev => ({ ...prev, visible: false }));
      });

      const selBox = {
        x: Math.min(selectionRectangle.x1, selectionRectangle.x2),
        y: Math.min(selectionRectangle.y1, selectionRectangle.y2),
        width: Math.abs(selectionRectangle.x2 - selectionRectangle.x1),
        height: Math.abs(selectionRectangle.y2 - selectionRectangle.y1),
      };

      if (selBox.width > 0 && selBox.height > 0) {
        const selected: string[] = [];
        if (selectionFilter.strokes) {
          for (const stroke of pageStrokes) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < stroke.points.length; i += 2) {
              minX = Math.min(minX, stroke.points[i]);
              minY = Math.min(minY, stroke.points[i + 1]);
              maxX = Math.max(maxX, stroke.points[i]);
              maxY = Math.max(maxY, stroke.points[i + 1]);
            }
            const strokeBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            if (!(
              strokeBox.x > selBox.x + selBox.width ||
              strokeBox.x + strokeBox.width < selBox.x ||
              strokeBox.y > selBox.y + selBox.height ||
              strokeBox.y + strokeBox.height < selBox.y
            )) {
              selected.push(stroke.id);
            }
          }
        }

        // Add blocks (images, text) to selection
        const pageBlocks = blocks.filter(b => b.pageId === activePageId);
        for (const block of pageBlocks) {
          if ((block.type === 'image' && selectionFilter.images) || 
              (block.type === 'text' && selectionFilter.text)) {
            const blockBox = { 
              x: block.x, 
              y: block.y, 
              width: block.width || 100, 
              height: block.height || 50 
            };
            if (!(
              blockBox.x > selBox.x + selBox.width ||
              blockBox.x + blockBox.width < selBox.x ||
              blockBox.y > selBox.y + selBox.height ||
              blockBox.y + blockBox.height < selBox.y
            )) {
              selected.push(block.id);
            }
          }
        }

        setSelectedIds(selected);
      }
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (viewportRef.current) {
        if (isSpacePressedRef.current) {
          viewportRef.current.style.cursor = "grab";
        } else if (["pen", "eraser", "lasso", "rectangle", "diamond", "ellipse", "arrow", "line"].includes(tool)) {
          viewportRef.current.style.cursor = "crosshair";
        } else if (tool === "text") {
          viewportRef.current.style.cursor = "text";
        } else {
          viewportRef.current.style.cursor = "default";
        }
      }
      return;
    }

    if (tempStrokeRef.current) {
      const current = tempStrokeRef.current;
      let finalPoints = [...tempPointsRef.current];
      let finalShapeType: string | undefined = current.shapeType;
      let finalOriginalPoints: number[] | undefined;

      const snapped = snapHook.getSnappedShape();
      if (snapped) {
        finalPoints = snapped.points.flatMap((p: { x: number; y: number }) => [p.x, p.y]);
        finalShapeType = snapped.type;
        finalOriginalPoints = [...tempPointsRef.current];
      }

      snapHook.cancelSnap();

      if (current.pageId !== "lasso") {
        const finalStroke: StrokeElement = {
          ...(current as any),
          points: finalPoints,
          shapeType: finalShapeType,
          originalPoints: finalOriginalPoints,
          type: "stroke",
        };
        addElement(finalStroke);
        historyPush({ type: "ADD_STROKE", stroke: finalStroke });
      }

      setTempStroke(null);
      tempStrokeRef.current = null;
      tempPointsRef.current = [];
    }

    isPointerDownRef.current = false;
    isErasingRef.current = false;
  };

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.on('transformend', (e) => {
      console.log('STAGE transformend:', e.target?.getClassName(), e.target?.id());
    });
  }, []);

  useEffect(() => {
    if (transformerRef.current) {
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [view.zoom]);

  const handleStrokesChange = useCallback((updates: { id: string; points: number[]; strokeWidth?: number }[]) => {
    updateElements(updates.map(u => ({
      id: u.id,
      changes: {
        points: u.points,
        strokeWidth: u.strokeWidth
      }
    })));
  }, [updateElements]);

  const handleBlocksChange = useCallback((updates: { id: string; x: number; y: number; width?: number; height?: number }[]) => {
    const posUpdates = updates.map(u => ({ id: u.id, x: u.x, y: u.y }));
    if (posUpdates.length > 0) {
      updateBlocks(posUpdates);
    }
    
    updates.forEach(u => {
      if (u.width !== undefined && u.height !== undefined) {
        updateBlockSize(u.id, u.width, u.height);
      }
    });
  }, [updateBlocks, updateBlockSize]);

  const handleNodeRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      rectRefs.current.set(id, node);
    } else {
      rectRefs.current.delete(id);
    }
  }, []);

  const viewportConfig = useMemo(() => ({
    x: view.position.x,
    y: view.position.y,
    width: stageSize.width,
    height: stageSize.height,
    zoom: view.zoom,
  }), [view.position.x, view.position.y, stageSize.width, stageSize.height, view.zoom]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ backgroundColor }}>
      <div
        ref={viewportRef}
        className="relative w-full h-full overflow-hidden"
        style={{ touchAction: "none" }}
        /*onMouseDown={(e) => {
          if (e.target instanceof HTMLElement && e.target.closest("textarea")) {
            return;
          }
          if (e.target instanceof HTMLElement && e.target.closest("[data-canvas-ui]")) {
            return;
          }
          selectBlock(null);
        }}*/
        onDoubleClick={(e) => {
          if (!onDoubleClickPage) return;
          if (!activePageId) return;
          if (tool !== "text") return;
          if (e.target instanceof HTMLElement && e.target.closest("textarea")) {
            return;
          }
          if (e.target instanceof HTMLElement && e.target.closest("[data-canvas-ui]")) {
            return;
          }
          const anchor = getContainerPoint(e);
          if (!anchor) return;
          const point = getStagePoint(anchor, view.zoom, view.position);
          onDoubleClickPage(activePageId, point.x, point.y);
        }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          x={view.position.x}
          y={view.position.y}
          scaleX={stageScale}
          scaleY={stageScale}
          draggable={false}
          onWheel={(e) => {
            e.evt.preventDefault();

            const anchor = getContainerPoint(e.evt);
            if (!anchor) return;

            // Pinch gesture (trackpad) or Ctrl + Wheel (mouse)
            if (e.evt.ctrlKey) {
              const scaleBy = 1.02;
              const direction = e.evt.deltaY > 0 ? 1 / scaleBy : scaleBy;
              
              setAnimatedView((prev) => {
                const next = zoomAt(anchor, prev.zoom * direction, prev);
                return { ...prev, ...next, animate: false };
              });
            } else {
              // Normal scroll/trackpad movement -> Pan
              setView((prev) => ({
                ...prev,
                position: {
                  x: prev.position.x - e.evt.deltaX,
                  y: prev.position.y - e.evt.deltaY,
                },
                animate: false,
              }));
            }
          }}
          onTouchStart={(e) => {
            if (isPenActiveRef.current) return;
            if (e.evt.touches.length !== 2) {
              isGestureRef.current = false;
              lastGestureCenterRef.current = null;
              lastGestureDistanceRef.current = null;
              return;
            }

            e.evt.preventDefault();
            isGestureRef.current = true;

            const rect = viewportRef.current?.getBoundingClientRect();
            if (!rect) return;

            const [t1, t2] = Array.from(e.evt.touches);
            const center = {
              x: (t1.clientX + t2.clientX) / 2 - rect.left,
              y: (t1.clientY + t2.clientY) / 2 - rect.top,
            };
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            lastGestureCenterRef.current = center;
            lastGestureDistanceRef.current = Math.hypot(dx, dy);
          }}
          onTouchMove={(e) => {
            if (isPenActiveRef.current) return;
            if (e.evt.touches.length !== 2) return;
            e.evt.preventDefault();

            const rect = viewportRef.current?.getBoundingClientRect();
            if (!rect) return;

            const [t1, t2] = Array.from(e.evt.touches);
            const nextCenter = {
              x: (t1.clientX + t2.clientX) / 2 - rect.left,
              y: (t1.clientY + t2.clientY) / 2 - rect.top,
            };
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            const nextDistance = Math.hypot(dx, dy);

            const prevCenter = lastGestureCenterRef.current;
            const prevDistance = lastGestureDistanceRef.current;

            setView((prev) => {
              let nextPosition = prev.position;
              if (prevCenter) {
                nextPosition = {                
                  x: nextPosition.x + (nextCenter.x - prevCenter.x),
                  y: nextPosition.y + (nextCenter.y - prevCenter.y),
                };
              }

              let nextZoom = prev.zoom;
              if (prevDistance) {
                const ratio = nextDistance / prevDistance;
                nextZoom = clamp(prev.zoom * ratio, ZOOM_MIN, ZOOM_MAX);
                const anchored = zoomAt(nextCenter, nextZoom, {
                  zoom: prev.zoom,
                  position: nextPosition,
                });
                nextZoom = anchored.zoom;
                nextPosition = anchored.position;
              }

              return {
                ...prev,
                zoom: nextZoom,
                position: nextPosition,
                animate: false,
              };
            });

            lastGestureCenterRef.current = nextCenter;
            lastGestureDistanceRef.current = nextDistance;
          }}
          onTouchEnd={() => {
            isGestureRef.current = false;
            lastGestureCenterRef.current = null;
            lastGestureDistanceRef.current = null;
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            isPointerDownRef.current = false;
            isErasingRef.current = false;
          }}
        >
          <GridLayer 
            width={stageSize.width / stageScale} 
            height={stageSize.height / stageScale} 
            minX={-view.position.x / stageScale}
            minY={-view.position.y / stageScale}
            gridColor={gridColor}
            backgroundColor={backgroundColor}
            opacity={gridOpacity}
            pattern={gridPattern}
          />
          
          <ImageLayer />

          <DrawingLayer
            strokes={pageStrokes}
            currentStroke={pageCurrentStroke}
            viewport={viewportConfig}
            onNodeRef={handleNodeRef}
          />

          <SelectionLayer
            selectionRectangle={selectionRectangle}
            selectedStrokes={selectedStrokes}
            selectedBlocks={selectedBlocks}
            transformerRef={transformerRef}
            onNodeRef={handleNodeRef}
            onStrokesChange={handleStrokesChange}
            onBlocksChange={handleBlocksChange}
          />


        </Stage>

        {/* HTML Overlay for Text/Images */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            style={{
              transform: `translate3d(${view.position.x}px, ${view.position.y}px, 0) scale(${stageScale})`,
              transformOrigin: "0 0",
              width: "100%",
              height: "100%",
              pointerEvents: "none", // Ensure this container doesn't block canvas events
            }}
          >
            {children}
          </div>
        </div>

        <SelectionOverlay 
          view={view} 
          stageScale={stageScale} 
          selectedStrokes={selectedStrokes}
          selectedBlocks={selectedBlocks}
          onDelete={handleDeleteSelected}
        />
        


        <div
          data-canvas-ui
          className="absolute right-3 top-3 flex items-center gap-2 bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1.5"
          style={{ pointerEvents: "auto" }}
        >
          <button
            onClick={() => {
              const anchor = { x: stageSize.width / 2, y: stageSize.height / 2 };
              setAnimatedView((prev) => {
                const next = zoomAt(anchor, prev.zoom / 1.1, prev);
                return { ...prev, ...next };
              });
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-300"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="text-xs text-zinc-300 tabular-nums w-12 text-center">
            {Math.round(view.zoom * 100)}%
          </div>
          <button
            onClick={() => {
              const anchor = { x: stageSize.width / 2, y: stageSize.height / 2 };
              setAnimatedView((prev) => {
                const next = zoomAt(anchor, prev.zoom * 1.1, prev);
                return { ...prev, ...next };
              });
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-300"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function constrainPosition(
  position: { x: number; y: number },
  _zoom: number,
  _stageSize: { width: number; height: number },
) {
  // Allow free panning for full-page canvas
  return position;
}
