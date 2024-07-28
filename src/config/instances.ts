import {IDB} from '../lib/files/idb';
import {randomLong} from '../helpers/random';

export type Instance = {
  id: string;
  logged_in: boolean,
  active: boolean;
};

const DB_NAME = 'instances';
const DB_VERSION = 1;

class InstanceManager {
  public LIMIT_ACCOUNTS_DEFAULT = 3;
  public LIMIT_ACCOUNTS_PREMIUM = 4;

  private instances: Instance[] = [];
  private IDB: IDBDatabase;
  static _instance: InstanceManager;
  private unreadStats: { [key: string]: { mute: number, unmute: number } } = {};

  constructor() {
    if(InstanceManager._instance) {
      throw new Error('I cannot have more than one instance');
    }
    InstanceManager._instance = this;
    this.construct();
  }

  private async construct() {
    this.IDB = await this.initializeIDB();
    this.instances = await this.fetchInstances();

    if(this.instances.length === 0) {
      this.instances.push({
        id: randomLong(),
        logged_in: false,
        active: true
      });
    }

    await this.persistInstances();

    if(typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if(e.key === 'last_instance_id') {
          window.close();
        }
      });
    }
  }

  private async initializeIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if(!db.objectStoreNames.contains('instances')) {
          db.createObjectStore('instances', {keyPath: 'id'});
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async fetchInstances(): Promise<Instance[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.IDB.transaction('instances', 'readonly');
      const store = transaction.objectStore('instances');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as Instance[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async persistInstances() {
    return new Promise((resolve, reject) => {
      const transaction = this.IDB.transaction('instances', 'readwrite');
      const store = transaction.objectStore('instances');

      const promises = this.instances.map(instance => {
        return new Promise((resolve, reject) => {
          const request = store.put(instance);

          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
        });
      });

      Promise.all(promises)
      .then(results => resolve(results))
      .catch(error => reject(error));
    });
  }

  public async waitForInstances() {
    return new Promise((resolve) => {
      if(this.instances.length > 0) {
        resolve(true);
      } else {
        const interval = setInterval(() => {
          if(this.instances.length) {
            clearInterval(interval);
            resolve(true);
          }
        }, 1e2);
      }
    });
  }

  public async destroyInstance(instanceId: string) {
    const transaction = this.IDB.transaction('instances', 'readwrite');
    const store = transaction.objectStore('instances');
    const request = store.delete(instanceId);

    this.instances = this.instances.filter(item => item.id != instanceId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        IDB.closeDatabases();
        const req = indexedDB.deleteDatabase(`tweb_${instanceId}`);
        req.onblocked = () => resolve(false);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      };

      request.onerror = () => resolve(false);
    });
  }

  public getInstanceIDs() {
    return this.instances.map(item => item.id);
  }

  public getActiveInstanceID() {
    return this.instances.find(item => item.active)?.id ?? this.getLoggedInInstanceIDs()[0];
  }

  public getLoggedInInstanceIDs() {
    return this.instances.filter(item => item.logged_in).map(item => item.id);
  }

  public getPassiveInstanceIDs() {
    if(this.getLoggedInInstanceIDs().length === 1) {
      return [];
    }
    return this.instances.filter(item => !(item.active) && item.logged_in).map(item => item.id);
  }

  public async switchToInstance(instanceId: string|null = null, url: string = '/') {
    const lastInstanceId = this.getActiveInstanceID();

    if(!(instanceId)) {
      instanceId = randomLong();
      this.instances.push({
        id: instanceId,
        logged_in: false,
        active: true
      });
    }

    this.instances = this.instances.map(item => {
      item.active = (item.id == instanceId);
      return item;
    });

    await this.persistInstances();

    this.setLastInstanceId(lastInstanceId);
    location.href = url;
  }

  public async setInstanceLoggedIn(instanceId: string) {
    this.instances.find(item => item.id == instanceId).logged_in = true;
    return this.persistInstances();
  }

  public getLastInstanceId() {
    return localStorage.getItem('last_instance_id');
  }

  public setLastInstanceId(instanceId: string) {
    return localStorage.setItem('last_instance_id', instanceId);
  }

  public toggleGlobalNotificationsHandler(ev: Event) {
    localStorage.setItem('global_notifications_enabled', (ev.target as HTMLInputElement).checked ? 'true' : 'false');
  }

  public isGlobalNotificationsEnabled() {
    const option = localStorage.getItem('global_notifications_enabled');
    if(option) {
      return option == 'true';
    }
    return true;
  }

  public getUnreadStats() {
    return this.unreadStats;
  }

  public setUnreadStats(instaceId: string, mute: number, unmute: number) {
    this.unreadStats[instaceId] = {
      mute: mute,
      unmute: unmute
    };

    const [totalUnread, totalUnreadUnmuted] = [
      Object.entries(this.unreadStats).map(([id, stats]) => (stats.mute + stats.unmute)).reduce((prev, curr) => (prev + curr), 0),
      Object.entries(this.unreadStats).map(([id, stats]) => (stats.unmute)).reduce((prev, curr) => (prev + curr), 0)
    ];

    if(totalUnread > 0) {
      if(instanceManager.getPassiveInstanceIDs().length > 0) {
        document.querySelector('.animated-menu-icon-indicator').classList.add('animated-menu-icon-indicator-visible');
      }

      if((totalUnreadUnmuted - (this.unreadStats[this.getActiveInstanceID()]?.unmute ?? 0)) > 0) {
        document.querySelector('.animated-menu-icon-indicator').classList.add('animated-menu-icon-indicator-active');
      } else {
        document.querySelector('.animated-menu-icon-indicator').classList.remove('animated-menu-icon-indicator-active');
      }
    } else {
      document.querySelector('.animated-menu-icon-indicator').classList.remove('animated-menu-icon-indicator-visible');
    }
  }
};

const instanceManager = new InstanceManager();
export default instanceManager;
