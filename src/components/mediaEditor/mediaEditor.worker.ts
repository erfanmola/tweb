import {MediaEditorAction} from './mediaEditor';
import {MediaEditorActionCrop} from './mediaEditorTabCrop';
import {MediaEditorActionFilter} from './mediaEditorTabFilters';
import {MediaEditorFilterUtils, MediaEditorCropUtils} from './mediaEditorUtils';

export type MediaEditorWorkerMessage = MediaEditorWorkerMessageRender;

export type MediaEditorWorkerResponse = MediaEditorWorkerResponseRender;

export type MediaEditorWorkerMessageRender = {
  type: 'render',
  instance: string,
  data: {
    imageData: ImageData,
    actions: MediaEditorAction[],
    fresh: boolean
  }
};

export type MediaEditorWorkerResponseRender = {
  type: 'render',
  instance: string,
  data: ImageData
};

class MediaEditorActionsManager {
  static actionFilter(pixels: Uint8ClampedArray, action: MediaEditorActionFilter, width: number, height: number) {
    switch(action.type) {
      case 'enhance':
        // Amount ranges from 0 to 1
        pixels = MediaEditorFilterUtils.enhance(pixels, width, height, MediaEditorActionsManager.clampWithRatio(action.amount, 0, 100, 0, 1));
        break;
      case 'brightness':
        // Amount ranges from 0 to 2, we cap it at 0.25 and 1.75 to prevent extreme
        pixels = MediaEditorFilterUtils.brightness(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, -100, 100, 0.25, 1.75));
        break;
      case 'contrast':
        // Amount ranges from -255 to 255, we cap it at -192 and 192 to prevent extreme
        pixels = MediaEditorFilterUtils.contrast(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, -100, 100, -192, 192));
        break;
      case 'saturation':
        // Amount ranges from 0 to 2, we cap it at 0.25 and 1.75 to prevent extreme
        pixels = MediaEditorFilterUtils.saturation(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, -100, 100, 0.25, 1.75));
        break;
      case 'warmth':
        // Amount ranges from -100 to 100
        pixels = MediaEditorFilterUtils.warmth(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, -100, 100, -100, 100));
        break;
      case 'fade':
        // Amount ranges from 0 to 1, we cap it at 0.75 to prevent extreme
        pixels = MediaEditorFilterUtils.fade(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, 0, 100, 0, 0.75));
        break;
      case 'highlights':
        // Amount ranges from -1 to 1, we cap it at -0.125 and 0.125 to prevent extreme, it looks trash to be honest
        pixels = MediaEditorFilterUtils.highlights(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, -100, 100, -0.125, 0.125));
        break;
      case 'shadows':
        // Amount ranges from -1 to 1, we cap it at -0.125 and 0.125 to prevent extreme, it looks trash to be honest
        pixels = MediaEditorFilterUtils.shadows(pixels, MediaEditorActionsManager.clampWithRatio(action.amount, -100, 100, -0.125, 0.125));
        break;
      case 'vignette':
        // Amount ranges from 0 to 1
        pixels = MediaEditorFilterUtils.vignette(pixels, width, height, MediaEditorActionsManager.clampWithRatio(action.amount, 0, 100, 0, 1));
        break;
      case 'grain':
        // Amount ranges from 0 to 1, we cap it at 0 to 0.25 to prevent extreme
        pixels = MediaEditorFilterUtils.grain(pixels, width, height, MediaEditorActionsManager.clampWithRatio(action.amount, 0, 100, 0, 0.25));
        break;
      case 'sharpen':
        // Amount ranges from 0 to 1, we cap it at 0 to 0.75 to prevent extreme
        pixels = MediaEditorFilterUtils.sharpen(pixels, width, height, MediaEditorActionsManager.clampWithRatio(action.amount, 0, 100, 0, 0.75));
        break;
    }

    return pixels;
  }

  static actionCrop(pixels: Uint8ClampedArray, action: MediaEditorActionCrop, width: number, height: number) {
    switch(action.type) {
      case 'flip':
        pixels = MediaEditorCropUtils.flip(pixels, width, height);
        break;
      case 'rotate':
        const rotate = MediaEditorCropUtils.rotate(pixels, action.degree, width, height);
        pixels = rotate.pixels;
        width = rotate.width;
        height = rotate.height;
        break;
    }

    return {pixels, width, height};
  }

  static clampWithRatio(v1: number, x1: number, y1: number, x2: number, y2: number) {
    const clampedValue = Math.max(x1, Math.min(v1, y1));
    const ratio = (clampedValue - x1) / (y1 - x1);
    const scaledValue = x2 + ratio * (y2 - x2);

    return scaledValue;
  }
}

const renderPipelineOrder = {
  // leave the first index empty so the first digit never starts with 0, '0' + n results in something like 08 that parseInt() of it is in another base
  // only 'filter' and 'crop' are processed here, the rest is defined to not mess up types, also for future cases
  actions: ['', 'filter', 'crop', 'sticker', 'text', 'paint'],
  sticker: ['static'],
  text: ['default'],
  paint: ['default'],
  crop: ['flip', 'rotate'],
  filter: [
    'enhance',
    'brightness',
    'contrast',
    'saturation',
    'warmth',
    'shadows',
    'highlights',
    'sharpen',
    'grain',
    'fade',
    'vignette'
  ]
};

onmessage = (e) => {
  const {type, data, instance} = e.data as MediaEditorWorkerMessage;

  switch(type) {
    case 'render':
      let pixels = data.imageData.data;
      let width = data.imageData.width;
      let height = data.imageData.height;

      const actions = data.actions.sort((a, b) => {
        const aWeight = parseInt(`${renderPipelineOrder.actions.indexOf(a.action)}${renderPipelineOrder[a.action].indexOf(a.type).toString().padStart(2, '0')}`);
        const bWeight = parseInt(`${renderPipelineOrder.actions.indexOf(b.action)}${renderPipelineOrder[b.action].indexOf(b.type).toString().padStart(2, '0')}`);
        if(aWeight && bWeight) {
          return aWeight - bWeight;
        }
      });

      for(const action of actions) {
        switch(action.action) {
          case 'filter':
            pixels = MediaEditorActionsManager.actionFilter(pixels, action, width, height);
            break;
          case 'crop':
            const crop = MediaEditorActionsManager.actionCrop(pixels, action, width, height);
            pixels = crop.pixels;
            width = crop.width;
            height = crop.height;
            break;
        }
      };

      const imageData = new ImageData(pixels, width, height, {colorSpace: data.imageData.colorSpace});

      postMessage({
        type: 'render',
        instance: instance,
        data: imageData
      } as MediaEditorWorkerResponseRender);
      break;
  }
};
