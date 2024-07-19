/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {State} from '../../config/state';
import {rootScopeInstances} from '../rootScope';
import {StateStorage, stateStorageInstances} from '../stateStorage';
import setDeepProperty, {splitDeepPath} from '../../helpers/object/setDeepProperty';
import MTProtoMessagePort from '../mtproto/mtprotoMessagePort';

export class AppStateManager {
  private state: State = {} as any;
  private storage;

  // ! for mtproto worker use only
  public newVersion: string;
  public oldVersion: string;
  public userId: UserId;

  private dbInstance: string;

  constructor(dbInstance: string = 'default') {
    this.dbInstance = dbInstance;
    if(!(dbInstance in stateStorageInstances)) {
      stateStorageInstances[dbInstance] = new StateStorage(dbInstance);
    }
    this.storage = stateStorageInstances[dbInstance];
  }

  public getState() {
    return Promise.resolve(this.state);
  }

  public setByKey(key: string, value: any) {
    setDeepProperty(this.state, key, value);

    const first = splitDeepPath(key)[0] as keyof State;
    if(first === 'settings') {
      const rootScope = rootScopeInstances[this.dbInstance];
      rootScope.dispatchEvent('settings_updated', {key, value, settings: this.state.settings});
    }

    return this.pushToState(first, this.state[first]);
  }

  public pushToState<T extends keyof State>(key: T, value: State[T], direct = true, onlyLocal?: boolean) {
    if(direct) {
      this.state[key] = value;
    }

    return this.setKeyValueToStorage(key, value, onlyLocal);
  }

  public setKeyValueToStorage<T extends keyof State>(key: T, value: State[T] = this.state[key], onlyLocal?: boolean) {
    MTProtoMessagePort.getInstance<false>().invokeVoid('mirror', {name: 'state', key, value});

    return this.storage.set({
      [key]: value
    }, onlyLocal);
  }

  /* public resetState() {
    for(let i in this.state) {
      // @ts-ignore
      this.state[i] = false;
    }
    sessionStorage.set(this.state).then(() => {
      location.reload();
    });
  } */
}

const appStateManager = new AppStateManager();
export default appStateManager;

export const appStateManagerInstances: {[key: string]: AppStateManager} = {
  'default': appStateManager
}
