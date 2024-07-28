import {createEffect, createSignal, For, on, onMount} from 'solid-js';
import {MediaEditorColorPickerBar, MediaEditorSettingsText, MediaEditorTextInitialSettings} from './mediaEditor';
import {MediaEditorContextType, useMediaEditor} from './mediaEditorContext';
import Icon from '../icon';
import I18n from '../../lib/langPack';
import {RangeSelectorSolid} from '../rangeSelectorTsx';
import {rgbaToHexa} from '../../helpers/color';
import {randomLong} from '../../helpers/random';
import {createStore} from 'solid-js/store';
import MediaEditorDRR from './mediaEditorDRR';

export type MediaEditorTextFont = {
  family: string;
  name: string;
  url: string;
};

export type MediaEditorActionText = {
  action: 'text',
  type: 'default',
  id: string,
  x: number,
  y: number,
  rotation: number,
  color: MediaEditorSettingsText['color'],
  align: MediaEditorSettingsText['align'],
  frame: MediaEditorSettingsText['frame'],
  font: MediaEditorSettingsText['font'],
  size: MediaEditorSettingsText['size'],
  text: string,
};

export const MediaEditorTextFonts: MediaEditorTextFont[] = [
  {
    family: 'Roboto',
    name: 'Roboto',
    url: 'assets/fonts/Roboto-Medium.woff2'
  },
  {
    family: 'Typewriter',
    name: 'Typewriter',
    url: '/assets/fonts/mediaEditor/AmericanTypewriter-Regular.woff2'
  },
  {
    family: 'AvenirNext',
    name: 'Avenir Next',
    url: '/assets/fonts/mediaEditor/AvenirNextLTPro-Bold.woff2'
  },
  {
    family: 'CourierNew',
    name: 'Courier New',
    url: '/assets/fonts/mediaEditor/CourierNew.woff2'
  },
  {
    family: 'Noteworthy',
    name: 'Noteworthy',
    url: '/assets/fonts/mediaEditor/Noteworthy-Bold.woff2'
  },
  {
    family: 'Georgia',
    name: 'Georgia',
    url: '/assets/fonts/mediaEditor/Georgia-Bold.woff2'
  },
  {
    family: 'Papyrus',
    name: 'Papyrus',
    url: '/assets/fonts/mediaEditor/Papyrus.woff2'
  },
  {
    family: 'SnellRoundhand',
    name: 'Snell Roundhand',
    url: '/assets/fonts/mediaEditor/SnellBT-Bold.woff2'
  }
];

export const MediaEditorTextCanvasOnClick = (e: Event, useMediaEditor: MediaEditorContextType) => {
  const {stackDonePush, canvas} = useMediaEditor;

  const rect = canvas.getBoundingClientRect();

  const id = randomLong();
  stackDonePush({
    action: 'text',
    type: 'default',
    align: MediaEditorTextInitialSettings.align,
    font: MediaEditorTextInitialSettings.font,
    color: MediaEditorTextInitialSettings.color,
    frame: MediaEditorTextInitialSettings.frame,
    id: id,
    rotation: 0,
    size: MediaEditorTextInitialSettings.size,
    x: (e as MouseEvent).clientX - rect.left,
    y: (e as MouseEvent).clientY - rect.top,
    text: 'Hi'
  });
}

export const MediaEditorCanvasLayerText = (props: {action: MediaEditorActionText}) => {
  let element: HTMLDivElement;
  let span: HTMLSpanElement;

  const {settings, setSettings, canvas} = useMediaEditor();

  const [position, setPosition] = createStore({x: props.action.x, y: props.action.y});
  const [size, setSize] = createStore({width: props.action.size * 2, height: props.action.size * 2});
  const [rotation, setRotation] = createSignal(props.action.rotation);

  const [hideHandles, setHideHandles] = createSignal(true);

  const [color, setColor] = createSignal(props.action.color);
  const [align, setAlign] = createSignal(props.action.align);
  const [frame, setFrame] = createSignal(props.action.frame);
  const [font, setFont] = createSignal(props.action.font);
  const [fontSize, setFontSize] = createSignal(props.action.size);

  createEffect(() => {
    setHideHandles(settings.general.activeTab !== 'text');
  });

  createEffect(() => {
    props.action.x = position.x;
    props.action.y = position.y;
    props.action.rotation = rotation();
    props.action.align = align();
    props.action.color = color();
    props.action.font = font();
    props.action.frame = frame();
    props.action.size = fontSize();
  });

  const onInput = (e: InputEvent) => {
    setSize('width', span.offsetWidth + 32);
    setSize('height', span.offsetHeight + 32);
    props.action.text = span.innerText;
  };

  onMount(() => {
    setSize('width', span.offsetWidth + 32);
    setSize('height', span.offsetHeight + 32);
    setSettings('text', 'activeID', props.action.id);
  });

  const onMouseDown = () => {
    setSettings('text', 'activeID', props.action.id);
  };

  createEffect(() => {
    font();
    fontSize();
    setSize('width', span.offsetWidth + 32);
    setSize('height', span.offsetHeight + 32);
  })

  createEffect(() => {
    if(settings.text.activeID == props.action.id) {
      setAlign(settings.text.align);
      setColor(settings.text.color);
      setFont(settings.text.font);
      setFrame(settings.text.frame);
      setFontSize(settings.text.size);
    }
  });

  createEffect(on(
    () => align(),
    () => {
      switch(align()) {
        case 'center':
          setPosition('x', (canvas.offsetWidth - size.width) / 2);
          break;
        case 'left':
          setPosition('x', canvas.offsetWidth * 0.05);
          break;
        case 'right':
          setPosition('x', (canvas.offsetWidth * 0.95) - size.width);
          break;
      }
    },
    {
      defer: true
    }
  ));

  createEffect(on(
    () => settings.text.activeID,
    () => {
      if(settings.text.activeID == props.action.id) {
        setSettings('text', 'align', props.action.align);
        setSettings('text', 'color', props.action.color);
        setSettings('text', 'font', props.action.font);
        setSettings('text', 'frame', props.action.frame);
        setSettings('text', 'size', props.action.size);
      }
    }
  ));

  return (
    <MediaEditorDRR
      hideHandles={hideHandles()}
      aspectRatio={0}
      confine={true}
      drag={true}
      helperGrid={false}
      minHeight={0}
      minWidth={0}
      position={position}
      setPosition={setPosition}
      resize={false}
      rotate={true}
      rotation={rotation}
      setRotation={setRotation}
      size={size}
      setSize={setSize}
      pixelBased={true}
      children={
        <div id={props.action.id} class='media-editor-canvas-text' ref={element} onMouseDown={onMouseDown}>
          <span
            ref={span}
            contentEditable={true}
            onInput={onInput}
            onKeyPress={(e) => { if(e.key === 'Enter') {e.preventDefault()} }}
            style={{
              'font-size': `${fontSize()}px`,
              'color': (frame() === 'noframe') ? rgbaToHexa(color()) : (JSON.stringify(color()) == JSON.stringify([255, 255, 255]) ? 'black' : 'white'),
              '-webkit-text-stroke': (frame() === 'black') ? `${Math.max(Math.round(fontSize() / 10), 1)}px ${rgbaToHexa(color())}` : '0px transparent',
              'background-color': (frame() === 'white') ? rgbaToHexa(color()) : 'transparent',
              'text-align': align(),
              'font-family': font()
            }}
          >{props.action.text}</span>
        </div>
      }
    />
  );
}

const MediaEditorTabText = () => {
  const {settings, setSettings} = useMediaEditor();

  const [color, setColor] = createSignal(settings.text.color);
  const [align, setAlign] = createSignal(settings.text.align);
  const [frame, setFrame] = createSignal(settings.text.frame);
  const [font, setFont] = createSignal(settings.text.font);
  const [size, setSize] = createSignal(settings.text.size);

  const sizeSelector = RangeSelectorSolid({
    step: 1,
    value: size(),
    min: 24,
    max: 96,
    withTransition: false,
    center: false,
    onScrub: (val) => {
      if(val != size()) {
        setSize(val);
      }
    }
  });

  createEffect(() => {
    setSettings('text', 'color', color());
    setSettings('text', 'align', align());
    setSettings('text', 'frame', frame());
    setSettings('text', 'font', font());
    setSettings('text', 'size', size());
    sizeSelector.container.style.setProperty('--color', rgbaToHexa(color()));
    sizeSelector.setFilled(size());
  });

  createEffect(() => {
    setColor(settings.text.color);
    setAlign(settings.text.align);
    setFont(settings.text.font);
    setFrame(settings.text.frame);
    setSize(settings.text.size);
  });

  return (
    <div id='media-editor-tab-text' class='media-editor-tab'>
      <MediaEditorColorPickerBar color={color} setColor={setColor} />
      <div>
        <ul>
          <li classList={{'active': align() === 'left'}} onClick={() => setAlign('left')}>{Icon('align_left')}</li>
          <li classList={{'active': align() === 'center'}} onClick={() => setAlign('center')}>{Icon('align_center')}</li>
          <li classList={{'active': align() === 'right'}} onClick={() => setAlign('right')}>{Icon('align_right')}</li>
        </ul>

        <ul>
          <li classList={{'active': frame() === 'noframe'}} onClick={() => setFrame('noframe')}>{Icon('frame_noframe')}</li>
          <li classList={{'active': frame() === 'black'}} onClick={() => setFrame('black')}>{Icon('frame_black')}</li>
          <li classList={{'active': frame() === 'white'}} onClick={() => setFrame('white')}>{Icon('frame_white')}</li>
        </ul>
      </div>

      <div class='media-editor-tab-title'>
        <b>{I18n.format('MediaEditor.Text.Size')}</b>
        <span>{size()}</span>
      </div>
      {sizeSelector.container}

      <b>{I18n.format('MediaEditor.Text.Font')}</b>
      <ul>
        <For each={MediaEditorTextFonts}>
          {(fontItem) => (
            <li
              classList={{'active': font() == fontItem.family}}
              style={{'font-family': fontItem.family}}
              onClick={() => setFont(fontItem.family)}
            >{fontItem.name}</li>
          )}
        </For>
      </ul>
    </div>
  );
};

export default MediaEditorTabText;
