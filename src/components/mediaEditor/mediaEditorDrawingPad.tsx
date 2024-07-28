import {createEffect, createSignal, onCleanup} from 'solid-js';
import {useMediaEditor} from './mediaEditorContext';
import {rgbaToHexa} from '../../helpers/color';
import {MediaEditorSVGUtils} from './mediaEditorUtils';
import {MediaEditorActionPaint} from './mediaEditorTabPaint';
import {MediaEditorAction} from './mediaEditor';

export const MediaEditorPaintSVGDefs = () => {
  return (
    <defs>
      <filter id="neon-glow" x="-200%" y="-200%" width="400%" height="400%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="blur-filter" x="-200%" y="-200%" width="400%" height="400%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="50" result="blur" />
      </filter>
    </defs>
  );
};

const MediaEditorDrawingPad = () => {
  let svgRef: SVGSVGElement | null = null;
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [currentPath, setCurrentPath] = createSignal<SVGPathElement | null>(null);
  const [points, setPoints] = createSignal<{ x: number; y: number }[]>([]);

  const {settings, stackDonePush, stackDone, setStackDone} = useMediaEditor();

  const [tool, setTool] = createSignal(settings.paint.tool);
  const [color, setColor] = createSignal(settings.paint.settings[tool()].color);
  const [size, setSize] = createSignal(settings.paint.settings[tool()].size);

  createEffect(() => {
    setTool(settings.paint.tool);
  });

  createEffect(() => {
    setColor(settings.paint.settings[tool()].color);
    setSize(settings.paint.settings[tool()].size);
  });

  const smoothPoints = (points: { x: number; y: number }[], windowSize: number) => {
    if(points.length < 3) return points;

    const smoothed = [];
    for(let i = 0; i < points.length; i++) {
      let avgX = 0, avgY = 0, count = 0;
      for(let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
        avgX += points[j].x;
        avgY += points[j].y;
        count++;
      }
      smoothed.push({x: avgX / count, y: avgY / count});
    }
    return smoothed;
  };

  const getCatmullRomPath = (points: { x: number; y: number }[]) => {
    if(points.length < 2) return `M ${points[0].x} ${points[0].y}`;

    const catmullRom2bezier = (points: { x: number; y: number }[]) => {
      const d = [];

      for(let i = 0; i < points.length - 1; i++) {
        const p = [
          points[Math.max(i - 1, 0)],
          points[i],
          points[i + 1],
          points[Math.min(i + 2, points.length - 1)]
        ];

        const bp = [
          {x: p[1].x + (p[2].x - p[0].x) / 3, y: p[1].y + (p[2].y - p[0].y) / 3},
          {x: p[2].x + (p[1].x - p[3].x) / 3, y: p[2].y + (p[1].y - p[3].y) / 3}
        ];

        d.push(`C ${bp[0].x} ${bp[0].y}, ${bp[1].x} ${bp[1].y}, ${p[2].x} ${p[2].y}`);
      }

      return d.join(' ');
    };

    return `M ${points[0].x} ${points[0].y} ${catmullRom2bezier(points)}`;
  };

  const draw = (event: MouseEvent | TouchEvent) => {
    if(!isDrawing() || !currentPath()) return;
    const point = getPoint(event);
    setPoints((prevPoints) => [...prevPoints, point]);

    const smoothedPoints = smoothPoints(points(), 2);
    const smoothPath = getCatmullRomPath(smoothedPoints);
  currentPath()!.setAttribute('d', smoothPath);
  };

  const startDrawing = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const point = getPoint(event);
    setIsDrawing(true);
    setPoints([point]);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${point.x} ${point.y}`);
    path.setAttribute('stroke', tool() === 'eraser' ? 'white' : rgbaToHexa(color()));
    path.setAttribute('stroke-width', size().toString());
    path.setAttribute('fill', 'none');

    if(['pen', 'arrow', 'blur', 'eraser'].includes(tool())) {
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');

      if(tool() === 'arrow') {
        const markerId = `arrowhead-${Math.random().toString(36).substring(2, 15)}`;
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', markerId);
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('markerWidth', '8');
        marker.setAttribute('markerHeight', '8');
        marker.setAttribute('refX', '4.25');
        marker.setAttribute('refY', '4');

        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M 2.4 1.6 L 5.6 4 L 2.4 6.4');
        arrowPath.setAttribute('stroke', rgbaToHexa(color()));
        arrowPath.setAttribute('stroke-linejoin', 'round');
        arrowPath.setAttribute('fill', 'none');
        arrowPath.setAttribute('stroke-width', '1');

        marker.appendChild(arrowPath);
        svgRef!.querySelector('defs')!.appendChild(marker);

        path.setAttribute('marker-end', `url(#${markerId})`);
      } else if(tool() === 'blur') {
        path.setAttribute('stroke-opacity', '0.875');
        path.setAttribute('filter', 'url(#blur-filter)');
      } else if(tool() === 'eraser') {
        path.setAttribute('stroke', 'none');
      }
    } else if(tool() === 'brush') {
      path.setAttribute('stroke-opacity', '0.625');
      path.setAttribute('stroke-linecap', 'butt');
      path.setAttribute('stroke-linejoin', 'miter');
    } else if(tool() === 'neon') {
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('filter', 'url(#neon-glow)');
    }

    svgRef!.appendChild(path);
    setCurrentPath(path);
  };

  const endDrawing = () => {
    if(!currentPath()) return;

    if(tool() === 'eraser') {
      const eraseActions: MediaEditorAction[] = [];
      stackDone().filter(item => item.action === 'paint').forEach((action) => {
        if(MediaEditorSVGUtils.arePathsIntersecting(currentPath(), (action as MediaEditorActionPaint).path)) {
          eraseActions.push(action);
        }
      });

      if(eraseActions.length > 0) {
        setStackDone(stackDone().filter(item => !(eraseActions.includes(item))));
      }
    } else {
      stackDonePush({
        action: 'paint',
        type: tool(),
        path: currentPath(),
        defs: tool() === 'arrow' ? [
          svgRef!.querySelector('defs').lastChild
        ] : []
      });
    }

    setIsDrawing(false);
    setCurrentPath(null);
    setPoints([]);
  };

  const getPoint = (event: MouseEvent | TouchEvent) => {
    let clientX: number, clientY: number;
    if(event instanceof TouchEvent && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if(event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return {x: 0, y: 0};
    }
    const rect = svgRef!.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  onCleanup(() => {
    svgRef = null;
  });

  return (
    <div id="media-editor-drawing-pad">
      <svg
        ref={el => (svgRef = el)}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        onTouchCancel={endDrawing}
      >
        <MediaEditorPaintSVGDefs />
      </svg>
    </div>
  );
};

export default MediaEditorDrawingPad;
