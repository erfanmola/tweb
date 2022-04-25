/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type { MediaSearchContext } from "../components/appMediaPlaybackController";
import type { SearchSuperContext } from "../components/appSearchSuper.";
import type { Message } from "../layer";
import type { MyMessage } from "../lib/appManagers/appMessagesManager";
import { AppManagers } from "../lib/appManagers/managers";
import rootScope from "../lib/rootScope";
import forEachReverse from "./array/forEachReverse";
import filterChatPhotosMessages from "./filterChatPhotosMessages";
import ListLoader, { ListLoaderOptions } from "./listLoader";

export default class SearchListLoader<Item extends {mid: number, peerId: PeerId}> extends ListLoader<Item, Message.message> {
  public searchContext: MediaSearchContext;
  public onEmptied: () => void;

  private otherSideLoader: SearchListLoader<Item>;
  private managers: AppManagers;

  constructor(options: Omit<ListLoaderOptions<Item, Message.message>, 'loadMore'> & {
    onEmptied?: () => void, 
    isInner?: boolean, 
    managers?: AppManagers
  } = {}) {
    super({
      ...options,
      loadMore: (anchor, older, loadCount) => {
        const backLimit = older ? 0 : loadCount;
        let maxId = anchor?.mid;

        if(maxId === undefined) maxId = this.searchContext.maxId;
        if(!older) maxId = this.managers.appMessagesIdsManager.incrementMessageId(maxId, 1);

        return this.managers.appMessagesManager.getSearch({
          ...this.searchContext,
          peerId: this.searchContext.peerId || anchor?.peerId,
          maxId,
          limit: backLimit ? 0 : loadCount,
          backLimit
        }).then(value => {
          /* if(DEBUG) {
            this.log('loaded more media by maxId:', maxId, value, older, this.reverse);
          } */

          if(this.searchContext.inputFilter._ === 'inputMessagesFilterChatPhotos') {
            filterChatPhotosMessages(value);
          }

          if(value.next_rate) {
            this.searchContext.nextRate = value.next_rate;
          }

          return {count: value.count, items: value.history};
        });
      },
      processItem: (message) => {
        const filtered = this.filterMids([message.mid]);
        if(!filtered.length) {
          return;
        }

        return options.processItem(message);
      }
    });

    this.managers ??= rootScope.managers;
    rootScope.addEventListener('history_delete', this.onHistoryDelete);
    rootScope.addEventListener('history_multiappend', this.onHistoryMultiappend);
    rootScope.addEventListener('message_sent', this.onMessageSent);

    if(!options.isInner) {
      this.otherSideLoader = new SearchListLoader({
        ...options, 
        isInner: true
      });

      // this.otherSideLoader.onLoadedMore = () => {
        
      // };
    }
  }

  protected filterMids(mids: number[]) {
    const storage = this.searchContext.isScheduled ? 
      this.managers.appMessagesManager.getScheduledMessagesStorage(this.searchContext.peerId) : 
      this.managers.appMessagesManager.getMessagesStorage(this.searchContext.peerId);
     const filtered = this.managers.appMessagesManager.filterMessagesByInputFilterFromStorage(this.searchContext.inputFilter._, mids, storage, mids.length) as Message.message[];
     return filtered;
  }

  protected onHistoryDelete = ({peerId, msgs}: {peerId: PeerId, msgs: Set<number>}) => {
    const shouldBeDeleted = (item: Item) => item.peerId === peerId && msgs.has(item.mid);
    const filter = (item: Item, idx: number, arr: Item[]) => {
      if(shouldBeDeleted(item)) {
        arr.splice(idx, 1);
      }
    };

    forEachReverse(this.previous, filter);
    forEachReverse(this.next, filter);

    if(this.current && shouldBeDeleted(this.current)) {
      this.current = undefined;
      /* if(this.go(1)) {
        this.previous.splice(this.previous.length - 1, 1);
      } else if(this.go(-1)) {
        this.next.splice(0, 1);
      } else  */if(this.onEmptied) {
        this.onEmptied();
      }
    }
  };

  protected onHistoryMultiappend = (obj: {
    [peerId: string]: Set<number>;
  }) => {
    if(this.searchContext.folderId !== undefined) {
      return;
    }

    // because it's reversed
    if(!this.loadedAllUp || this.loadPromiseUp) {
      return;
    }

    const mids = obj[this.searchContext.peerId];
    if(!mids) {
      return;
    }

    const sorted = Array.from(mids).sort((a, b) => a - b);
    const filtered = this.filterMids(sorted);
    const targets = filtered.map(message => this.processItem(message)).filter(Boolean);
    if(targets.length) {
      /* const {previous, current, next} = this;
      const targets = previous.concat(current, next);
      const currentIdx = targets.length;
      const mid = targets[0].mid;
      let i = 0, length = targets.length;
      for(; i < length; ++i) {
        const target = targets[i];
        if(!target || mid < target.mid) {
          break;
        }
      }

      if(i < currentIdx) previous.push(...targets);
      else next. */

      if(!this.current) {
        this.previous.push(...targets);
      } else {
        this.next.push(...targets);
      }
    }
  };

  protected onMessageSent = ({message}: {message: MyMessage}) => {
    this.onHistoryMultiappend({
      [message.peerId]: new Set([message.mid])
    });
  };

  public setSearchContext(context: SearchSuperContext) {
    this.searchContext = context;

    if(this.searchContext.folderId !== undefined) {
      this.loadedAllUp = true;

      if(this.searchContext.nextRate === undefined) {
        this.loadedAllDown = true;
      }
    }

    if(this.searchContext.inputFilter._ === 'inputMessagesFilterChatPhotos') {
      this.loadedAllUp = true;
    }

    if(this.searchContext.useSearch === false) {
      this.loadedAllDown = this.loadedAllUp = true;
    }

    if(this.otherSideLoader) {
      this.otherSideLoader.setSearchContext(context);
    }
  }

  public reset() {
    super.reset();
    this.searchContext = undefined;

    if(this.otherSideLoader) {
      this.otherSideLoader.reset();
    }
  }

  public getPrevious() {
    let previous = this.previous;

    if(this.otherSideLoader) {
      previous = previous.concat(this.otherSideLoader.previous);
    }

    return previous;
  }

  public getNext() {
    let next = this.next;

    if(this.otherSideLoader) {
      next = next.concat(this.otherSideLoader.next);
    }

    return next;
  }

  public getCurrent() {
    return this.current || this.otherSideLoader?.current;
  }

  private goToOtherEnd(length: number) {
    if(length > 0) return this.go(-this.previous.length);
    else return this.go(this.next.length);
  }

  public goRound(length: number, dispatchJump?: boolean) {
    let ret: ReturnType<SearchListLoader<Item>['goUnsafe']>;

    if(this.otherSideLoader?.current) {
      ret = this.otherSideLoader.goUnsafe(length, dispatchJump);
      if(ret.item) {
        return ret.item;
      }

      length = ret.leftLength;
      if(!(length > 0 ? this.otherSideLoader.next : this.otherSideLoader.previous).length) {
        const loaded = length > 0 ? this.otherSideLoader.loadedAllUp : this.otherSideLoader.loadedAllDown;
        if(!loaded) { // do not reset anything until it's loaded
          return;
        }

        // if other side is loaded too will start from its begin
        if((length > 0 && (this.otherSideLoader.searchContext.maxId === 1 || this.otherSideLoader.loadedAllDown)) ||
          (length < 0 && (this.otherSideLoader.searchContext.maxId === 0 || this.otherSideLoader.loadedAllUp))) {
          return this.otherSideLoader.goToOtherEnd(length);
        }

        this.otherSideLoader.unsetCurrent(length > 0);
      }
    }

    ret = this.goUnsafe(length, dispatchJump);
    if(!ret.item) {
      if(this.loadedAllUp && this.loadedAllDown) { // just use the same loader if the list is too short
        return this.goToOtherEnd(length);
      } else if(this.otherSideLoader) {
        length = ret.leftLength;
        ret = this.otherSideLoader.goUnsafe(length, dispatchJump);
  
        if(ret.item) {
          this.unsetCurrent(length > 0);
        }
      }
    }

    return ret?.item;
  }

  // public setTargets(previous: Item[], next: Item[], reverse: boolean) {
  //   super.setTargets(previous, next, reverse);
  // }

  protected setLoaded(down: boolean, value: boolean) {
    const changed = super.setLoaded(down, value);

    if(changed && 
      this.otherSideLoader && 
      value && 
      this.searchContext?.useSearch !== false/*  && 
      (this.reverse ? this.loadedAllUp : this.loadedAllDown) */) {
      const reverse = this.loadedAllUp;
      this.otherSideLoader.setSearchContext({
        ...this.searchContext,
        maxId: reverse ? 1 : 0
      });

      // these 'reverse' are different, not a mistake here.
      this.otherSideLoader.reverse = this.reverse;
      this.otherSideLoader.setLoaded(reverse, true);
      this.otherSideLoader.load(!reverse);
    }

    return changed;
  }

  public cleanup() {
    this.reset();
    rootScope.removeEventListener('history_delete', this.onHistoryDelete);
    rootScope.removeEventListener('history_multiappend', this.onHistoryMultiappend);
    rootScope.removeEventListener('message_sent', this.onMessageSent);
    this.onEmptied = undefined;

    if(this.otherSideLoader) {
      this.otherSideLoader.cleanup();
      this.otherSideLoader = undefined;
    }
  }
}
