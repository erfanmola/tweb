import {createEffect, createSignal, Setter, onMount, on, For} from 'solid-js';
import {createStore} from 'solid-js/store';
import {attachClickEvent} from '../../helpers/dom/clickEvent';
import I18n, {LangPackKey} from '../../lib/langPack';
import ButtonIcon from '../buttonIcon';
import Icon from '../icon';
import {useMediaEditor} from './mediaEditorContext';
import MediaEditorDRR from './mediaEditorDRR';
import {MediaEditorCanvasLayers} from './mediaEditor';

export type MediaEditorCropAspectRatio = 'free' | 'original' | 'square' | '3_2' | '2_3' | '4_3' | '3_4' | '5_4' | '4_5' | '7_5' | '5_7' | '16_9' | '9_16';

export type MediaEditorActionCropFlip = {
  action: 'crop',
  type: 'flip'
};

export type MediaEditorActionCropRotate = {
  action: 'crop',
  type: 'rotate',
  degree: number
};

export type MediaEditorActionCrop = MediaEditorActionCropFlip | MediaEditorActionCropRotate;

const mediaEditorCropAspectRatio = (aspectRatio: MediaEditorCropAspectRatio, canvasWidth: number, canvasHeight: number) => {
  let ratio;
  switch(aspectRatio) {
    case 'free':
      ratio = 0;
      break;
    case 'square':
      ratio = 1;
      break;
    case 'original':
      ratio = canvasWidth / canvasHeight;
      break;
    default:
      ratio = parseInt(aspectRatio.split('_')[0]) / parseInt(aspectRatio.split('_')[1]);
      break;
  }
  return ratio;
};

const MediaEditorTabCropSection = (props: {title: LangPackKey, icon: Icon, callback: () => void, active: boolean, iconRotate?: boolean}) => {
  const icon = Icon(props.icon);

  return (
    <div class='media-editor-tab-crop-section' classList={{'active': props.active, 'rotate-icon': ('iconRotate' in props && props.iconRotate)}} onClick={props.callback}>
      {icon}
      <span>{I18n.format(props.title)}</span>
    </div>
  );
};

const MediaEditorCropperAnglePicker = () => {
  const {settings, setSettings} = useMediaEditor();
  const [rotation, setRotation] = createSignal<number>(settings.crop.rotation);

  createEffect(() => {
    setSettings('crop', 'rotation', rotation());
  });

  return (
    <div id="media-editor-degree-picker">
      <ul>
        <For each={Array.from(new Array(13))}>
          {(_, i) => {
            const degree = ((i() * 15) - 90);
            return (
              <li classList={{'active': degree == rotation()}} onClick={() => setRotation(degree)}>{degree}°</li>
            )
          }
          }
        </For>
      </ul>
    </div>
  );
};

export const MediaEditorCropper = () => {
  const {canvas, stackDonePush, mediaEditor, stackDone, setStackDone, setStackUndone, settings, setSettings} = useMediaEditor();

  const buttonRotate = ButtonIcon('rotate', {noRipple: true});
  attachClickEvent(buttonRotate, () => {
    stackDonePush({
      action: 'crop',
      type: 'rotate',
      degree: 90
    });
    mediaEditor.render(canvas, stackDone());
  });

  const buttonFlip = ButtonIcon('flip2', {noRipple: true});
  attachClickEvent(buttonFlip, () => {
    const index = stackDone().indexOf(stackDone().find(item => (item.action == 'crop' && item.type == 'flip')));
    if(index > -1) {
      setStackDone(stackDone().filter(item => !(item.action == 'crop' && item.type == 'flip')));
      setStackUndone([
        {
          action: 'crop',
          type: 'flip'
        }
      ]);
    } else {
      stackDonePush({
        action: 'crop',
        type: 'flip'
      });
    }
    mediaEditor.render(canvas, stackDone());
  });

  let cropper: HTMLDivElement;

  const [position, setPosition] = createStore({x: settings.crop.x, y: settings.crop.y});
  const [size, setSize] = createStore({width: settings.crop.width, height: settings.crop.height});
  const [rotation, setRotation] = createSignal(settings.crop.rotation);
  const [aspectRatio, setAspectRatio] = createSignal(mediaEditorCropAspectRatio(settings.crop.activeAspectRatio, settings.general.width, settings.general.height));

  const initializeAspectRatio = () => {
    setAspectRatio(mediaEditorCropAspectRatio(settings.crop.activeAspectRatio, settings.general.width, settings.general.height));

    let width, height;

    if(aspectRatio() != 0) {
      if(canvas.offsetHeight >= canvas.offsetWidth) {
        width = canvas.offsetWidth;
        height = canvas.offsetWidth / aspectRatio();
        if(height > canvas.offsetHeight) {
          height = canvas.offsetHeight;
          width = canvas.offsetHeight * aspectRatio();
        }
      } else {
        height = canvas.offsetHeight;
        width = canvas.offsetHeight * aspectRatio();
        if(width > canvas.offsetWidth) {
          width = canvas.offsetWidth;
          height = canvas.offsetWidth / aspectRatio();
        }
      }
    } else {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
    }

    setSize('width', width);
    setSize('height', height);
    setPosition('x', (canvas.offsetWidth - width) / 2);
    setPosition('y', (canvas.offsetHeight - height) / 2);
  }

  createEffect(() => {
    setRotation(settings.crop.rotation);
  });

  createEffect(on(
    () => settings.crop.activeAspectRatio,
    initializeAspectRatio,
    {
      defer: true
    }
  ));

  createEffect(() => {
    setSettings('crop', 'x', position.x);
    setSettings('crop', 'y', position.y);
    setSettings('crop', 'width', size.width);
    setSettings('crop', 'height', size.height);
  });

  createEffect(on(
    () => settings.general.height,
    initializeAspectRatio
  ));

  onMount(() => {
    setSize('width', settings.crop.width > 0 ? settings.crop.width : canvas.offsetWidth);
    setSize('height', settings.crop.height > 0 ? settings.crop.height : canvas.offsetHeight);
    setPosition('x', settings.crop.x);
    setPosition('y', settings.crop.y);
  });

  return (
    <div id='media-editor-cropper'>
      <div>
        {canvas}
        <MediaEditorCanvasLayers />
        <MediaEditorDRR
          ref={cropper}
          drag={true}
          resize={true}
          rotate={false}
          aspectRatio={aspectRatio()}
          confine={true}
          minHeight={128}
          minWidth={128}
          position={position}
          setPosition={setPosition}
          size={size}
          setSize={setSize}
          rotation={rotation}
          setRotation={setRotation as Setter<number>}
          helperGrid={true}
          hideHandles={false}
          pixelBased={true}
        />
      </div>

      <div>
        {buttonRotate}
        <MediaEditorCropperAnglePicker />
        {buttonFlip}
      </div>
    </div>
  );
}

export const MediaEditorCanvasLayerCrop = () => {
  const {settings} = useMediaEditor();

  return (
    <div id='media-editor-crop-layer'>
      <div style={{
        'top': `${settings.crop.y}px`,
        'left': `${settings.crop.x}px`,
        'width': settings.crop.width > 0 ? `${settings.crop.width}px` : '100%',
        'height': settings.crop.height > 0 ? `${settings.crop.height}px` : '100%',
        'transform': `rotate(${settings.crop.rotation}deg)`
      }}></div>
    </div>
  );
};

const MediaEditorTabCrop = () => {
  const {settings, setSettings} = useMediaEditor();

  const changeAspectRatio = (aspectRatio: MediaEditorCropAspectRatio) => {
    setSettings('crop', 'activeAspectRatio', aspectRatio);
  };

  return (
    <div id='media-editor-tab-crop' class='media-editor-tab'>
      <b>{I18n.format('MediaEditor.Crop.AspectRatio')}</b>

      <MediaEditorTabCropSection title='MediaEditor.Crop.Free' icon='aspect_free' callback={() => changeAspectRatio('free')} active={settings.crop.activeAspectRatio == 'free'} />
      <MediaEditorTabCropSection title='MediaEditor.Crop.Original' icon='aspect_original' callback={() => changeAspectRatio('original')} active={settings.crop.activeAspectRatio == 'original'} />
      <MediaEditorTabCropSection title='MediaEditor.Crop.Square' icon='aspect_square' callback={() => changeAspectRatio('square')} active={settings.crop.activeAspectRatio == 'square'} />

      <div>
        <MediaEditorTabCropSection title='MediaEditor.Crop.3_2' icon='aspect_3_2' callback={() => changeAspectRatio('3_2')} active={settings.crop.activeAspectRatio == '3_2'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.2_3' icon='aspect_3_2' callback={() => changeAspectRatio('2_3')} iconRotate={true} active={settings.crop.activeAspectRatio == '2_3'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.4_3' icon='aspect_4_3' callback={() => changeAspectRatio('4_3')} active={settings.crop.activeAspectRatio == '4_3'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.3_4' icon='aspect_4_3' callback={() => changeAspectRatio('3_4')} iconRotate={true} active={settings.crop.activeAspectRatio == '3_4'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.5_4' icon='aspect_5_4' callback={() => changeAspectRatio('5_4')} active={settings.crop.activeAspectRatio == '5_4'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.4_5' icon='aspect_5_4' callback={() => changeAspectRatio('4_5')} iconRotate={true} active={settings.crop.activeAspectRatio == '4_5'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.7_5' icon='aspect_7_6' callback={() => changeAspectRatio('5_7')} active={settings.crop.activeAspectRatio == '5_7'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.5_7' icon='aspect_7_6' callback={() => changeAspectRatio('7_5')} iconRotate={true} active={settings.crop.activeAspectRatio == '7_5'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.16_9' icon='aspect_16_9' callback={() => changeAspectRatio('16_9')} active={settings.crop.activeAspectRatio == '16_9'} />
        <MediaEditorTabCropSection title='MediaEditor.Crop.9_16' icon='aspect_16_9' callback={() => changeAspectRatio('9_16')} iconRotate={true} active={settings.crop.activeAspectRatio == '9_16'} />
      </div>
    </div>
  );
};

export default MediaEditorTabCrop;
