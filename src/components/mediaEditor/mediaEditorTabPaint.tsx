import {createEffect, createSignal, on, onMount} from 'solid-js';
import I18n from '../../lib/langPack';
import {RangeSelectorSolid} from '../rangeSelectorTsx';
import {MediaEditorColorPickerBar} from './mediaEditor';
import {useMediaEditor} from './mediaEditorContext';
import {MediaEditorPaintToolArrow, MediaEditorPaintToolBlur, MediaEditorPaintToolBrush, MediaEditorPaintToolEraser, MediaEditorPaintToolNeon, MediaEditorPaintToolPen} from './mediaEditorPaintToolSVG';
import {rgbaToHexa} from '../../helpers/color';
import {MediaEditorPaintSVGDefs} from './mediaEditorDrawingPad';

export type MediaEditorPaintTool = 'pen' | 'arrow' | 'brush' | 'neon' | 'blur' | 'eraser';

export type MediaEditorActionPaint = {
  action: 'paint',
  type: MediaEditorPaintTool,
  path: SVGPathElement,
  img?: HTMLImageElement,
  defs?: Node[],
}

export const MediaEditorCanvasLayerPaint = (props: {action: MediaEditorActionPaint}) => {
  return (
    <svg>
      <MediaEditorPaintSVGDefs />
      {props.action.defs}
      {props.action.path}
    </svg>
  );
}

const MediaEditorTabPaint = () => {
  const {settings, setSettings} = useMediaEditor();

  const [tool, setTool] = createSignal(settings.paint.tool);

  const [color, setColor] = createSignal(settings.paint.settings[tool()].color);
  const [size, setSize] = createSignal(settings.paint.settings[tool()].size);

  const toolsElements: {[key in MediaEditorPaintTool]: HTMLLIElement} = {
    arrow: undefined,
    blur: undefined,
    brush: undefined,
    eraser: undefined,
    neon: undefined,
    pen: undefined
  };

  const sizeSelector = RangeSelectorSolid({
    step: 1,
    value: size(),
    min: 1,
    max: 30,
    withTransition: false,
    center: false,
    onScrub: (val) => {
      if(val != size()) {
        setSize(val);
      }
    }
  });

  createEffect(on(
    () => settings.paint.tool,
    () => {
      setColor(settings.paint.settings[settings.paint.tool].color);
      setSize(settings.paint.settings[settings.paint.tool].size);
      setTool(settings.paint.tool);
      toolsElements[settings.paint.tool].style.setProperty('--pen-color', rgbaToHexa(settings.paint.settings[settings.paint.tool].color));
      sizeSelector.container.style.setProperty('--color', rgbaToHexa(settings.paint.settings[settings.paint.tool].color));
      sizeSelector.setFilled(settings.paint.settings[settings.paint.tool].size);
    }
  ));

  createEffect(() => {
    if(tool() == settings.paint.tool) {
      setSettings('paint', 'settings', tool(), 'color', color());
      setSettings('paint', 'settings', tool(), 'size', size());
      toolsElements[tool()].style.setProperty('--pen-color', rgbaToHexa(color()));
      sizeSelector.container.style.setProperty('--color', rgbaToHexa(color()));
      sizeSelector.setFilled(size());
    } else {
      setSettings('paint', 'tool', tool());
    }
  });

  onMount(() => {
    Object.entries(settings.paint.settings).forEach(([toolName, toolSettings]) => {
      toolsElements[toolName as MediaEditorPaintTool].style.setProperty('--pen-color', rgbaToHexa(toolSettings.color));
    });
  });

  return (
    <div id='media-editor-tab-paint' class='media-editor-tab' classList={{
      'blur': tool() === 'blur',
      'eraser': tool() === 'eraser'
    }}>
      <MediaEditorColorPickerBar color={color} setColor={setColor} />

      <div class='media-editor-tab-title'>
        <b>{I18n.format('MediaEditor.Text.Paint.Size')}</b>
        <span>{size()}</span>
      </div>
      {sizeSelector.container}

      <b>{I18n.format('MediaEditor.Text.Paint.Tool')}</b>
      <ul>
        <li classList={{'active': tool() == 'pen'}} onClick={() => setTool('pen')} ref={toolsElements['pen']}>
          <MediaEditorPaintToolPen />
          {I18n.format('MediaEditor.Text.Paint.Pen')}
        </li>

        <li classList={{'active': tool() == 'arrow'}} onClick={() => setTool('arrow')} ref={toolsElements['arrow']}>
          <MediaEditorPaintToolArrow />
          {I18n.format('MediaEditor.Text.Paint.Arrow')}
        </li>

        <li classList={{'active': tool() == 'brush'}} onClick={() => setTool('brush')} ref={toolsElements['brush']}>
          <MediaEditorPaintToolBrush />
          {I18n.format('MediaEditor.Text.Paint.Brush')}
        </li>

        <li classList={{'active': tool() == 'neon'}} onClick={() => setTool('neon')} ref={toolsElements['neon']}>
          <MediaEditorPaintToolNeon />
          {I18n.format('MediaEditor.Text.Paint.Neon')}
        </li>

        <li classList={{'active': tool() == 'blur'}} onClick={() => setTool('blur')} ref={toolsElements['blur']}>
          <MediaEditorPaintToolBlur />
          {I18n.format('MediaEditor.Text.Paint.Blur')}
        </li>

        <li classList={{'active': tool() == 'eraser'}} onClick={() => setTool('eraser')} ref={toolsElements['eraser']}>
          <MediaEditorPaintToolEraser />
          {I18n.format('MediaEditor.Text.Paint.Eraser')}
        </li>
      </ul>
    </div>
  );
}

export default MediaEditorTabPaint;
