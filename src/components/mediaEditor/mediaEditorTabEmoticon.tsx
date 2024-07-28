import {createEffect, createSignal, onMount} from 'solid-js';
import rootScope from '../../lib/rootScope';
import {EmoticonsDropdown, EMOTICONSSTICKERGROUP} from '../emoticonsDropdown';
import StickersTab from '../emoticonsDropdown/tabs/stickers';
import findUpTag from '../../helpers/dom/findUpTag';
import {useMediaEditor} from './mediaEditorContext';
import MediaEditorDRR from './mediaEditorDRR';
import {createStore} from 'solid-js/store';
import wrapSticker from '../wrappers/sticker';
import {MyDocument} from '../../lib/appManagers/appDocsManager';
import {randomLong} from '../../helpers/random';
import SuperStickerRenderer from '../emoticonsDropdown/tabs/SuperStickerRenderer';
import {MiddlewareHelper} from '../../helpers/middleware';

export type MediaEditorActionSticker = {
  action: 'sticker',
  type: 'static',
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  aspectRatio: number,
  rotation: number,
  doc: MyDocument,
};

export const MediaEditorCanvasLayerSticker = (props: {action: MediaEditorActionSticker}) => {
  let element: HTMLDivElement;

  const {canvas} = useMediaEditor();
  const boundingRect = canvas.getBoundingClientRect();

  const [position, setPosition] = createStore({x: props.action.x, y: props.action.y});
  const [size, setSize] = createStore({width: props.action.width, height: props.action.height});
  const [rotation, setRotation] = createSignal(props.action.rotation);

  createEffect(() => {
    props.action.x = position.x;
    props.action.y = position.y;
    props.action.width = size.width;
    props.action.height = size.height;
    props.action.rotation = rotation();
  });

  onMount(() => {
    wrapSticker({
      doc: props.action.doc,
      div: element,
      width: props.action.width,
      height: props.action.height,
      play: true,
      loop: true
    })
  });

  return (
    <MediaEditorDRR
      hideHandles={true}
      aspectRatio={props.action.aspectRatio}
      confine={true}
      drag={true}
      helperGrid={false}
      minHeight={64}
      minWidth={64}
      position={position}
      setPosition={setPosition}
      resize={true}
      rotate={true}
      rotation={rotation}
      setRotation={setRotation}
      size={size}
      setSize={setSize}
      parentRect={boundingRect}
      pixelBased={true}
      children={
        <div id={props.action.id} ref={element}></div>
      }
    />
  );
}

const MediaEditorTabEmoticon = () => {
  let container: HTMLDivElement;

  const {stackDonePush, canvas} = useMediaEditor();

  const emoticonsDropdown = new EmoticonsDropdown();
  const stickersTab = new StickersTab(rootScope.managers);
  stickersTab.emoticonsDropdown = emoticonsDropdown;
  stickersTab.container.classList.remove('tabs-tab');

  onMount(() => {
    const superStickersRenderer = (middlewareHelper: MiddlewareHelper) => {
      const superStickerRenderer = new SuperStickerRenderer({
        regularLazyLoadQueue: emoticonsDropdown.lazyLoadQueue,
        group: EMOTICONSSTICKERGROUP,
        managers: rootScope.managers,
        intersectionObserverInit: {root: container}
      });

      const rendererLazyLoadQueue = superStickerRenderer.lazyLoadQueue;
      emoticonsDropdown.addLazyLoadQueueRepeat(
        rendererLazyLoadQueue,
        superStickerRenderer.processInvisible,
        middlewareHelper.get()
      );

      return superStickerRenderer;
    };

    stickersTab.init({root: container}, async(e: Event) => {
      const target = findUpTag(e.target as HTMLElement, 'DIV');
      if(!target) return false;

      const docId = target.dataset.docId;
      if(!docId) return false;

      const doc = await rootScope.managers.appDocsManager.getDoc(docId);

      const size = doc.attributes.find(item => (item._ === 'documentAttributeImageSize' || item._ === 'documentAttributeVideo'));

      if(!(size && 'w' in size && 'h' in size)) return;

      stackDonePush({
        action: 'sticker',
        type: 'static',
        doc: doc,
        aspectRatio: size.w / size.h,
        height: size.h,
        width: size.w,
        rotation: 0,
        x: (canvas.offsetWidth - size.w) / 2,
        y: (canvas.offsetHeight - size.h) / 2,
        id: randomLong()
      })
    }, superStickersRenderer);
  });

  return (
    <div id='media-editor-tab-emoticon' class='media-editor-tab' ref={container}>
      {stickersTab.container}
    </div>
  );
}

export default MediaEditorTabEmoticon;
