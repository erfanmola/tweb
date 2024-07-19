/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import deferredPromise, {CancellablePromise} from '../../../../helpers/cancellablePromise';
import type {StoragesResults} from './loadStorages';

export const createResetStoragePromise = () => {
  const RESET_STORAGES_PROMISE: CancellablePromise<{
    storages: Set<keyof StoragesResults>,
    callback: () => void
  }> = deferredPromise();

  return RESET_STORAGES_PROMISE;
}

const RESET_STORAGES_PROMISE = createResetStoragePromise();
export default RESET_STORAGES_PROMISE;

export const RESET_STORAGES_PROMISE_INSTANCES: {[key: string]: typeof RESET_STORAGES_PROMISE} = {
  'default': RESET_STORAGES_PROMISE
}
