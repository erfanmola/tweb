import {RootScope, rootScopeInstances} from '../lib/rootScope';
import {getProxiedManagersInstance} from '../lib/appManagers/getProxiedManagers';
import I18n from '../lib/langPack';
import {apiManagerProxyInstances, ApiManagerProxy} from '../lib/mtproto/mtprotoworker';
import {multiInstance, SingleInstance} from '../lib/mtproto/singleInstance';
import instanceManager from './instances';

export const initializeInstanceHandlers = () => {
  instanceManager.getPassiveInstanceIDs().forEach(async(instanceId) => {
    if(!(instanceId in rootScopeInstances)) {
      rootScopeInstances[instanceId] = new RootScope();
    }

    if(!(instanceId in apiManagerProxyInstances)) {
      apiManagerProxyInstances[instanceId] = new ApiManagerProxy(instanceId);
      apiManagerProxyInstances[instanceId].sendEnvironment();
    }

    apiManagerProxyInstances[instanceId].sendState().then(async([stateResult]) => {
      const managers = getProxiedManagersInstance(instanceId);
      rootScopeInstances[instanceId].managers = managers;

      if(!(instanceId in multiInstance)) {
        multiInstance[instanceId] = new SingleInstance(instanceId);
      }

      multiInstance[instanceId].start();
      multiInstance[instanceId].activateInstance();

      managers.apiUpdatesManager.attach(I18n.lastRequestedLangCode);
    });
  });

  if(instanceManager.getPassiveInstanceIDs().length > 0) {
    document.querySelector('.animated-menu-icon-indicator').classList.add('animated-menu-icon-indicator-visible');
  }
}
