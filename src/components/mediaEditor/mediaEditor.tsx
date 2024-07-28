import {Accessor, createEffect, createRoot, createSignal, For, JSX, Setter, Show, Suspense} from 'solid-js';
import {createStore} from 'solid-js/store';
import {render} from 'solid-js/web';
import appNavigationController, {NavigationItem} from '../appNavigationController';
import I18n from '../../lib/langPack';
import ButtonIcon from '../buttonIcon';
import Icon from '../icon';
import {attachClickEvent} from '../../helpers/dom/clickEvent';
import {horizontalMenu} from '../horizontalMenu';
import MediaEditorTabFilters, {MediaEditorActionFilter, MediaEditorActionFilterTypes} from './mediaEditorTabFilters';
import MediaEditorTabBrush, {MediaEditorActionPaint, MediaEditorCanvasLayerPaint, MediaEditorPaintTool} from './mediaEditorTabPaint';
import MediaEditorTabCrop, {MediaEditorActionCrop, MediaEditorCanvasLayerCrop, MediaEditorCropAspectRatio, MediaEditorCropper} from './mediaEditorTabCrop';
import MediaEditorTabEmoticon, {MediaEditorActionSticker, MediaEditorCanvasLayerSticker} from './mediaEditorTabEmoticon';
import MediaEditorTabText, {MediaEditorActionText, MediaEditorCanvasLayerText, MediaEditorTextCanvasOnClick, MediaEditorTextFont, MediaEditorTextFonts} from './mediaEditorTabText';
import {mediaEditorActiveContext, MediaEditorContext, MediaEditorProvider, useMediaEditor} from './mediaEditorContext';
import MediaEditorWorker from './mediaEditor.worker?worker';
import {MediaEditorWorkerMessageRender, MediaEditorWorkerResponse} from './mediaEditor.worker';
import ButtonCorner from '../buttonCorner';
import {renderImageFromUrlPromise} from '../../helpers/dom/renderImageFromUrl';
import {randomLong} from '../../helpers/random';
import {ColorRgb, rgbaToHexa, rgbaToHsla} from '../../helpers/color';
import ColorPicker from '../colorPicker';
import MediaEditorDrawingPad, {MediaEditorPaintSVGDefs} from './mediaEditorDrawingPad';

export type MediaEditorTab = {
  icon: Icon,
  contentTab?: HTMLElement,
  menuTab?: HTMLElement,
  menuTabName?: HTMLElement;
  tab: MediaEditorTabType,
  component: () => JSX.Element
}

export type MediaEditorAction = MediaEditorActionFilter | MediaEditorActionCrop | MediaEditorActionSticker | MediaEditorActionText | MediaEditorActionPaint;

export type MediaEditorActionStack = MediaEditorAction[];

export type MediaEditorTabType = 'filters' | 'crop' | 'text' | 'paint' | 'emoticon';

export type MediaEditorSettings = {
  general: {
    activeTab: MediaEditorTabType,
    width: number,
    height: number
  },
  filters: {[key in MediaEditorActionFilterTypes]: number},
  crop: MediaEditorSettingsCrop,
  text: MediaEditorSettingsText,
  paint: MediaEditorSettingsPaint,
}

export type MediaEditorSettingsCrop = {
  activeAspectRatio: MediaEditorCropAspectRatio,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
}

export type MediaEditorSettingsText = {
  color: ColorRgb,
  size: number,
  align: 'left' | 'center' | 'right',
  frame: 'noframe' | 'black' | 'white',
  font: MediaEditorTextFont['family'],
  activeID: string,
}

export type MediaEditorSettingsPaint = {
  tool: MediaEditorPaintTool,
  settings: {[key in MediaEditorPaintTool]: {
    size: number,
    color: ColorRgb
  }},
}

export const MediaEditorColorPalette: ColorRgb[] = [
  [255, 255, 255],
  [254, 68, 56],
  [255, 137, 1],
  [255, 214, 10],
  [51, 199, 89],
  [98, 229, 224],
  [10, 132, 255],
  [189, 92, 243]
]

export const MediaEditorTextInitialSettings: Omit<MediaEditorSettingsText, 'activeID'> = {
  align: 'center',
  color: MediaEditorColorPalette[0],
  font: 'Roboto',
  size: 60,
  frame: 'black'
};

export const MediaEditorColorPickerBar = (props: { color: Accessor<ColorRgb>, setColor: Setter<ColorRgb>}) => {
  const [colorPickerMode, setColorPickerMode] = createSignal(false);

  const colorPicker = new ColorPicker({thickSlider: true});

  colorPicker.onChange = (color) => {
    if(colorPickerMode()) {
      props.setColor(color.rgbaArray.splice(0, 3) as ColorRgb);
    }
  };

  return (
    <div class='media-editor-colorpicker-bar'>
      <ul>
        <For each={MediaEditorColorPalette}>
          {(color) =>
            <li
              classList={{'active': JSON.stringify(color) === JSON.stringify(props.color())}}
              style={{'background-color': rgbaToHexa([...color, JSON.stringify(color) === JSON.stringify(props.color()) ? 50 : 0])}}
              onClick={() => props.setColor(color)}
            >
              <span style={{'background-color': rgbaToHexa(color)}}></span>
            </li>
          }
        </For>

        <li onClick={() => {
          colorPicker.setColor(rgbaToHsla(...props.color()), true, true);
          colorPicker.updatePicker(true, true);
          setColorPickerMode(!(colorPickerMode()));
        }}>
          <span></span>
        </li>
      </ul>

      <Show when={colorPickerMode()}>
        <>
          {colorPicker.container}
        </>
      </Show>
    </div>
  );
}

const MediaEditorTabs = () => {
  const {setSettings} = useMediaEditor();

  const tabsMenu = document.createElement('nav');
  tabsMenu.classList.add('menu-horizontal-div');
  const tabsContainer = document.createElement('div');
  tabsContainer.classList.add('tabs-container');

  const tabs: MediaEditorTab[] = [
    {icon: 'enhance', tab: 'filters', component: MediaEditorTabFilters},
    {icon: 'crop', tab: 'crop', component: MediaEditorTabCrop},
    {icon: 'text', tab: 'text', component: MediaEditorTabText},
    {icon: 'brush', tab: 'paint', component: MediaEditorTabBrush},
    {icon: 'smile', tab: 'emoticon', component: MediaEditorTabEmoticon}
  ];

  tabs.forEach((tab) => {
    const menuTab = document.createElement('div');
    menuTab.classList.add('menu-horizontal-div-item');
    const span = document.createElement('span');
    span.classList.add('menu-horizontal-div-item-span');
    const i = document.createElement('i');

    const icon = Icon(tab.icon);

    span.append(icon);
    span.append(i);

    const component = document.createElement('div');
    component.classList.add('tabs-tab');

    menuTab.append(span);
    tabsContainer.append(component as Node);
    tabsMenu.append(menuTab);

    tab.menuTab = menuTab;
    tab.contentTab = component;

    render(tab.component, component);
  });

  const selectTab = horizontalMenu(tabsMenu, tabsContainer, (id) => {
    setSettings('general', 'activeTab', tabs[id].tab);
  });
  selectTab(0);

  return (
    <div>
      {tabsMenu}
      {tabsContainer}
    </div>
  );
}

const MediaEditorSidebar = () => {
  const {stackDonePop, stackDonePush, stackUndonePop, stackUndonePush, mediaEditor, canvas} = useMediaEditor();

  const btnClose = ButtonIcon('close', {noRipple: true});
  attachClickEvent(btnClose, () => {mediaEditor.hide()});

  const btnUndo = ButtonIcon('undo', {noRipple: true});
  attachClickEvent(btnUndo, () => {
    const pop = stackDonePop();
    stackUndonePush(pop);
    mediaEditor.render(canvas, stackDone());
  });

  const btnRedo = ButtonIcon('redo', {noRipple: true});
  attachClickEvent(btnRedo, () => {
    const pop = stackUndonePop();
    stackDonePush(pop, false);
    mediaEditor.render(canvas, stackDone());
  });

  const fab = ButtonCorner({
    icon: 'check1'
  });

  attachClickEvent(fab, () => {
    mediaEditor.stackDone = stackDone();
    mediaEditor.stackUndone = stackUndone();
    mediaEditor.apply();
  });

  const {stackDone, stackUndone} = useMediaEditor();

  createEffect(() => {
    btnUndo.disabled = stackDone().length == 0;
    btnRedo.disabled = stackUndone().length == 0;
  });

  return (
    <div>
      <header>
        {btnClose}
        <div class='popup-title'>{I18n.format('Edit')}</div>
        {btnUndo}
        {btnRedo}
      </header>
      <MediaEditorTabs />
      {fab}
    </div>
  );
}

const MediaEditorDrawPipelineFilters: MediaEditorAction['action'][] = ['sticker', 'text', 'paint'];

export const MediaEditorCanvasLayers = () => {
  const useMediaEditorLocal = useMediaEditor();
  const {stackDone, stackUndone, settings} = useMediaEditorLocal;

  const [layerActions, setLayerActions] = createSignal(stackDone().filter(item => MediaEditorDrawPipelineFilters.includes(item.action)));

  createEffect(() => {
    stackUndone();
    setLayerActions(stackDone().filter(item => MediaEditorDrawPipelineFilters.includes(item.action)));
  });

  const onClick = (e: Event) => {
    if(settings.general.activeTab == 'text' && (e.target as Element).id === 'media-editor-layers') {
      MediaEditorTextCanvasOnClick(e, useMediaEditorLocal);
    }
  };

  return (
    <div id='media-editor-layers' classList={{'text': settings.general.activeTab == 'text'}} onClick={onClick}>
      <For each={layerActions()}>
        {(action) => {
          switch(action.action) {
            case 'sticker':
              return (<MediaEditorCanvasLayerSticker action={action} />);
            case 'text':
              return (<MediaEditorCanvasLayerText action={action} />);
            case 'paint':
              return (<MediaEditorCanvasLayerPaint action={action} />);
          }
        }}
      </For>
    </div>
  );
};

const MediaEditorCanvas = () => {
  const {settings, canvas} = useMediaEditor();

  return (
    <Suspense>
      <Show when={settings.general.activeTab == 'crop'} fallback={
        <div>
          <div>
            {canvas}
            <MediaEditorCanvasLayerCrop />
            <MediaEditorCanvasLayers />
            <Show when={settings.general.activeTab == 'paint'}>
              <MediaEditorDrawingPad />
            </Show>
          </div>
          <div></div>
        </div>
      }>
        <MediaEditorCropper />
      </Show>
    </Suspense>
  );
}

const MediaEditorComponent = (props: {mediaEditor: MediaEditor}) => {
  const mediaEditor = props.mediaEditor;
  const canvas = mediaEditor.canvas;

  const [settings, setSettings] = mediaEditor.settingsStore;

  const [stackDone, setStackDone] = createSignal<MediaEditorAction[]>(mediaEditor.stackDone);
  const [stackUndone, setStackUndone] = createSignal<MediaEditorAction[]>(mediaEditor.stackUndone);

  const stackDonePush = (item: MediaEditorAction, clearUndone: boolean = true) => {
    let stack = stackDone();
    if(item.action == 'filter') {
      stack = stack.filter(pop => (!(item.action == pop.action && item.type == pop.type)));
      if(item.amount == 0) {
        setStackDone(stack);
      } else {
        setStackDone([...stack, item]);
      }
    } else {
      setStackDone([...stack, item]);
    }
    if(clearUndone) {
      setStackUndone([]);
    }
  };

  const stackDonePop = () => {
    const stack = stackDone();
    const pop = stack.pop();
    setStackDone(stack);
    return pop;
  };

  const stackUndonePush = (item: MediaEditorAction) => setStackUndone([...stackUndone(), item]);
  const stackUndonePop = () => {
    const stack = stackUndone();
    const pop = stack.pop();
    setStackUndone(stack);
    return pop;
  };

  MediaEditorContext();
  const MEProvider = MediaEditorProvider();

  return (
    <MEProvider value={{
      stackDone,
      stackDonePush,
      stackDonePop,
      stackUndone,
      stackUndonePush,
      stackUndonePop,
      canvas,
      mediaEditor,
      settings,
      setSettings,
      setStackDone,
      setStackUndone
    }}>
      <div>
        <MediaEditorCanvas />
        <MediaEditorSidebar />
      </div>
    </MEProvider>
  );
}

let mediaEditorFontsLoaded = false;
const MediaEditorLoadFonts = () => {
  if(mediaEditorFontsLoaded) return;
  mediaEditorFontsLoaded = true;
  const style = document.createElement('style');
  MediaEditorTextFonts.forEach(async(font) => {
    const fontFace = `
        @font-face {
            font-family: '${font.family}';
            src: url('${font.url}') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
    `;
    style.appendChild(document.createTextNode(fontFace));
  });
  document.head.appendChild(style);
};

const mediaEditorWorker = new MediaEditorWorker();

class MediaEditor {
  private id: string;
  private container: HTMLDivElement;
  protected navigationItem: NavigationItem;
  private originalImageData: ImageData;
  private onApplyCallback: (blob: Blob) => void;

  public canvas: HTMLCanvasElement;
  public stackDone: MediaEditorAction[] = [];
  public stackUndone: MediaEditorAction[] = [];

  public imageElement: HTMLImageElement;

  public settings: MediaEditorSettings = {
    general: {
      activeTab: 'filters',
      width: 0,
      height: 0
    },
    filters: {
      brightness: 0,
      contrast: 0,
      enhance: 0,
      fade: 0,
      grain: 0,
      highlights: 0,
      saturation: 0,
      shadows: 0,
      sharpen: 0,
      vignette: 0,
      warmth: 0
    },
    crop: {
      activeAspectRatio: 'original',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0
    },
    text: {
      align: MediaEditorTextInitialSettings['align'],
      color: MediaEditorTextInitialSettings['color'],
      font: MediaEditorTextInitialSettings['font'],
      size: MediaEditorTextInitialSettings['size'],
      frame: MediaEditorTextInitialSettings['frame'],
      activeID: ''
    },
    paint: {
      tool: 'pen',
      settings: {
        arrow: {
          color: MediaEditorColorPalette[3],
          size: 8
        },
        blur: {
          color: MediaEditorColorPalette[0],
          size: 15
        },
        brush: {
          color: MediaEditorColorPalette[2],
          size: 15
        },
        eraser: {
          color: MediaEditorColorPalette[0],
          size: 15
        },
        neon: {
          color: MediaEditorColorPalette[5],
          size: 15
        },
        pen: {
          color: MediaEditorColorPalette[1],
          size: 6
        }
      }
    }
  };

  public settingsStore = createStore<MediaEditorSettings>(this.settings);

  public isShowing: boolean = false;

  constructor(objectURL: string) {
    this.id = randomLong();
    this.canvas = document.createElement('canvas');

    mediaEditorWorker.addEventListener('message', this.onWorkerMessage.bind(this));

    (async() => {
      const image = new Image();
      await renderImageFromUrlPromise(image, objectURL);

      this.canvas.width = image.width;
      this.canvas.height = image.height;
      if(this.canvas.width != this.settings.general.width) {
        this.settingsStore[1]('general', 'width', this.canvas.width);
      }
      if(this.canvas.height != this.settings.general.height) {
        this.settingsStore[1]('general', 'height', this.canvas.height);
      }
      this.canvas.getContext('2d').drawImage(image, 0, 0);
      this.originalImageData = this.canvas.getContext('2d').getImageData(0, 0, image.width, image.height);
    })();
  }

  private onWorkerMessage(e: { data: MediaEditorWorkerResponse; }) {
    const {type, data, instance} = e.data as MediaEditorWorkerResponse;
    if(instance != this.id) return;

    switch(type) {
      case 'render':
        this.canvas.width = data.width;
        this.canvas.height = data.height;
        if(this.canvas.width != this.settings.general.width) {
          this.settingsStore[1]('general', 'width', this.canvas.width);
        }
        if(this.canvas.height != this.settings.general.height) {
          this.settingsStore[1]('general', 'height', this.canvas.height);
        }
        this.canvas.getContext('2d').putImageData(data, 0, 0);
        break;
    }
  }

  public show() {
    MediaEditorLoadFonts();
    mediaEditorActiveContext.id = this.id;
    this.isShowing = true;
    const container = this.container = document.createElement('div');
    container.id = 'media-editor-container';
    document.getElementById('main-columns').appendChild(container);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.originalImageData.width;
    this.canvas.height = this.originalImageData.height;
    this.canvas.getContext('2d').putImageData(this.originalImageData, 0, 0);

    createRoot(() => {
      render(() => <MediaEditorComponent mediaEditor={this} />, container);
    });

    this.navigationItem = {
      type: 'popup',
      onPop: () => {
        this.hide();
      }
    };

    appNavigationController.pushItem(this.navigationItem);
    this.render(this.canvas, this.stackDone);
  }

  public hide() {
    this.isShowing = false;
    if(this.navigationItem) {
      appNavigationController.removeItem(this.navigationItem);
      this.navigationItem = undefined;
    }
    this.container?.remove();
  }

  public async apply() {
    const canvasSizeAspectRatio = this.canvas.width / this.canvas.offsetWidth;

    const ctx = this.canvas.getContext('2d');

    ctx.drawImage(this.canvas, 0, 0);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = this.settings.crop.width > 0 ? (this.settings.crop.width * canvasSizeAspectRatio) : this.canvas.width;
    finalCanvas.height = this.settings.crop.height > 0 ? (this.settings.crop.height * canvasSizeAspectRatio) : this.canvas.height;

    const promises = this.stackDone.filter(item => item.action === 'paint').map((action) => {
      return new Promise((resolve) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        render(() => <MediaEditorPaintSVGDefs />, svg);
        if((action as MediaEditorActionPaint).defs) {
          (action as MediaEditorActionPaint).defs.forEach((def) => {
            svg.querySelector('defs').append(def);
          });
        }
        svg.appendChild((action as MediaEditorActionPaint).path);
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
          (action as MediaEditorActionPaint).img = img;
          resolve(true);
        };
        img.width = this.canvas.offsetWidth;
        img.height = this.canvas.offsetHeight;
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      });
    });

    await Promise.all(promises);

    this.stackDone
    .filter(item => MediaEditorDrawPipelineFilters.includes(item.action))
    .forEach(action => {
      switch(action.action) {
        case 'sticker': {
          const canvasSource = document.getElementById(action.id).children[0] as (HTMLCanvasElement | HTMLImageElement | HTMLVideoElement);
          const x = action.x * canvasSizeAspectRatio;
          const y = action.y * canvasSizeAspectRatio;
          const width = action.width * canvasSizeAspectRatio;
          const height = action.height * canvasSizeAspectRatio;
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(action.rotation * Math.PI / 180);
          ctx.translate(-centerX, -centerY);
          ctx.drawImage(canvasSource, x, y, width, height);
          ctx.restore();
          break;
        }
        case 'text': {
          ctx.save();

          ctx.font = `${action.size * canvasSizeAspectRatio}px ${action.font}`;
          ctx.textBaseline = 'top';
          const measure = ctx.measureText(action.text);

          const span = document.getElementById(action.id).children[0];
          const canvasRect = this.canvas.getBoundingClientRect();
          const spanRect = span.getBoundingClientRect();
          const x = (spanRect.left - canvasRect.left) * canvasSizeAspectRatio;
          const y = (spanRect.top - canvasRect.top) * canvasSizeAspectRatio;

          const centerX = x + (8 * canvasSizeAspectRatio) + measure.width / 2;
          const centerY = y + measure.fontBoundingBoxAscent / 2;

          ctx.translate(centerX, centerY);
          ctx.rotate(action.rotation * Math.PI / 180);
          ctx.translate(-centerX, -centerY);

          ctx.fillStyle = rgbaToHexa(action.color);

          if(action.frame === 'black') {
            const strokeSize = Math.max(Math.round(action.size / 10), 1) * canvasSizeAspectRatio;
            ctx.lineWidth = strokeSize;
            ctx.strokeStyle = rgbaToHexa(action.color);
            ctx.strokeText(action.text, x + (8 * canvasSizeAspectRatio), y + measure.fontBoundingBoxAscent);
            ctx.fillStyle = JSON.stringify(action.color) === JSON.stringify([255, 255, 255]) ? '#000000' : '#FFFFFF';
          } else if(action.frame === 'white') {
            // ctx.fillRect(x, y, spanRect.width * canvasSizeAspectRatio, spanRect.height * canvasSizeAspectRatio);
            // There is an issue when the text is rotateted with path, Though there is not enough time to fix
            ctx.beginPath();
            ctx.roundRect(x, y, spanRect.width * canvasSizeAspectRatio, spanRect.height * canvasSizeAspectRatio, 8 * canvasSizeAspectRatio);
            ctx.fill();
            ctx.fillStyle = JSON.stringify(action.color) === JSON.stringify([255, 255, 255]) ? '#000000' : '#FFFFFF';
          }

          ctx.fillText(action.text, x + (8 * canvasSizeAspectRatio), y + measure.fontBoundingBoxAscent);
          ctx.restore();
          break;
        }
        case 'paint': {
          ctx.drawImage(action.img, 0, 0, action.img.width, action.img.height, 0, 0, this.canvas.width, this.canvas.height);
        }
      }
    });

    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.save();
    finalCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
    finalCtx.rotate(this.settings.crop.rotation * Math.PI / 180);
    finalCtx.translate(finalCanvas.width / -2, finalCanvas.height / -2);

    finalCtx.drawImage(
      this.canvas,
      (this.settings.crop.x * canvasSizeAspectRatio), (this.settings.crop.y * canvasSizeAspectRatio), (finalCanvas.width), (finalCanvas.height),
      0, 0, finalCanvas.width, finalCanvas.height
    );

    finalCtx.restore();

    finalCanvas.toBlob((blob) => {
      this.onApplyCallback(blob);
      this.hide();
    });
  }

  public onApply(callback: (blob: Blob) => void) {
    this.onApplyCallback = callback;
  }

  public render(canvas: HTMLCanvasElement, actions: MediaEditorAction[], fresh: boolean = true) {
    const ctx = canvas.getContext('2d');
    const imageData = fresh ? (new ImageData(new Uint8ClampedArray(this.originalImageData.data), this.originalImageData.width, this.originalImageData.height)) : ctx.getImageData(0, 0, canvas.width, canvas.height);

    mediaEditorWorker.postMessage({
      type: 'render',
      instance: this.id,
      data: {
        imageData: imageData,
        actions: actions.filter(item => !(MediaEditorDrawPipelineFilters.includes(item.action))),
        fresh: fresh
      }
    } as MediaEditorWorkerMessageRender);
  }

  public dispose() {
    mediaEditorWorker.removeEventListener('message', this.onWorkerMessage);
  }
}

export default MediaEditor;
