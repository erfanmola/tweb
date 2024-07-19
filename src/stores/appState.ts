import {createRoot} from 'solid-js';
import {createStore, reconcile, SetStoreFunction, unwrap} from 'solid-js/store';
import {State} from '../config/state';
import {rootScopeInstances} from '../lib/rootScope';

const [appState, _setAppState] = createRoot(() => createStore<State>({} as any));
const createRootInstances: {[type: string]: [State, SetStoreFunction<State>]} = {
  'default': [appState, _setAppState]
};

const setAppState: typeof _setAppState = (...args: any[]) => {
  const key = args[0];
  // @ts-ignore
  _setAppState(...args);
  // @ts-ignore
  rootScopeInstances['default'].managers.appStateManager.setByKey(key, unwrap(appState[key]));
};

const setAppStateSilent = (key: any, value?: any, dbInstance: string = 'default') => {
  if(!(dbInstance in createRootInstances)) {
    createRootInstances[dbInstance] = createRoot(() => createStore<State>({} as any));
  }

  if(typeof(key) === 'object') {
    createRootInstances[dbInstance][1](key);
    return;
  }

  _setAppState(key, reconcile(value));
};

const useAppState = (dbInstance: string = 'default') => {
  if(!(dbInstance in createRootInstances)) {
    createRootInstances[dbInstance] = createRoot(() => createStore<State>({} as any));
  }

  return createRootInstances[dbInstance];
};

export {
  appState,
  useAppState,
  setAppState,
  setAppStateSilent,
  createRootInstances
};
