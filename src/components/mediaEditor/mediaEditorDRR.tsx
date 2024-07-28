import {Accessor, createSignal, For, JSX, onMount, Setter, Show} from 'solid-js';
import {SetStoreFunction} from 'solid-js/store';
import clamp from '../../helpers/number/clamp';

interface MediaEditorDRRProps {
  drag: boolean;
  resize: boolean;
  rotate: boolean;
  position: {
    x: number;
    y: number;
  };
  setPosition: SetStoreFunction<{
    x: number;
    y: number;
  }>;
  size: {
    width: number;
    height: number;
  };
  setSize: SetStoreFunction<{
    width: number;
    height: number;
  }>;
  rotation: Accessor<number>;
  setRotation: Setter<number>;
  aspectRatio: number;
  minWidth: number;
  minHeight: number;
  confine: boolean;
  helperGrid: boolean;
  hideHandles: boolean;
  children?: Element | JSX.Element;
  parentRect?: DOMRect;
  pixelBased?: boolean;
}

const MediaEditorDRR = (props: MediaEditorDRRProps) => {
  let element: HTMLDivElement;

  const {position, setPosition, size, setSize, rotation, setRotation} = props;

  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [resizeCorner, setResizeCorner] = createSignal('');
  const [isRotating, setIsRotating] = createSignal(false);

  const minWidth = props.minWidth;
  const minHeight = props.minHeight;

  let parentRect: DOMRect = props.parentRect || {
    height: size.height,
    width: size.width,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    x: 0,
    y: 0,
    toJSON: () => {}
  };

  onMount(() => {
    parentRect = element.parentElement.getBoundingClientRect();

    const onMove = (e: MouseEvent | TouchEvent) => {
      const parent = element.parentElement;
      if(!parent) return;
      parentRect = parent.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      if(isDragging()) {
        let newLeft = clientX - parentRect.left - element.offsetWidth / 2;
        let newTop = clientY - parentRect.top - element.offsetHeight / 2;

        if(props.confine) {
          newLeft = Math.max(0, Math.min(newLeft, parentRect.width - size.width));
          newTop = Math.max(0, Math.min(newTop, parentRect.height - size.height));
        }

        setPosition({x: newLeft, y: newTop});
      } else if(isResizing()) {
        let newWidth = size.width;
        let newHeight = size.height;
        let newX = position.x;
        let newY = position.y;

        switch(resizeCorner()) {
          case 'bottom-left':
            newWidth = position.x + size.width - (clientX - parentRect.left);
            newHeight = clientY - parentRect.top - position.y;
            newX = clientX - parentRect.left;
            break;
          case 'bottom-right':
            newWidth = clientX - parentRect.left - position.x;
            newHeight = clientY - parentRect.top - position.y;
            break;
          case 'top-left':
            newWidth = position.x + size.width - (clientX - parentRect.left);
            newHeight = position.y + size.height - (clientY - parentRect.top);
            newX = clientX - parentRect.left;
            newY = clientY - parentRect.top;
            break;
          case 'top-right':
            newWidth = clientX - parentRect.left - position.x;
            newHeight = position.y + size.height - (clientY - parentRect.top);
            newY = clientY - parentRect.top;
            break;
        }

        if(newWidth < minWidth) {
          newWidth = minWidth;
          newHeight = props.aspectRatio ? newWidth / props.aspectRatio : newHeight;
        }

        if(newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = props.aspectRatio ? newHeight * props.aspectRatio : newWidth;
        }

        if(props.aspectRatio && props.aspectRatio !== 0) {
          if(newWidth / newHeight > props.aspectRatio) {
            newWidth = newHeight * props.aspectRatio;
          } else {
            newHeight = newWidth / props.aspectRatio;
          }
        }

        if(props.confine) {
          if(newX < 0) {
            newX = 0;
            newWidth = position.x + size.width;
            if(props.aspectRatio && props.aspectRatio !== 0) {
              newHeight = newWidth / props.aspectRatio;
            }
          }

          if(newY < 0) {
            newY = 0;
            newHeight = position.y + size.height;
            if(props.aspectRatio && props.aspectRatio !== 0) {
              newWidth = newHeight * props.aspectRatio;
            }
          }

          if(newX + newWidth > parentRect.width) {
            newWidth = parentRect.width - newX;
            if(props.aspectRatio && props.aspectRatio !== 0) {
              newHeight = newWidth / props.aspectRatio;
            }
          }

          if(newY + newHeight > parentRect.height) {
            newHeight = parentRect.height - newY;
            if(props.aspectRatio && props.aspectRatio !== 0) {
              newWidth = newHeight * props.aspectRatio;
            }
          }
        }

        if(props.aspectRatio != 0) {
          newX = clamp(newX, 0, parentRect.width - props.minWidth);
          newY = clamp(newY, 0, parentRect.height - props.minWidth / props.aspectRatio);
          newWidth = clamp(newWidth, props.minWidth, parentRect.width - newX);
          newHeight = clamp(newHeight, props.minWidth / props.aspectRatio, parentRect.height - newY);
        } else {
          newX = clamp(newX, 0, parentRect.width - props.minWidth);
          newY = clamp(newY, 0, parentRect.height - props.minHeight);
          newWidth = clamp(newWidth, props.minWidth, parentRect.width - newX);
          newHeight = clamp(newHeight, props.minHeight, parentRect.height - newY);
        }

        setPosition({x: newX, y: newY});
        setSize({width: newWidth, height: newHeight});
      } else if(isRotating()) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
        setRotation(angle);
      }
    };

    const onEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  });

  const startDragging = (e: MouseEvent | TouchEvent) => {
    if(props.drag && (e.target === element || (e.target as HTMLElement).closest('.mediaEditorDDR') === element)) {
      e.stopImmediatePropagation();
      setIsDragging(true);
    }
  };

  const startResizing = (e: MouseEvent | TouchEvent, corner: string) => {
    if(props.resize) {
      setIsResizing(true);
      setResizeCorner(corner);
      e.stopPropagation();
    }
  };

  const startRotating = (e: MouseEvent | TouchEvent) => {
    if(props.rotate) {
      setIsRotating(true);
      e.stopPropagation();
    }
  };

  return (
    <div
      class='mediaEditorDDR'
      classList={{'helperGrid': props.helperGrid, 'hideHandles': props.hideHandles, 'resizable': props.resize}}
      ref={(el) => (element = el!)}
      style={{
        position: 'absolute',
        top: props.pixelBased ? (`${position.y}px`) : (`${position.y / parentRect.height * 100}%`),
        left: props.pixelBased ? (`${position.x}px`) : (`${position.x / parentRect.width * 100}%`),
        width: size.width > 0 ? (props.pixelBased ? (`${size.width}px`) : (`${size.width / parentRect.width * 100}%`)) : 'auto',
        height: size.height > 0 ? (props.pixelBased ? (`${size.height}px`) : (`${size.height / parentRect.height * 100}%`)) : 'auto',
        transform: `rotate(${rotation()}deg)`,
        cursor: isDragging() ? 'move' : isResizing() ? 'nwse-resize' : isRotating() ? 'crosshair' : 'grab'
      }}
      onMouseDown={startDragging}
      onTouchStart={startDragging}
    >
      <span style={{display: props.rotate ? 'block' : 'none'}} onMouseDown={startRotating} onTouchStart={startRotating}></span>
      <span onMouseDown={(e) => startResizing(e, 'top-left')} onTouchStart={(e) => startResizing(e, 'top-left')}></span>
      <span onMouseDown={(e) => startResizing(e, 'top-right')} onTouchStart={(e) => startResizing(e, 'top-right')}></span>
      <span onMouseDown={(e) => startResizing(e, 'bottom-right')} onTouchStart={(e) => startResizing(e, 'bottom-right')}></span>
      <span onMouseDown={(e) => startResizing(e, 'bottom-left')} onTouchStart={(e) => startResizing(e, 'bottom-left')}></span>
      {props.children}
      <Show when={props.helperGrid}>
        <ul>
          <For each={Array.from(new Array(9))}>
            {() => <li></li>}
          </For>
        </ul>
      </Show>
    </div>
  );
};

export default MediaEditorDRR;
