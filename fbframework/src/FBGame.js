
function FBGame() {
    if (window.FBInstant) {
        this._fbinstant = FBInstant;
    }

    this._interAdInstant = {};
    this._rewardAdInstant = {};

    // cache data base on leaderboard name
    this._friendsRankEntriesObj = {};//  cache friends ranklist
    this._globalRankEntriesObj = {}; //  cache global ranklist
    this._globalRankRealCountObj = {};// cache global entries real count 
    this._bestScoreObj = {}; // cache all board bestscore

    this._globalRankCount = 30;
	this._friendsRankCount = 30;

    this.SHARE_SCORE_TEXT_TEMPLATE = 'My score is {SCORE}, Can you beat me?';
    this.SHARE_NEW_TEXT_TEMPLATE = 'Can you beat me?';
    this.shareImg = '';

    this._time_lastreq_friend_rank = 0;
    this._time_lastreq_global_rank = 0;
    this._time_req_min_interval = 2000;

    this._hasSelf = false;
};

FBGame.OrderType = {
    'LOWER_IS_BETTER': 1,
    'HIGHER_IS_BETTER': 2
};

FBGame.ShareType = {
    SHARE_INVITE: 'INVITE',
    SHARE_REQUEST: 'REQUEST',
    SHARE_CHALLENGE: 'CHALLENGE',
    SHARE_SHARE: 'SHARE'
};

FBGame.InviteFilterType = {
    NEW_CONTEXT_ONLY: 'NEW_CONTEXT_ONLY',
    INCLUDE_EXISTING_CHALLENGES: 'INCLUDE_EXISTING_CHALLENGES',
    NEW_PLAYERS_ONLY: 'NEW_PLAYERS_ONLY'
}


FBGame.prototype = {
    constructor: FBGame,
    ShareType: FBGame.ShareType,
    OrderType: FBGame.OrderType,
    InviteFilterType: FBGame.InviteFilterType,
    /**
     * @param {{boardName:String, orderType:String, interstitialAdId:String, rewardAdId:String, globalCount:Number}} options
     */
    init(options) {
        options = options || {};

        this._boardName = options.boardName || '';
        this._interstitalAdId = options.interstitialAdId || '';
        this._rewardAdId = options.rewardAdId || '';
        this._orderType = options.orderType || this.OrderType.HIGHER_IS_BETTER;
        this._globalRankCount = options.globalCount || this._globalRankCount;

        setTimeout(function () {
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
        }.bind(this), 0);

    },

    setSortOrderType(type) {
        this._orderType = type;
    },
    setBoardName(boardName) {
        this._boardName = boardName;
    },
    setShareImage(base64Image) {
        this.shareImg = base64Image;
    },
    /**
     * 设置全球排行显示玩家数量
     * @param {Number} value 
     */
    setGlobalRankerCount(value) {
        this._globalRankCount = value;
    },
	setFriendsRankerCount(value) {
        this._friendsRankCount = value;
    },
    //////////////////////////////////////////// Rank ////////////////////////////////////////////
    /**
     * 提交分数
     * @param {Number} score
     * @param {Object} extraData
     * @return {Promise}
     */
    submitScore(score, extraData) {
        let self = this;
        score = parseInt(score);
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                if (score <= 0) {
                    reject('submitScore: score can\'t be [A positive number]')
                    return;
                }
                let bestScore = self._bestScoreObj[self._boardName] || -1;
                let isBetter = (self.isHigherBetter() ? score > bestScore : score < bestScore) && bestScore >= 0;
                if (isBetter || bestScore === -1) {
                    self._bestScoreObj[self._boardName] = score;
                    self._fbinstant.getLeaderboardAsync(self._boardName)
                        .then(function (leaderboard) {
                            return leaderboard.setScoreAsync(score, JSON.stringify(extraData || {}));
                        }).then(function (entry) {
                            self._fbinstant.updateAsync({
                                action: 'LEADERBOARD',
                                name: self._boardName
                            }).then(function () {
                                console.log('update-rank-score');
                            }).catch(function (error) {
                                console.log('update-rank-score-error', error);
                            });
                            resolve('Update Posted');
                        })
                        .catch(function (error) {
                            reject('submitScore-error : ' + error.message);
                        });
                } else {
                    resolve('Update Posted');
                }

            } else {
                reject('not init fb!');
            }
        });
    },

    /***
     * 获取当前玩家的排行数据
     * @return {Promise}
     */
    getMyRankData() {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.getLeaderboardAsync(self._boardName)
                    .then(function (leaderboard) {
                        return leaderboard.getPlayerEntryAsync();
                    })
                    .then(function (entry) {
                        if (entry) {
                            let data = self._getEntryItem(entry);
                            let bestScore = self._bestScoreObj[self._boardName];
                            if (typeof bestScore === 'number') {
                                if (self.isHigherBetter()) {
                                    data.score > bestScore ? self._bestScoreObj[self._boardName] = bestScore : null;
                                } else if (data.score !== 0 && data.score < bestScore) {
                                    self._bestScoreObj[self._boardName] = bestScore;
                                }
                            }
                            resolve(data);
                        } else {
                            reject('None Data!');
                        }
                    })
                    .catch(function (error) {
                        reject('getMyRankData-error : ' + error.message);
                    });
            } else {
                reject('not init fb!');
            }
        });
    },
    /**
     * 获取全球排行榜数据
     * @param {Boolean} forceUpdate 更新排行数据，且不进行缓存及时间的判断
     * @return {Promise}
     */
    getGlobalRankData(forceUpdate) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {

                let globalEntries = self._globalRankEntriesObj[self._boardName];
                if (!globalEntries) {
                    globalEntries = self._globalRankEntriesObj[self._boardName] = [];
                }

                let deltaTime = new Date().getTime() - self._time_lastreq_global_rank;
                if (deltaTime < self._time_req_min_interval && globalEntries.length > 0) {
                    self._sortCacheRank(globalEntries);
                    resolve(globalEntries.concat());
                } else if (!forceUpdate && globalEntries.length > 0) {
                    self._sortCacheRank(globalEntries);
                    resolve(globalEntries.concat());
                } else {
                    self._time_lastreq_global_rank = new Date().getTime();
                    self._fbinstant.getLeaderboardAsync(self._boardName)
                        .then(function (leaderboard) {
                            return leaderboard.getEntriesAsync(self._globalRankCount, 0);
                        })
                        .then(function (entries) {
                            let currentId = self._fbinstant.player.getID();
                            self._globalRankRealCountObj[self._boardName] = entries.length;
                            let list = self._globalRankEntriesObj[self._boardName] = [];
                            let rank = 1;
                            let isHigherBetter = self.isHigherBetter();
                            for (let i = 0, length = entries.length, item; i < length; i++) {
                                item = self._getEntryItem(entries[i]);
                                if (currentId === item.id) {
                                    self._bestScoreObj[self._boardName] = item.score;
                                }
                                if (!isHigherBetter && item.score === 0) {
                                    continue;
                                }
                                item.rank = rank++; // 容错处理
                                list.push(item);
                            }
                            resolve(list.concat());
                        })
                        .catch(function (error) {
                            if (globalEntries && globalEntries.length > 0) {
                                globalEntries = self._sortCacheRank(globalEntries);
                                resolve(globalEntries.concat());
                            } else {
                                reject('getGlobalRankData-error : ' + error.message);
                            }
                        });
                }
            }
        });

    },
    /**
     * 获取好友排行榜数据
     * @param {Boolean} forceUpdate 更新排行数据，且不进行缓存及时间的判断
     * @return {Promise}
     */
    getFriendsRankData(forceUpdate) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                let friends = self._friendsRankEntriesObj[self._boardName];
                if (!friends) {
                    friends = self._friendsRankEntriesObj[self._boardName] = [];
                }
                let deltaTime = new Date().getTime() - self._time_lastreq_friend_rank;
                if (deltaTime < self._time_req_min_interval && friends.length > 0) {
                    self._sortCacheRank(friends);
                    resolve(friends.concat());
                } else if (!forceUpdate && friends.length > 0) {

                    friends = self._sortCacheRank(friends);
                    resolve(friends.concat());

                } else {
                    self._time_lastreq_friend_rank = new Date().getTime();
                    // 从服务器获取排行数据
                    self._fbinstant.getLeaderboardAsync(self._boardName)
                        .then(function (leaderboard) {
                            return leaderboard.getConnectedPlayerEntriesAsync(self._friendsRankCount, 0);
                        })
                        .then(function (entries) {
                            let currentId = self._fbinstant.player.getID();
                            let list = self._friendsRankEntriesObj[self._boardName] = [];
                            let rank = 1;
                            let isHigherBetter = self.isHigherBetter();
                            for (let i = 0, length = entries.length, item; i < length; i++) {
                                item = self._getEntryItem(entries[i]);

                                if (currentId === item.id) {
                                    self._bestScoreObj[self._boardName] = item.score;
                                    self._hasSelf = true;
                                }
                                if (!isHigherBetter && item.score === 0) {
                                    continue;
                                }
                                item.rank = rank++;// 容错处理
                                list.push(item);
                            }
                            resolve(list.concat());
                        })
                        .catch(function (error) {
                            if (friends && friends.length > 0) {
                                friends = self._sortCacheRank(friends);
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
    },
    /**
     * 获取即将超越的好友列表
     * @warn 需要在成绩提交之前获取超越列表
     */
    getToSurpassFriends(score) {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.getMyRankData().then(function (data) {
                let bestScore = self._bestScoreObj[self._boardName];
                let isHigherBetter = self.isHigherBetter();
                if (isHigherBetter) {
                    score > bestScore ? (bestScore = score) : null;
                } else if (score !== 0) {
                    score < bestScore ? (bestScore = score) : null;
                }
                self.getFriendsRankData().then(function (entries) {
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
            }).catch(function (error) {
                reject('get Play info error: ' + error.message);
            });
        });
    },
    /**
     * 获取超越的好友
     * @warn 需要在成绩提交之前获取超越列表
     */
    getSurpassedFriends(currentScore, lastScore) {
        let self = this;
        return new Promise(function (resolve, reject) {
            let myData = {
                score: currentScore,
                id: self.getMyID(),
                name: self.getMyName(),
                photo: self.getMyPhoto(),
                extraData: { level: currentScore + 2 }
            };;
            let checkEntries = function (entries) {
                let beyonds = [];
                for (let i = 0, length = entries.length, entry; i < length; i++) {
                    entry = entries[i];
                    if (entry.id === myData.id) {
                        continue;
                    }
                    if (lastScore !== -1) {
                        if (self.isHigherBetter()) {
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
            self.getFriendsRankData().then(function (entries) {
                checkEntries(entries);
            }).catch(function (err) {
                reject('get Play info error: ' + err.message);
            });
        });
    },
    /***
     * 获取比最好成绩稍好的好友玩家
     */
    getFriendsGoalEntry(score) {
        return this._getLastBetterEntry(this._friendsRankEntriesObj, score);
    },
    // TODO 待优化，使用二分查找
    _getLastBetterEntry(obj, score) {
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
    },
    isHigherBetter() {
        return this._orderType === FBGame.OrderType.HIGHER_IS_BETTER;
    },
    _sortCacheRank(data) {
        let self = this;
        let currentId = this._fbinstant.player.getID();
        let isHigherBetter = this.isHigherBetter();
        for (let i = 0, length = data.length, element; i < length; i++) {
            element = data[i];
            if (element.id === currentId) {
                let bestScore = self._bestScoreObj[self._boardName] || 0;
                if ((isHigherBetter && bestScore > element.score) ||
                    (!isHigherBetter && bestScore < element.score)) {
                    element.score = bestScore;
                    // let extraData = element.extraData;
                    // if (extraData) {
                    //     let data = null;
                    //     for (let key in extraData) {
                    //         data = self._myExtraData[key];
                    //         if (typeof data !== 'undefined') {
                    //             extraData[key] = data;
                    //         }
                    //     }
                    // }
                }
                break;
            }
        }
        data.sort(isHigherBetter ? self._descendingOrderScore : self._ascendingOrderScore);
        data.forEach(function (element, index) {
            element.rank = index + 1;
        });
        return data;
    },

    _ascendingOrderScore(a, b) {
        return a.score - b.score;
    },

    _descendingOrderScore(a, b) {
        return b.score - a.score;
    },

    /**
      * 实体解析
      * @returns { {rank:Number, score:Number, extraData:any, extraData: any, timestamp:string, name:String, id:String, photo:String} } entry 
      */
    _getEntryItem(entry) {
        let player = entry.getPlayer();
        let extraData = entry.getExtraData() || null;
        if (extraData === 'rank') {
            extraData = null;
        }
        return {
            rank: entry.getRank(),
            score: entry.getScore(),
            extraData: JSON.parse(extraData),
            timestamp: entry.getTimestamp(),
            name: player.getName(),
            id: player.getID(),
            photo: player.getPhoto(),
        }
    },
    /////////////////////////////////// AD ///////////////////////////////////////

    canPlayInterstitialAd(id) {
        return !!this._interAdInstant[id || this._interstitalAdId];
    },
    canPlayRewardAd(id) {
        return !!this._rewardAdInstant[id || this._rewardAdId];
    },


    /**
     * 预加载激励广告
     * @return {Promise}
     */
    preloadRewardAd(id) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (!self._fbinstant) {
                reject('not init fb !');
                return;
            }

            if (!id && !self._rewardAdId) {
                reject('has no placement id-Ad!');
                return;
            }

            let supportedAPIs = self._fbinstant.getSupportedAPIs();
            let funcName = 'getRewardedVideoAsync';
            if (supportedAPIs.includes(funcName)) {
                let instant = self._rewardAdInstant[id || self._rewardAdId];
                if (!instant) {
                    let rewardedInstant = null;
                    self._fbinstant[funcName](id || self._rewardAdId)
                        .then(function (rewarded) {
                            rewardedInstant = rewarded;
                            return rewarded.loadAsync();
                        }).then(function () {
                            self._rewardAdInstant[id || self._rewardAdId] = rewardedInstant;
                            rewardedInstant = null;
                            resolve('Rewarded video preloaded');
                        }).catch(function (err) {
                            self._rewardAdInstant[id || self._rewardAdId] = null;
                            reject('Rewarded video failed to preload : ' + err.message);
                        });
                }

            } else {
                reject(`${funcName} is not Support!`);
            }
        });

    },
    /**
     * 显示激励广告
     * @return {Promise}
     */
    showRewardAd(id, preloadCb) {
        let self = this;
        if (typeof id === 'function') {
            preloadCb = id;
            id = null;
        }
        return new Promise(function (resolve, reject) {
            let instant = self._rewardAdInstant[id || self._rewardAdId];
            self._rewardAdInstant[id || self._rewardAdId] = null;;
            if (instant) {
                instant.showAsync()
                    .then(function () {
                        self.preloadRewardAd(id || self._rewardAdId).then(function () {
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
    },
    /**
     * 预加载插屏广告
     * @return {Promise}
     */
    preloadInterstitialAd(id) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (!self._fbinstant) {
                reject('not init fbinstant');
                return;
            }

            if (!id && !self._interstitalAdId) {
                reject('has no placement id - ad!');
                return;
            }

            let supportedAPIs = self._fbinstant.getSupportedAPIs();
            let funcName = 'getInterstitialAdAsync';
            if (supportedAPIs.includes(funcName)) {
                let instant = self._interAdInstant[id || self._interstitalAdId];
                if (!instant) {
                    let interAdInstant = null;
                    self._fbinstant[funcName](id || self._interstitalAdId)
                        .then(function (interstitial) {
                            interAdInstant = interstitial;
                            return interstitial.loadAsync();
                        }).then(function () {
                            self._interAdInstant[id || self._interstitalAdId] = interAdInstant;
                            resolve('Interstitial Ad preloaded !');
                        }).catch(function (err) {
                            self._interAdInstant[id || self._interstitalAdId] = null;
                            reject('Interstitial Ad failed to preload : ' + err.message);
                        });
                }
            } else {
                reject(`${funcName} is not Support!`);
            }
        });
    },
    /**
     * 显示插屏广告
     * @return {Promise}
     */
    showInterstitialAd(id, preloadCb) {
        let self = this;
        if (typeof id === 'function') {
            preloadCb = id;
            id = null;
        }
        return new Promise(function (resolve, reject) {
            let instant = self._interAdInstant[id || self._interstitalAdId];
            self._interAdInstant[id || self._interstitalAdId] = null;
            if (instant) {
                instant.showAsync()
                    .then(function () {
                        self.preloadInterstitialAd(id || self._interstitalAdId)
                            .then(function () {
                                preloadCb && preloadCb('preload');
                            })
                            .catch(function (message) {
                                preloadCb && preloadCb('-- show Inter Ad end -- preload another Ad instant fail! :' + message);
                            });
                        resolve('show Inter Ad success!');
                    })
                    .catch(function (error) {
                        reject('showInterstitialAd-error : ' + error.message);
                    });
            } else {
                reject('InterstitialAd not ready!');
            }
        });
    },

    createShortcut() {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.canCreateShortcutAsync()
                    .then(function (canCreateShortcut) {
                        if (canCreateShortcut) {
                            self._fbinstant.createShortcutAsync()
                                .then(function () {
                                    resolve('Shortcut created');
                                })
                                .catch(function (error) {
                                    reject('Shortcut not created: ' + error.message);
                                });
                        } else {
                            reject(`Check success - but - Can't create shortcut`);
                        }
                    }).catch(function (error) {
                        reject(`Can't create shortcut! : ` + error.message);
                    });
            } else {
                reject('not init fb!');
            }
        });

    },

    /////////////////////////////// FBControlFuncs /////////////////////////////////////
    quit() {
        if (this._fbinstant) {
            this._fbinstant.quit();
        }
    },
    onPause(cb) {
        if (this._fbinstant) {
            this._fbinstant.onPause(cb || function () {
                console.log('pause event trigger');
            });
        }
    },
    logEvent(eventName, valueToSum, parameters) {
        if (this._fbinstant) {
            this._fbinstant.logEvent(eventName, valueToSum || 0, parameters);
        }
    },
    ///////////////////////////////////Data//////////////////////////////
    /**
     * 
     * @param {Object} data An arbitrary data object, which must be less than or equal to 1000 characters when stringified.
     */
    setSessionData: function (data) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.setSessionData(data);
                resolve('has saved');
            } else {
                reject('not init fb!');
            }
        });

    },
    /**
     * The game can store up to 1MB of data for each unique player.
     * @param {Object} storeData 
     * @param {Boolean} [flushNow] 
     */
    saveData: function (storeData, flushNow) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (!storeData || 0 === Object.keys(storeData).length) {
                return reject("saveData: [storeData] param must be Object.");
            }

            if (self._fbinstant) {
                flushNow = void 0 !== flushNow && flushNow;
                self._fbinstant.player.setDataAsync(storeData).then(function () {
                    if (flushNow) {
                        self.flushData().then(function () {
                            resolve('flush save success');
                        }).catch(function (error) {
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
    },
    flushData: function () {
        let self = this;
        return new Promise(function (resolve, reject) {
            self._fbinstant.player.flushDataAsync().then(function () {
                resolve();
            }).catch(function (error) {
                reject(error);
            });
        });
    },
    getData: function (keys) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.player.getDataAsync(keys).then(function (data) {
                    resolve(data);
                }).catch(function (error) {
                    reject(`can't get Data - error : ` + error.message);
                });
            } else {
                reject('not init fb!');
            }
        });
    },
    ////////////////////////////////Social///////////////////////////////////////
    /**
     * 从分享、邀请、挑战进入后获取的数据
     */
    getEntryPointData() {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                let data = self._fbinstant.getEntryPointData();
                if (data) {
                    resolve(data);
                } else {
                    reject('no data!');
                }
            } else {
                reject('no init fb!');
            }
        });
    },
    /**
     * 获取打开的平台入口名
     */
    getEntryPointAsync() {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.getEntryPointAsync()
                    .then(function (entryPoint) {
                        resolve(entryPoint);
                    }).catch(function (error) {
                        reject(error);
                    });
            } else {
                reject('no init fb!');
            }
        });
    },

    /**
     * 分享
     * @param {'INVITE' | 'REQUEST' | 'CHALLENGE' | 'SHARE'} type
     * @param {Object} extraData
     * @param {String} text
     * @param {String} image
     */
    share: function (type, dataType, extraData, text, image) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                if (!image) {
                    image = self.shareImg;
                }

                if (image.indexOf('data:image/') !== 0) {
                    console.error('Share [image] param is Error.');
                    return;
                }

                if (!type) {
                    type = 'SHARE';
                } else {
                    type = 'REQUEST';
                }
                let score = self._bestScoreObj[self._boardName] || 0;
                if (!text || text === '') {
                    if (score === 0) {
                        text = self.SHARE_NEW_TEXT_TEMPLATE;
                    }
                    else {
                        text = self.SHARE_SCORE_TEXT_TEMPLATE;
                    }
                    text = text.replace('{SCORE}', score);
                }
                let data = {
                    contextID: self._fbinstant.context.getID(),
                    score: score,
                    photo: self._fbinstant.player.getPhoto(),
                    playerID: self._fbinstant.player.getID(),
                    type: dataType || type,
                    extraData: extraData,
                };
                self._fbinstant.shareAsync({
                    intent: type,
                    text: text,
                    image: image,
                    data: data
                }).then(function (data) { // 不管分享成功还是失败
                    // continue with the game
                    self._fbinstant.logEvent('SHARE_' + type, 1, data);
                    resolve(data);
                }).catch(function (error) {
                    reject(error);
                });
            } else {
                reject('not init fb!');
            }
        });
    },
    /**
     * 随机匹配玩家
     */
    matchPlayers() {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.checkCanPlayerMatchAsync()
                    .then(function (canMatch) {
                        if (canMatch) {
                            self._fbinstant.matchPlayerAsync().then(function () {
                                self.customUpdate('RANDOM_MATCH_PLAYER');
                                self._fbinstant.logEvent('RANDOM_MATCH_PLAYER', 1);
                                resolve('success match');
                            }).catch(function (error) {
                                reject('match-error : ' + error.message);
                            });
                        }
                    }).catch(function (error) {
                        reject(error);
                    });
            } else {
                console.log(' not init fb！');
            }

        });
    },

    /**
   * 邀请好友
   * @param type
   * @param extraData 
   * @param cta    邀请信息按钮的显示内容
   * @param text 
   * @param image  显示图片
   * @param template   邀请信息文本模板
   * @return {Promise}
   */
    invite: function (type, extraData, text, cta, image, template) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.context.chooseAsync({
                    filters: [],
                    minSize: 3
                }).then(function () {
                    self.customUpdate(type || 'INVITE_FRIENDS', text, cta, image, template, extraData);
                    self._fbinstant.logEvent(type || 'INVITE_FRIENDS', 1, { type: self._fbinstant.context.getType() });
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            } else {
                reject('not init fb!');
            }
        });
    },

    /**
    * 挑战好友
    * @param {String} playerID
    */
    challengeWithFriend: function (playerID) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (self._fbinstant) {
                self._fbinstant.context.createAsync(playerID)
                    .then(function () {
                        resolve();
                        self._fbinstant.logEvent(
                            "CHALLENGE_WITH_FRIENDS", 1, {
                                type: self._fbinstant.context.getType()
                            }
                        );
                    }).catch(function (error) {
                        reject(error);
                    });
            } else {
                reject('not init fb !');
            }
        });

    },
    /**
     * 通用信息提交更新
     * @param {String} type   更新类型
     * @param {String | Object} text   信息显示文本
     * @param {String} cta    信息更新提交后显示的进入游戏按钮
     * @param {base64Image} image 显示的图片
     * @param {String} template  显示的文本内容
     * @param {*} extraData  需要传递的额外数据
     */
    customUpdate(type, text, cta, image, template, extraData) {
        let self = this;

        image = image || this.shareImg;
        if (type && typeof text === 'object') {
            text = {
                default: text.en,
                localizations: {
                    en_US: text.en,
                    zh_CN: text.zh,
                    zh_HK: text.zh,
                    zh_TW: text.zh
                }
            };
        } else {
            text = {
                default: text,
                localizations: {
                    en_US: text,
                    zh_CN: text,
                    zh_HK: text,
                    zh_TW: text
                }
            };
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
        return new Promise(function (resolve, reject) {
            let fb = self._fbinstant;
            if (fb) {
                let player = fb.player;
                let data = {
                    playerID: player.getID(),
                    contextID: fb.context.getID(),
                    photo: player.getPhoto(),
                    score: self._bestScoreObj[self._boardName],
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
                }
                // console.log('update-payload', updatePayload);
                fb.updateAsync(updatePayload).then(function () {
                    resolve('Custom-Update Message was sent successfully');
                }).catch(function (err) {
                    reject(err);
                });
            } else {
                reject('not init fb!');
            }
        });
    },

    /////////////////////////////////Other/////////////////////////////////

    hasSelf() {
        return this._hasSelf;
    },

    getMyID() {
        if (this._fbinstant) {
            return this._fbinstant.player.getID();
        }
        return null;
    },

    getMyName() {
        if (this._fbinstant) {
            return this._fbinstant.player.getName();
        }
        return 'Your friend';
    },

    getMyPhoto() {
        if (this._fbinstant) {
            return this._fbinstant.player.getPhoto();
        }
        return null;
    },

    getMyBestScore() {
        return this._bestScoreObj[this._boardName] || 0;
    },

    setMyBestScore(score) {
        let lastScore = this._bestScoreObj[this._boardName] || 0;
        if (score > lastScore) {
            this._bestScoreObj[this._boardName] = score;
        }
    },

    setMyExtraData(data) {
        this._myExtraData = data;
    }

};
module.exports = new FBGame();
