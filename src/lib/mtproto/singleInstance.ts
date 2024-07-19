/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 *
 * Originally from:
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */

import App from '../../config/app';
import {MOUNT_CLASS_TO} from '../../config/debug';
import tabId from '../../config/tabId';
import IS_SHARED_WORKER_SUPPORTED from '../../environment/sharedWorkerSupport';
import EventListenerBase from '../../helpers/eventListenerBase';
import idleController from '../../helpers/idleController';
import {logger} from '../logger';
import {rootScopeInstances} from '../rootScope';
import {sessionStorageInstances} from '../sessionStorage';
import {apiManagerProxyInstances} from './mtprotoworker';

export type AppInstance = {
  id: number,
  idle: boolean,
  time: number
};

export type InstanceDeactivateReason = 'version' | 'tabs';

const CHECK_INSTANCE_INTERVAL = 5000;
const DEACTIVATE_TIMEOUT = 30000;
const MULTIPLE_TABS_THRESHOLD = 20000;
const IS_MULTIPLE_TABS_SUPPORTED = IS_SHARED_WORKER_SUPPORTED;

export class SingleInstance extends EventListenerBase<{
  activated: () =>  void,
  deactivated: (reason: InstanceDeactivateReason) => void
}> {
  private instanceId: number;
  private started: boolean;
  private masterInstance: boolean;
  private deactivateTimeout: number;
  private deactivated: InstanceDeactivateReason;
  private log = logger('INSTANCE');

  private dbInstance: string;

  constructor(dbInstance: string = 'default') {
    super(false);

    this.log = logger('INSTANCE');
    this.instanceId = tabId;
    this.dbInstance = dbInstance;
  }

  public get deactivatedReason() {
    return this.deactivated;
  }

  public start() {
    this.reset();

    if(!this.started/*  && !Config.Navigator.mobile && !Config.Modes.packed */) {
      this.started = true;

      idleController.addEventListener('change', this.checkInstance);
      setInterval(this.checkInstance, CHECK_INSTANCE_INTERVAL);
      this.checkInstance();

      try {
        document.documentElement.addEventListener('beforeunload', this.clearInstance);
      } catch(e) {}
    }
  }

  private reset() {
    this.masterInstance = false;
    this.clearDeactivateTimeout();
    this.deactivated = undefined;
  }

  private clearInstance = () => {
    if(this.masterInstance && !this.deactivated) {
      this.log.warn('clear master instance');
      sessionStorageInstances[this.dbInstance].delete('xt_instance');
    }
  };

  public activateInstance() {
    if(this.deactivated) {
      this.reset();
      this.checkInstance(false);
      this.dispatchEvent('activated');
    }
  }

  private deactivateInstance(reason: InstanceDeactivateReason) {
    if(this.masterInstance || this.deactivated) {
      return;
    }

    this.log.warn('deactivate', reason);
    this.clearDeactivateTimeout();
    this.deactivated = reason;

    this.dispatchEvent('deactivated', reason);
  }

  private clearDeactivateTimeout() {
    if(this.deactivateTimeout) {
      clearTimeout(this.deactivateTimeout);
      this.deactivateTimeout = 0;
    }
  }

  private checkInstance = async(idle = idleController.isIdle) => {
    if(this.deactivated) {
      return;
    }

    const time = Date.now();
    const newInstance: AppInstance = {
      id: this.instanceId,
      idle,
      time
    };

    await sessionStorageInstances[this.dbInstance].waitUntilPrefixInitialized();

    const [curInstance, build = App.build] = await Promise.all([
      sessionStorageInstances[this.dbInstance].get('xt_instance', false),
      sessionStorageInstances[this.dbInstance].get('k_build', false)
    ]);

    if(build > App.build) {
      this.masterInstance = false;
      rootScopeInstances[this.dbInstance].managers.networkerFactory.stopAll();
      this.deactivateInstance('version');
      apiManagerProxyInstances[this.dbInstance].toggleStorages(false, false);
      return;
    } else if(IS_MULTIPLE_TABS_SUPPORTED) {
      sessionStorageInstances[this.dbInstance].set({xt_instance: newInstance});
      return;
    }

    // this.log('check instance', newInstance, curInstance)
    if(!idle ||
        !curInstance ||
        curInstance.id === this.instanceId ||
        curInstance.time < (time - MULTIPLE_TABS_THRESHOLD)) {
      sessionStorageInstances[this.dbInstance].set({xt_instance: newInstance});

      if(!this.masterInstance) {
        this.masterInstance = true;
        rootScopeInstances[this.dbInstance].managers.networkerFactory.startAll();
        this.log.warn('now master instance', newInstance);
      }

      this.clearDeactivateTimeout();
    } else if(this.masterInstance) {
      this.masterInstance = false;
      rootScopeInstances[this.dbInstance].managers.networkerFactory.stopAll();
      this.log.warn('now idle instance', newInstance);
      this.deactivateTimeout ||= window.setTimeout(() => this.deactivateInstance('tabs'), DEACTIVATE_TIMEOUT);
    }
  };
}

const singleInstance = new SingleInstance();
MOUNT_CLASS_TO && (MOUNT_CLASS_TO.singleInstance = singleInstance);
export default singleInstance;

export const multiInstance: {[key: string]: SingleInstance} = {
  'default': singleInstance
}
