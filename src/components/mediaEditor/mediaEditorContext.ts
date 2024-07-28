import {Accessor, Context, createContext, Setter, useContext} from 'solid-js';
import MediaEditor, {MediaEditorAction, MediaEditorSettings} from './mediaEditor';
import {SetStoreFunction} from '../../vendor/solid/store/types';

export type MediaEditorContextType = {
    stackDone: Accessor<MediaEditorAction[]>,
    stackUndone: Accessor<MediaEditorAction[]>,
    stackDonePush: (item: MediaEditorAction, clearUndone?: boolean) => void,
    stackUndonePush: (item: MediaEditorAction) => MediaEditorAction[],
    stackDonePop: () => MediaEditorAction,
    stackUndonePop: () => MediaEditorAction,
    canvas: HTMLCanvasElement,
    mediaEditor: MediaEditor,
    settings: MediaEditorSettings,
    setSettings: SetStoreFunction<MediaEditorSettings>,
    setStackDone: Setter<MediaEditorAction[]>,
    setStackUndone: Setter<MediaEditorAction[]>,
};

export const mediaEditorActiveContext = {
  id: ''
};

const MediaEditorContexts: {[key: string]: Context<MediaEditorContextType>} = {};

export const MediaEditorContext = () => {
  if(mediaEditorActiveContext.id) {
    if(!(mediaEditorActiveContext.id in MediaEditorContexts)) {
      MediaEditorContexts[mediaEditorActiveContext.id] = createContext<MediaEditorContextType | undefined>(undefined);
    }
    return MediaEditorContexts[mediaEditorActiveContext.id];
  }
};

export const MediaEditorProvider = () => MediaEditorContexts[mediaEditorActiveContext.id].Provider

export const useMediaEditor = () => {
  const context = useContext(MediaEditorContexts[mediaEditorActiveContext.id]);
  if(!context) {
    throw new Error('useMediaEditor must be used within a MediaEditorProvider');
  }
  return context;
};
