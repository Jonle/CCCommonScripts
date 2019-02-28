class Entry {
    public id = '';
    public name = '';
    public photo = '';
    public score = 0;
    public rank = 0;
    public extraData = null;
    public timestamp = '';

    constructor(entryObj) {
        let player = entryObj.getPlayer();

        this.id = player.getID();
        this.name = player.getName();
        this.photo = player.getPhoto();
        this.score = entryObj.getScore();
        this.rank = entryObj.getRank();
        let extraData = entryObj.getExtraData() || null;
        if (typeof extraData === 'string') {
            extraData = null;
        }
        this.extraData = JSON.parse(extraData);
    }
}

enum OrderType {
    LOWER_IS_BETTER = 1,
    HIGHER_IS_BETTER = 2
}

enum ShareType {
    INVITE = 'INVITE',
    REQUEST = 'REQUEST',
    CHALLENGE = 'CHALLENGE',
    SHARE = 'SHARE'
}

enum InviteFilterType {
    NEW_CONTEXT_ONLY = 'NEW_CONTEXT_ONLY',
    INCLUDE_EXISTING_CHALLENGES = 'INCLUDE_EXISTING_CHALLENGES',
    NEW_PLAYERS_ONLY = 'NEW_PLAYERS_ONLY'
}
export class FBGame {

    public static OrderType = OrderType;
    public OrderType = OrderType;

    public static ShareType = ShareType;
    public ShareType = ShareType;

    public static InviteFilterType = InviteFilterType;
    public InviteFilterType = InviteFilterType;

    private _fbinstant = null;
    private _interAdInstant = Object.create(null);
    private _rewardAdInstant = Object.create(null);

    // cache data base on leaderboard name
    private _friendsRankEntriesObj = Object.create(null);//  cache friends ranklist
    private _globalRankEntriesObj = Object.create(null); //  cache global ranklist
    private _globalRankRealCountObj = Object.create(null);// cache global entries real count 
    private _bestScoreObj = Object.create(null); // cache all board bestscore
    private _globalRankCount: number = 30;
	private _friendsRankCount: number = 30;

    private SHARE_SCORE_TEXT_TEMPLATE: string = 'My score is {SCORE}, Can you beat me?';
    private SHARE_NEW_TEXT_TEMPLATE: string = 'Can you beat me?';
    private shareImg: string = '';

    private _time_lastreq_friend_rank: number = 0;
    private _time_lastreq_global_rank: number = 0;
    private _time_req_min_interval: number = 2000;

    private _hasSelf: Boolean = false;

    private _boardName = '';
    private _interstitalAdId: string = '';
    private _rewardAdId: string = '';
    private _orderType: number = OrderType.HIGHER_IS_BETTER;

    private _myExtraData = {};

    constructor() {
        if (window['FBInstant']) {
            this._fbinstant = window['FBInstant'];
        }
    }

    public init(options: {
        boardName?: string,
        orderType?: number,
        interstitialAdId?: string,
        rewardAdId?: string,
        globalCount?: number
    }) {
        options = options || {};

        this._boardName = options.boardName || '';
        this._interstitalAdId = options.interstitialAdId || '';
        this._rewardAdId = options.rewardAdId || '';
        this._orderType = options.orderType || this.OrderType.HIGHER_IS_BETTER;
        this._globalRankCount = options.globalCount || this._globalRankCount;

        setTimeout( () => {
            // 预加载广告
            if (this._interstitalAdId) {
                this.preloadInterstitialAd();
            }
            if (this._rewardAdId) {
                this.preloadRewardAd();
            }

            // 预加载排行榜
            this.getFriendsRankData(true);
            this.getGlobalRankData(true);
        }, 0);

    }
    /**
     * 设置默认排序方式
     * @param type 排序方式
     */
    public setSortOrderType(type: OrderType) {
        this._orderType = type;
    }

    public isHigherBetter() {
        return this._orderType === OrderType.HIGHER_IS_BETTER;
    }

    public setBoardName(boardName) {
        this._boardName = boardName;
    }
    public setShareImage(base64Image) {
        this.shareImg = base64Image;
    }
    /**
     * 设置全球排行显示玩家数量
     * @param {Number} value 
     */
    public setGlobalRankerCount(value) {
        this._globalRankCount = value;
    }
	
	public setFriendsRankerCount(value) {
        this._friendsRankCount = value;
    }
    //////////////////////////////////////////// Rank ////////////////////////////////////////////
    /**
     * 提交分数
     * @param {Number} score
     * @param {Object} extraData
     * @return {Promise}
     */
    public submitScore(score, extraData) {
        score = parseInt(score);
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                if (score <= 0) {
                    reject('submitScore: score can\'t be [A positive number]');
                    return;
                }
                let bestScore = this._bestScoreObj[this._boardName] || -1;
                let isBetter = (this.isHigherBetter() ? score > bestScore : score < bestScore) && bestScore >= 0;
                if (isBetter || bestScore === -1) {
                    this.setMyExtraData(extraData);
                    this._bestScoreObj[this._boardName] = score;
                    this._fbinstant.getLeaderboardAsync(this._boardName)
                        .then((leaderboard) => {
                            return leaderboard.setScoreAsync(score, JSON.stringify(extraData || {}));
                        }).then((entry) => {
                            this._fbinstant.updateAsync({
                                action: 'LEADERBOARD',
                                name: this._boardName
                            }).then(() => {
                                console.log('update-rank-score');
                            }).catch((error) => {
                                console.log('update-rank-score-error', error);
                            });
                            resolve('Update Posted');
                        })
                        .catch((error) => {
                            reject('submitScore-error : ' + error.message);
                        });
                } else {
                    resolve('Update Posted');
                }

            } else {
                reject('not init fb!');
            }
        });
    }

    /***
     * 获取当前玩家的排行数据
     * @return {Promise}
     */
    public getMyRankData() {
        
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.getLeaderboardAsync(this._boardName)
                    .then((leaderboard) => {
                        return leaderboard.getPlayerEntryAsync();
                    })
                    .then((entry) => {
                        if (entry) {
                            let data = new Entry(entry);
                            let bestScore = this._bestScoreObj[this._boardName];
                            if (typeof bestScore === 'number') {
                                if (this.isHigherBetter()) {
                                    data.score > bestScore ? this._bestScoreObj[this._boardName] = bestScore : null;
                                } else if (data.score !== 0 && data.score < bestScore) {
                                    this._bestScoreObj[this._boardName] = bestScore;
                                }
                            }
                            resolve(data);
                        } else {
                            reject('None Data!');
                        }
                    })
                    .catch((error) => {
                        reject('getMyRankData-error : ' + error.message);
                    });
            } else {
                reject('not init fb!');
            }
        });
    }
    /**
     * 获取全球排行榜数据
     * @param {Boolean} forceUpdate 更新排行数据，且不进行缓存及时间的判断
     * @return {Promise}
     */
    public getGlobalRankData(forceUpdate) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {

                let globalEntries = this._globalRankEntriesObj[this._boardName];
                if (!globalEntries) {
                    globalEntries = this._globalRankEntriesObj[this._boardName] = [];
                }

                let deltaTime = (new Date().getTime()) - this._time_lastreq_global_rank;
                if (deltaTime < this._time_req_min_interval && globalEntries.length > 0) {
                    this._sortCacheRank(globalEntries);
                    resolve(globalEntries.concat());
                } else if (!forceUpdate && globalEntries.length > 0) {
                    this._sortCacheRank(globalEntries);
                    resolve(globalEntries.concat());
                } else {
                    this._time_lastreq_global_rank = new Date().getTime();
                    this._fbinstant.getLeaderboardAsync(this._boardName)
                        .then((leaderboard) => {
                            return leaderboard.getEntriesAsync(this._globalRankCount, 0);
                        })
                        .then(function (entries) {
                            let currentId = this._fbinstant.player.getID();
                            this._globalRankRealCountObj[this._boardName] = entries.length;
                            let list = this._globalRankEntriesObj[this._boardName] = [];
                            let rank = 1;
                            let isHigherBetter = this.isHigherBetter();
                            for (let i = 0, length = entries.length, item; i < length; i++) {
                                item = new Entry(entries[i]);
                                if (currentId === item.id) {
                                    this._bestScoreObj[this._boardName] = item.score;
                                }
                                if (!isHigherBetter && item.score === 0) {
                                    continue;
                                }
                                item.rank = rank++; // 容错处理
                                list.push(item);
                            }
                            resolve(list.concat());
                        })
                        .catch((error) => {
                            if (globalEntries && globalEntries.length > 0) {
                                globalEntries = this._sortCacheRank(globalEntries);
                                resolve(globalEntries.concat());
                            } else {
                                reject('getGlobalRankData-error : ' + error.message);
                            }
                        });
                }
            }
        });

    }
    /**
     * 获取好友排行榜数据
     * @param {Boolean} forceUpdate 更新排行数据，且不进行缓存及时间的判断
     * @return {Promise}
     */
    public getFriendsRankData(forceUpdate?) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                let friends = this._friendsRankEntriesObj[this._boardName];
                if (!friends) {
                    friends = this._friendsRankEntriesObj[this._boardName] = [];
                }
                let deltaTime = (new Date().getTime()) - this._time_lastreq_friend_rank;
                if (deltaTime < this._time_req_min_interval && friends.length > 0) {
                    this._sortCacheRank(friends);
                    resolve(friends.concat());
                } else if (!forceUpdate && friends.length > 0) {

                    friends = this._sortCacheRank(friends);
                    resolve(friends.concat());

                } else {
                    this._time_lastreq_friend_rank = new Date().getTime();
                    // 从服务器获取排行数据
                    this._fbinstant.getLeaderboardAsync(this._boardName)
                        .then((leaderboard) => {
                            return leaderboard.getConnectedPlayerEntriesAsync(this._friendsRankCount, 0);
                        })
                        .then(function (entries) {
                            let currentId = this._fbinstant.player.getID();
                            let list = this._friendsRankEntriesObj[this._boardName] = [];
                            let rank = 1;
                            let isHigherBetter = this.isHigherBetter();
                            for (let i = 0, length = entries.length, item; i < length; i++) {
                                item = new Entry(entries[i]);

                                if (currentId === item.id) {
                                    this._bestScoreObj[this._boardName] = item.score;
                                    this._hasSelf = true;
                                }
                                if (!isHigherBetter && item.score === 0) {
                                    continue;
                                }
                                item.rank = rank++;// 容错处理
                                list.push(item);
                            }
                            resolve(list.concat());
                        })
                        .catch((error) => {
                            if (friends && friends.length > 0) {
                                friends = this._sortCacheRank(friends);
                                resolve(friends.concat());
                            } else {
                                reject('getFriendsRankData-error : ' + error.message);
                            }
                        });
                }
            } else {
                reject('not init fb!');
            }
        });
    }
    /**
     * 获取即将超越的好友列表
     * @warn 需要在成绩提交之前获取超越列表
     */
    public getToSurpassFriends(score) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            this.getMyRankData().then(function (data: Entry) {
                let bestScore = this._bestScoreObj[this._boardName];
                let isHigherBetter = this.isHigherBetter();
                if (isHigherBetter) {
                    score > bestScore ? (bestScore = score) : null;
                } else if (score !== 0) {
                    score < bestScore ? (bestScore = score) : null;
                }
                this.getFriendsRankData().then(function (entries: []) {
                    let beyonds = [];
                    for (let i = 0, length = entries.length, entry; i < length; i++) {
                        entry = entries[i];
                        if (entry.id === data.id) {
                            continue;
                        }
                        if (isHigherBetter) {
                            if (entry.score > bestScore) {
                                beyonds.push(entry);
                            }
                        } else {
                            if (entry.score < bestScore) {
                                beyonds.push(entry);
                            }
                        }
                    }
                    resolve([data, beyonds]);
                });
            }).catch((error) => {
                reject('get Play info error: ' + error.message);
            });
        });
    }
    /**
     * 获取超越的好友
     * @warn 需要在成绩提交之前获取超越列表
     */
    public getSurpassedFriends(currentScore, lastScore) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            let myData = {
                score: currentScore,
                id: this.getMyID(),
                name: this.getMyName(),
                photo: this.getMyPhoto(),
                extraData: { level: currentScore + 2 }
            };
            let checkEntries = function (entries) {
                let beyonds = [];
                for (let i = 0, length = entries.length, entry; i < length; i++) {
                    entry = entries[i];
                    if (entry.id === myData.id) {
                        continue;
                    }
                    if (lastScore !== -1) {
                        if (this.isHigherBetter()) {
                            if (currentScore > entry.score && lastScore <= entry.score) {
                                beyonds.push(entry);
                            }
                        } else if (currentScore !== 0) {
                            if (currentScore < entry.score && lastScore >= entry.score) {
                                beyonds.push(entry);
                            }
                        }
                    }

                }
                resolve([myData, beyonds]);
            };
            this.getFriendsRankData().then(function (entries) {
                checkEntries(entries);
            }).catch(function (err) {
                reject('get Play info error: ' + err.message);
            });
        });
    }
    /***
     * 获取比最好成绩稍好的好友玩家
     */
    public getFriendsGoalEntry(score) {
        return this._getLastBetterEntry(this._friendsRankEntriesObj, score);
    }
    // TODO 待优化，使用二分查找
    private _getLastBetterEntry(obj, score) {
        let entries = (obj[this._boardName] || []).concat();
        let entryCount = entries.length;
        if (entryCount === 0) return null;

        let playerID = this._fbinstant.player.getID();
        for (let i = 0; i < entryCount; i++) {
            if (entries[i].id === playerID) {
                entries.splice(i, 1);
                entryCount -= 1;
                break;
            }
        }
        let bestScore = score;
        if (bestScore === 0) return entries[entries.length - 1];
        let middleIndex = Math.floor((entryCount - 1) / 2);
        let middleEntry = entries[middleIndex];
        let isBigger = middleEntry.score > bestScore;

        let startIndex = 0;
        let endIndex = 0;
        if (this.isHigherBetter()) {

            if (isBigger) {
                startIndex = middleIndex;
                endIndex = entryCount - 1;
            } else {
                startIndex = 0;
                endIndex = middleIndex;
            }

            for (let i = endIndex; i >= startIndex; i--) {
                if (entries[i].score > bestScore) {
                    return entries[i];
                }
            }
            if (middleEntry > bestScore) {
                return middleEntry;
            }
            return null;
        } else {
            if (isBigger) {
                startIndex = 0;
                endIndex = middleIndex;
            } else {
                startIndex = middleIndex;
                endIndex = entryCount - 1;
            }

            for (let i = endIndex; i >= startIndex; i--) {
                if (typeof entries[i + 1] != 'undefined' && entries[i + 1].score < bestScore) {
                    continue;
                } else if (entries[i].score < bestScore) {
                    return entries[i];
                }
            }
            if (middleEntry < bestScore) {
                return middleEntry;
            }
            return null;
        }
    }

    private _sortCacheRank(data) {
        let currentId = this._fbinstant.player.getID();
        let isHigherBetter = this.isHigherBetter();
        for (let i = 0, length = data.length, element; i < length; i++) {
            element = data[i];
            if (element.id === currentId) {
                let bestScore = this._bestScoreObj[this._boardName] || 0;
                if ((isHigherBetter && bestScore > element.score) ||
                    (!isHigherBetter && bestScore < element.score)) {
                    element.score = bestScore;
                    let extraData = element.extraData;
                    if (extraData) {
                        let data = null;
                        for (let key in extraData) {
                            data = this._myExtraData[key];
                            if (typeof data !== 'undefined') {
                                extraData[key] = data;
                            }
                        }
                    }
                }
                break;
            }
        }
        data.sort(isHigherBetter ? this._descendingOrderScore : this._ascendingOrderScore);
        data.forEach(function (element, index) {
            element.rank = index + 1;
        });
        return data;
    }

    private _ascendingOrderScore(a, b) {
        return a.score - b.score;
    }

    private _descendingOrderScore(a, b) {
        return b.score - a.score;
    }
    /////////////////////////////////// AD ///////////////////////////////////////

    public canPlayInterstitialAd(id) {
        return !!this._interAdInstant[id || this._interstitalAdId];
    }
    public canPlayRewardAd(id) {
        return !!this._rewardAdInstant[id || this._rewardAdId];
    }


    /**
     * 预加载激励广告
     * @return {Promise}
     */
    public preloadRewardAd(id?) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (!this._fbinstant) {
                reject('not init fb !');
                return;
            }

            if (!id && !this._rewardAdId) {
                reject('has no placement id-Ad!');
                return;
            }

            let supportedAPIs = this._fbinstant.getSupportedAPIs();
            let funcName = 'getRewardedVideoAsync';
            if (supportedAPIs.includes(funcName)) {
                let instant = this._rewardAdInstant[id || this._rewardAdId];
                if (!instant) {
                    let rewardedInstant = null;
                    this._fbinstant[funcName](id || this._rewardAdId)
                        .then(function (rewarded) {
                            rewardedInstant = rewarded;
                            return rewarded.loadAsync();
                        }).then(() => {
                            this._rewardAdInstant[id || this._rewardAdId] = rewardedInstant;
                            rewardedInstant = null;
                            resolve('Rewarded video preloaded');
                        }).catch(function (err) {
                            this._rewardAdInstant[id || this._rewardAdId] = null;
                            reject('Rewarded video failed to preload : ' + err.message);
                        });
                }

            } else {
                reject(`${funcName} is not Support!`);
            }
        });

    }
    /**
     * 显示激励广告
     * @return {Promise}
     */
    public showRewardAd(id?, preloadCb?) {
        if (typeof id === 'function') {
            preloadCb = id;
            id = null;
        }
        // @ts-ignore
        return new Promise((resolve, reject) => {
            let instant = this._rewardAdInstant[id || this._rewardAdId];
            this._rewardAdInstant[id || this._rewardAdId] = null;;
            if (instant) {
                instant.showAsync()
                    .then(() => {
                        this.preloadRewardAd(id || this._rewardAdId).then(() => {
                            preloadCb && preloadCb('preload');
                        }).catch(function (message) {
                            preloadCb && preloadCb('-- show Inter Ad end -- preload another Ad instant fail! :' + message);
                        });
                        resolve('Rewarded video watched successfully');
                    })
                    .catch(function (err) {
                        reject('showRewardAd-error : ' + err.message);
                    });
            } else {
                reject('RewardAd not ready!');
            }
        });
    }
    /**
     * 预加载插屏广告
     * @return {Promise}
     */
    public preloadInterstitialAd(id?) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (!this._fbinstant) {
                reject('not init fbinstant');
                return;
            }

            if (!id && !this._interstitalAdId) {
                reject('has no placement id - ad!');
                return;
            }

            let supportedAPIs = this._fbinstant.getSupportedAPIs();
            let funcName = 'getInterstitialAdAsync';
            if (supportedAPIs.includes(funcName)) {
                let instant = this._interAdInstant[id || this._interstitalAdId];
                if (!instant) {
                    let interAdInstant = null;
                    this._fbinstant[funcName](id || this._interstitalAdId)
                        .then(function (interstitial) {
                            interAdInstant = interstitial;
                            return interstitial.loadAsync();
                        }).then(() => {
                            this._interAdInstant[id || this._interstitalAdId] = interAdInstant;
                            resolve('Interstitial Ad preloaded !');
                        }).catch(function (err) {
                            this._interAdInstant[id || this._interstitalAdId] = null;
                            reject('Interstitial Ad failed to preload : ' + err.message);
                        });
                }
            } else {
                reject(`${funcName} is not Support!`);
            }
        });
    }
    /**
     * 显示插屏广告
     * @return {Promise}
     */
    public showInterstitialAd(id?, preloadCb?) {
        if (typeof id === 'function') {
            preloadCb = id;
            id = null;
        }
        // @ts-ignore
        return new Promise((resolve, reject) => {
            let instant = this._interAdInstant[id || this._interstitalAdId];
            this._interAdInstant[id || this._interstitalAdId] = null;
            if (instant) {
                instant.showAsync()
                    .then(() => {
                        this.preloadInterstitialAd(id || this._interstitalAdId)
                            .then(() => {
                                preloadCb && preloadCb('preload');
                            })
                            .catch(function (message) {
                                preloadCb && preloadCb('-- show Inter Ad end -- preload another Ad instant fail! :' + message);
                            });
                        resolve('show Inter Ad success!');
                    })
                    .catch((error) => {
                        reject('showInterstitialAd-error : ' + error.message);
                    });
            } else {
                reject('InterstitialAd not ready!');
            }
        });
    }

    public createShortcut() {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.canCreateShortcutAsync()
                    .then(function (canCreateShortcut) {
                        if (canCreateShortcut) {
                            this._fbinstant.createShortcutAsync()
                                .then(() => {
                                    resolve('Shortcut created');
                                })
                                .catch((error) => {
                                    reject('Shortcut not created: ' + error.message);
                                });
                        } else {
                            reject(`Check success - but - Can't create shortcut`);
                        }
                    }).catch((error) => {
                        reject(`Can't create shortcut! : ` + error.message);
                    });
            } else {
                reject('not init fb!');
            }
        });

    }

    /////////////////////////////// FBControlFuncs /////////////////////////////////////
    public quit() {
        if (this._fbinstant) {
            this._fbinstant.quit();
        }
    }
    public onPause(cb) {
        if (this._fbinstant) {
            this._fbinstant.onPause(cb || (()=> {
                console.log('pause event trigger');
            }));
        }
    }
    public logEvent(eventName, valueToSum, parameters) {
        if (this._fbinstant) {
            this._fbinstant.logEvent(eventName, valueToSum || 0, parameters);
        }
    }
    ///////////////////////////////////Data//////////////////////////////
    /**
     * 
     * @param {Object} data An arbitrary data object, which must be less than or equal to 1000 characters when stringified.
     */
    public setSessionData(data) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.setSessionData(data);
                resolve('has saved');
            } else {
                reject('not init fb!');
            }
        });

    }
    /**
     * The game can store up to 1MB of data for each unique player.
     */
    public saveData(storeData, flushNow?: boolean) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (!storeData || 0 === Object.keys(storeData).length) {
                return reject("saveData: [storeData] param must be Object.");
            }

            if (this._fbinstant) {
                flushNow = void 0 !== flushNow && flushNow;
                this._fbinstant.player.setDataAsync(storeData).then(() => {
                    if (flushNow) {
                        this.flushData().then(() => {
                            resolve('flush save success');
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                    else resolve('save success');
                }).catch(function (n) {
                    reject(n);
                });
            } else {
                reject('not init fb!');
            }
        });
    }
    public flushData() {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            this._fbinstant.player.flushDataAsync().then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    }
    public getData(keys: string[]) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.player.getDataAsync(keys).then((data) => {
                    resolve(data);
                }).catch((error) => {
                    reject(`can't get Data - error : ` + error.message);
                });
            } else {
                reject('not init fb!');
            }
        });
    }
    ////////////////////////////////Social///////////////////////////////////////
    canSubscribeBotAsync () {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (window['FBInstant']) {
                this._fbinstant.player.canSubscribeBotAsync().then((can_subscribe) => {
                    if (can_subscribe) {
                        resolve('can_subscribe');
                    }
                    else {
                        reject('can\'t_subscribe');
                    }
                }).catch((e)=>{
                    reject('can\'t_subscribe-error:' + e.message);
                });
            }
            else {
                reject('not init fb!');
            }
        });
    }
    subscribeBotAsync () {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (window['FBInstant']) {
                this._fbinstant.player.subscribeBotAsync().then(() => {
                    // Player is subscribed to the bot
                    // this.setOneDataToFBServer('subscribeBot', true);
                    resolve();
                }).catch((error) => {
                    // Handle subscription failure
                    reject('Handle subscription failure!');
                });
            }
            else {
                reject('no init fb!');
            }
        });
    }
    switchGame(appId) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (window['FBInstant']) {
                this._fbinstant.switchGameAsync(appId).catch((e) => {
                    reject(e);
                });
            }
            else {
                reject('not init fb!');
            }
        });
    }
    /**
     * 从分享、邀请、挑战进入后获取的数据
     */
    public getEntryPointData() {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                let data = this._fbinstant.getEntryPointData();
                if (data) {
                    resolve(data);
                } else {
                    reject('no data!');
                }
            } else {
                reject('no init fb!');
            }
        });
    }
    /**
     * 获取打开的平台入口名
     */
    public getEntryPointAsync() {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.getEntryPointAsync()
                    .then( (entryPoint) => {
                        resolve(entryPoint);
                    }).catch((error) => {
                        reject(error);
                    });
            } else {
                reject('no init fb!');
            }
        });
    }

    /**
     * 分享
     * @param  shareType
     * @param  extraData
     * @param  text
     * @param  image base64
     */
    public share(shareType: ShareType, extraData?: {}, text?: string, image?: string) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                if (!image) {
                    image = this.shareImg;
                }

                if (image.indexOf('data:image/') !== 0) {
                    console.error('Share [image] param is Error.');
                    return;
                }

                if (!shareType) {
                    shareType = ShareType.SHARE;
                } else {
                    shareType = ShareType.REQUEST;
                }
                let score = this._bestScoreObj[this._boardName] || 0;
                if (!text || text === '') {
                    if (score === 0) {
                        text = this.SHARE_NEW_TEXT_TEMPLATE;
                    }
                    else {
                        text = this.SHARE_SCORE_TEXT_TEMPLATE;
                    }
                    text = text.replace('{SCORE}', score);
                }
                let data = {
                    contextID: this._fbinstant.context.getID(),
                    score: score,
                    photo: this._fbinstant.player.getPhoto(),
                    playerID: this._fbinstant.player.getID(),
                    extraData: extraData,
                };
                this._fbinstant.shareAsync({
                    intent: shareType,
                    text: text,
                    image: image,
                    data: data
                }).then((data) => { // 不管分享成功还是失败
                    // continue with the game
                    this._fbinstant.logEvent('SHARE_' + shareType, 1, data);
                    resolve(data);
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject('not init fb!');
            }
        });
    }
    /**
     * 随机匹配玩家
     */
    public matchPlayers() {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.checkCanPlayerMatchAsync()
                    .then((canMatch) => {
                        if (canMatch) {
                            this._fbinstant.matchPlayerAsync().then(() => {
                                this.customUpdate('RANDOM_MATCH_PLAYER');
                                this._fbinstant.logEvent('RANDOM_MATCH_PLAYER', 1);
                                resolve('success match');
                            }).catch((error) => {
                                reject('match-error : ' + error.message);
                            });
                        }
                    }).catch((error) => {
                        reject(error);
                    });
            } else {
                console.log(' not init fb！');
            }

        });
    }

    /**
   * 邀请好友
   * @param type
   * @param extraData 
   * @param cta    邀请信息按钮的显示内容
   * @param text 
   * @param image  显示图片base64
   * @param template   邀请信息文本模板
   * @return {Promise}
   */
    public invite(type?: string, extraData?: {}, text?: string | {}, cta?: string | {}, image?: string, template?: string) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.context.chooseAsync({
                    filters: [],
                    minSize: 3
                }).then(() => {
                    this.customUpdate(type || 'INVITE_FRIENDS', text, cta, image, template, extraData);
                    this._fbinstant.logEvent(type || 'INVITE_FRIENDS', 1, { type: this._fbinstant.context.getType() });
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject('not init fb!');
            }
        });
    }

    /**
    * 挑战好友
    * @param {String} playerID
    */
    public challengeWithFriend(playerID) {
        // @ts-ignore
        return new Promise((resolve, reject) => {
            if (this._fbinstant) {
                this._fbinstant.context.createAsync(playerID)
                    .then(() => {
                        resolve();
                        this._fbinstant.logEvent(
                            "CHALLENGE_WITH_FRIENDS", 1, {
                                type: this._fbinstant.context.getType()
                            }
                        );
                    }).catch((error) => {
                        reject(error);
                    });
            } else {
                reject('not init fb !');
            }
        });

    }
    /**
     * 通用信息提交更新
     * @param {String} type   更新类型
     * @param {String | Object} text   信息显示文本
     * @param {String} cta    信息更新提交后显示的进入游戏按钮
     * @param {String} image 显示的图片
     * @param {String} template  显示的文本内容
     * @param {*} extraData  需要传递的额外数据
     */
    public customUpdate(type?, text?, cta?, image?, template?, extraData?) {

        image = image || this.shareImg;
        if (type && typeof text === 'object' && !text.default) {
            text = {
                default: text.en,
                localizations: {
                    en_US: text.en,
                    zh_CN: text.zh,
                    zh_HK: text.zh,
                    zh_TW: text.zh
                }
            };
        } else if (typeof text === 'string') {
            text = {
                default: text,
                localizations: {
                    en_US: text,
                    zh_CN: text,
                    zh_HK: text,
                    zh_TW: text
                }
            };
        }else if (!text) {
            text = 'Come On!';
        }
        if (cta && typeof cta === 'object') {
            cta = {
                default: cta.en,
                localizations: {
                    en_US: cta.en,
                    zh_CN: cta.zh,
                    zh_HK: cta.zh,
                    zh_TW: cta.zh
                }
            };
        } else {
            cta = cta || 'PLAY!';
            cta = {
                default: cta,
                localizations: {
                    en_US: cta,
                    zh_CN: cta,
                    zh_HK: cta,
                    zh_TW: cta
                }
            };
        }


        template = template || 'play_turn';
        // @ts-ignore
        return new Promise((resolve, reject) => {
            let fb = this._fbinstant;
            if (fb) {
                let player = fb.player;
                let data = {
                    playerID: player.getID(),
                    contextID: fb.context.getID(),
                    photo: player.getPhoto(),
                    score: this._bestScoreObj[this._boardName],
                    type: type || 'UPDATE_CUSTOM',
                    extraData: extraData,
                };
                let updatePayload = {
                    action: 'CUSTOM',
                    cta: cta,
                    image: image,
                    text: text,
                    template: template,
                    data: data,
                    strategy: 'IMMEDIATE_CLEAR',
                    notification: 'NO_PUSH',
                };
                // console.log('update-payload', updatePayload);
                fb.updateAsync(updatePayload).then(() => {
                    resolve('Custom-Update Message was sent successfully');
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject('not init fb!');
            }
        });
    }

    /////////////////////////////////Other/////////////////////////////////

    public hasSelf() {
        return this._hasSelf;
    }

    public getMyID() {
        if (this._fbinstant) {
            return this._fbinstant.player.getID();
        }
        return null;
    }

    public getMyName() {
        if (this._fbinstant) {
            return this._fbinstant.player.getName();
        }
        return 'Your friend';
    }

    public getMyPhoto() {
        if (this._fbinstant) {
            return this._fbinstant.player.getPhoto();
        }
        return '';
    }

    public getMyBestScore() {
        return this._bestScoreObj[this._boardName] || 0;
    }

    public setMyBestScore(score) {
        let lastScore = this._bestScoreObj[this._boardName] || 0;
        if (score > lastScore) {
            this._bestScoreObj[this._boardName] = score;
        }
    }

    public setMyExtraData(data: {}) {
        this._myExtraData = data;
    }
}
