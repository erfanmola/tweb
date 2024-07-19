/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

// just to include
import '../polyfill';
import '../../helpers/peerIdPolyfill';

import cryptoWorker from '../crypto/cryptoMessagePort';
import {setEnvironment} from '../../environment/utils';
import {AppStateManager, appStateManagerInstances} from '../appManagers/appStateManager';
import transportController from './transports/controller';
import MTProtoMessagePort from './mtprotoMessagePort';
import {createResetStoragePromise, RESET_STORAGES_PROMISE_INSTANCES} from '../appManagers/utils/storages/resetStoragesPromise';
import {AppManagersManager, appManagersManagerInstances} from '../appManagers/appManagersManager';
import listenMessagePort from '../../helpers/listenMessagePort';
import {logger} from '../logger';
import {State} from '../../config/state';
import toggleStorages from '../../helpers/toggleStorages';
import {AppTabsManager, appTabsManagerInstances} from '../appManagers/appTabsManager';
import callbackify from '../../helpers/callbackify';
import Modes from '../../config/modes';
import copy from '../../helpers/object/copy';

const log = logger('MTPROTO');
// let haveState = false;

const instanceId = self.name;

const port = new MTProtoMessagePort<false>();
port.addMultipleEventsListeners({
  environment: (environment) => {
    setEnvironment(environment);

    if(import.meta.env.VITE_MTPROTO_AUTO && Modes.multipleTransports) {
      transportController.waitForWebSocket();
    }
  },

  crypto: ({method, args}) => {
    return cryptoWorker.invokeCrypto(method as any, ...args as any);
  },

  state: ({state, resetStorages, pushedKeys, newVersion, oldVersion, userId}) => {
    // if(haveState) {
    //   return;
    // }

    log('got state', state, pushedKeys);

    if(!(instanceId in appStateManagerInstances)) {
      appStateManagerInstances[instanceId] = new AppStateManager(instanceId);
    }

    appStateManagerInstances[instanceId].userId = userId;
    appStateManagerInstances[instanceId].newVersion = newVersion;
    appStateManagerInstances[instanceId].oldVersion = oldVersion;

    if(!(instanceId in RESET_STORAGES_PROMISE_INSTANCES)) {
      RESET_STORAGES_PROMISE_INSTANCES[instanceId] = createResetStoragePromise();
    }

    RESET_STORAGES_PROMISE_INSTANCES[instanceId].resolve({
      storages: resetStorages,
      callback: async() => {
        (Object.keys(state) as any as (keyof State)[]).forEach(async(key) => {
          appStateManagerInstances[instanceId].pushToState(key, state[key], true, !pushedKeys.includes(key));
        });
      }
    });
    // haveState = true;
  },

  toggleStorages: ({enabled, clearWrite}) => {
    return toggleStorages(enabled, clearWrite);
  },

  event: (payload, source) => {
    log('will redirect event', payload, source);
    port.invokeExceptSource('event', payload, source);
  },

  serviceWorkerOnline: (online) => {
    appManagersManagerInstances[instanceId].isServiceWorkerOnline = online;
  },

  serviceWorkerPort: (payload, source, event) => {
    appManagersManagerInstances[instanceId].onServiceWorkerPort(event);
    port.invokeVoid('receivedServiceMessagePort', undefined, source);
  },

  createObjectURL: (blob) => {
    return URL.createObjectURL(blob);
  }

  // socketProxy: (task) => {
  //   const socketTask = task.payload;
  //   const id = socketTask.id;

  //   const socketProxied = socketsProxied.get(id);
  //   if(socketTask.type === 'message') {
  //     socketProxied.dispatchEvent('message', socketTask.payload);
  //   } else if(socketTask.type === 'open') {
  //     socketProxied.dispatchEvent('open');
  //   } else if(socketTask.type === 'close') {
  //     socketProxied.dispatchEvent('close');
  //     socketsProxied.delete(id);
  //   }
  // },
});

log('MTProto start');

if(!(instanceId in appManagersManagerInstances)) {
  appManagersManagerInstances[instanceId] = new AppManagersManager(instanceId);
}

if(!(instanceId in appTabsManagerInstances)) {
  appTabsManagerInstances[instanceId] = new AppTabsManager();
}

appManagersManagerInstances[instanceId].start();
appManagersManagerInstances[instanceId].getManagers();
appTabsManagerInstances[instanceId].start();

let isFirst = true;
// let sentHello = false;
listenMessagePort(port, (source) => {
  appTabsManagerInstances[instanceId].addTab(source);
  if(isFirst) {
    isFirst = false;
  } else {
    callbackify(appManagersManagerInstances[instanceId].getManagers(), (managers) => {
      managers.thumbsStorage.mirrorAll(source);
      managers.appPeersManager.mirrorAllPeers(source);
      managers.appMessagesManager.mirrorAllMessages(source);
    });
  }

  // port.invokeVoid('hello', undefined, source);
  // if(!sentHello) {
  //   port.invokeVoid('hello', undefined, source);
  //   sentHello = true;
  // }
}, (source) => {
  appTabsManagerInstances[instanceId].deleteTab(source);
});
