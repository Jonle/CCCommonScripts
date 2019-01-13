const EventType = {
    EVENT_PLAY_NOW: 'EVENT_PLAY_NOW'
}
const RankType = cc.Enum({
    FRIENDS: 0,
    GLOBAL: 1
});
const StyleType = cc.Enum({
    BASE: 0,
    FRIENDS: 1,
    GLOBAL: 2,
    FRIENDS_GLOBAL: 3
});

cc.Class({

    statics:{
        EventType
    },

    extends: cc.Component,

    properties: {
        styleType: {
            default: 0,
            type: StyleType,
            tooltip: 'leaderboard主题类型'
        },
        homeRank: {
            default: false,
            tooltip: '是否首页立即显示'
        },
        boardContent: cc.Node,
        playNowInBoard: {
            default: false,
            tooltip: '界面是否存在play按钮',
        },
        btnPlayNow: {
            default: null,
            type: cc.Node,
            visible() {
                return this.playNowInBoard;
            }
        },
        btnFriends: {
            default: null,
            type: cc.Node,
            visible() {
                return this.styleType === StyleType.FRIENDS || this.styleType === StyleType.FRIENDS_GLOBAL;
            }
        },
        friendsFontColor: {
            default: cc.color(0, 0, 0),
            tooltip: '好友排行按钮字体默认颜色',
            visible() {
                return !!this.btnFriends;
            }
        },
        btnGlobal: {
            default: null,
            type: cc.Node,
            visible() {
                return this.styleType === StyleType.GLOBAL || this.styleType === StyleType.FRIENDS_GLOBAL;
            }
        },
        globalFontColor: {
            default: cc.color(255, 255, 255),
            tooltip: '全球排行按钮字体默认颜色',
            visible() {
                return !!this.btnGlobal;
            }
        },
        needChangeBtnBg: {
            default: true,
            visible() {
                return this.styleType === StyleType.FRIENDS_GLOBAL;
            }
        },
        useWidgetTarget: {
            default: false,
            tooltip: '是否使用target确定leaderboard位置'
        },
        widgetTarget: {
            default: null,
            type: cc.Node,
            tooltip: '指定一个固定的对其目标，若为空，则节点按照中心点对齐',
            visible() {
                return this.useWidgetTarget;
            }
        },
        rankDisplayType: {
            default: 0,
            type: RankType,
            tooltip: '排行榜默认显示类型'
        },

        rankCtrl: {
            default: null,
            type: require('ListCtrl')
        },
        _currentRankType: {
            default: '',
            serializable: false,
        }
    },

    onLoad() {
        this.boardContent.active = true;
        this._actionDuration = 0.3;
        if (this.btnFriends) {
            if (this.needChangeBtnBg) {
                this.btnFriends.oriFrame = this.btnFriends.getComponent(cc.Sprite).spriteFrame;
            }
            this.btnFriends.children[0].color = this.friendsFontColor;
        }
        if (this.btnGlobal) {
            if (this.needChangeBtnBg) {
                this.btnGlobal.oriFrame = this.btnGlobal.getComponent(cc.Sprite).spriteFrame;
                this.btnGlobal.getComponent(cc.Sprite).spriteFrame = null;
            }
            this.btnGlobal.children[0].color = this.globalFontColor;
        }

        this._itemList = [];
        this._oriContainerPos = this.boardContent.position;
        this._gapY = 0;
        if (this.useWidgetTarget && this.widgetTarget) {
            this._gapY = this.boardContent.y - this.widgetTarget.y;
        }

    },

    start() {
        let designSize = cc.view.getDesignResolutionSize();
        let scaleHeight = cc.winSize.height / designSize.height;
        let scaleWidth = cc.winSize.width / designSize.width;
        this._oriScale = scaleHeight > scaleWidth ? scaleWidth : scaleHeight;
        this.boardContent.scale = this._oriScale;
        if (this.styleType === StyleType.FRIENDS_GLOBAL && !this.homeRank) {
            this.boardContent.active = false;
        }
    },

    onEnable() {
        this.btnFriends && this.btnFriends.on(cc.Node.EventType.TOUCH_START, this._onClickFriendsRank, this);
        this.btnGlobal && this.btnGlobal.on(cc.Node.EventType.TOUCH_START, this._onClickGlobalRank, this);
        this.btnPlayNow && this.btnPlayNow.on(cc.Node.EventType.TOUCH_END, this._onClickPlayNow, this);
    },

    onDisable() {
        this.btnFriends && this.btnFriends.off(cc.Node.EventType.TOUCH_START, this._onClickFriendsRank, this);
        this.btnGlobal && this.btnGlobal.off(cc.Node.EventType.TOUCH_START, this._onClickGlobalRank, this);
        this.btnPlayNow && this.btnPlayNow.off(cc.Node.EventType.TOUCH_END, this._onClickPlayNow, this);
        this._maskBg = null;
        while (this._itemList.length) {
            let item = this._itemList.pop();
            cc.poolMgr.put(item);
        }
    },

    _onClickPlayNow () {
        cc.systemEvent.emit(EventType.EVENT_PLAY_NOW);
    },

    onDestroy() {
        if (this.btnFriends) {
            this.btnFriends.oriFrame = null;
        }
        if (this.btnGlobal) {
            this.btnGlobal.oriFrame = null;
        }
    },

    show(maskBg, forceUpdate) {
        if (this._isShowLeader) return;
        this._isShowLeader = true;
        if (this.useWidgetTarget && this.widgetTarget) {
            this.boardContent.y = this.widgetTarget.y + this._gapY;
        }
        this.boardContent.active = true;
        if (this.styleType === StyleType.FRIENDS_GLOBAL && !this.homeRank) {
            this.boardContent.scale = 0.3;
            this.boardContent.opacity = 50;
            let action = cc.sequence(cc.spawn(cc.scaleTo(this._actionDuration, this._oriScale).easing(cc.easeBackOut()), cc.fadeIn(this._actionDuration)),
                cc.callFunc(function () {

                }, this));
            this.boardContent.runAction(action);
        }
        this._forceUpdate = false;
        if (typeof maskBg !== 'boolean' && maskBg) {
            this._maskBg = maskBg;
            maskBg.active = true;
            this.getRankList(this.rankDisplayType, forceUpdate);
        } else {
            this.getRankList(this.rankDisplayType, maskBg);
            forceUpdate = maskBg;
        }
        this._forceUpdate = forceUpdate;
        this._currentRankType = this.rankDisplayType;
    },

    close(cb, context) {
        let action = cc.sequence(cc.spawn(cc.scaleTo(this._actionDuration, 0).easing(cc.easeBackIn()), cc.fadeOut(this._actionDuration)),
            cc.callFunc(function () {
                if (this._maskBg) {
                    this._maskBg.active = false;
                    this._maskBg = null;
                }
                this.boardContent.active = false;
                this._isShowLeader = false;
                cb && cb.call(context);
            }, this));
        this.boardContent.runAction(action);
    },

    _onClickFriendsRank() {
        if (this._currentRankType !== RankType.FRIENDS) {
            this.getRankList(RankType.FRIENDS, this._forceUpdate);
            this._currentRankType = RankType.FRIENDS;
        }

    },

    _onClickGlobalRank() {
        if (this._currentRankType !== RankType.GLOBAL) {
            this.getRankList(RankType.GLOBAL, this._forceUpdate);
            this._currentRankType = RankType.GLOBAL;
        }

    },

    submitScore(score, extraData) {
        cc.fbwaves.submitScore(score, extraData).then(function () {
            cc.fbwaves.getFriendsRankData(true).then(function () {
                cc.fbwaves.getGlobalRankData(true);
            }).catch(function () {
                cc.fbwaves.getGlobalRankData(true);
            });
        }).catch(function (message) {
            console.log('Game Over Submit Score - error : ' + message);
        });
    },
    getRankList(type, forceUpdate) {
        this._changeBtnState(type);
        if (type === RankType.FRIENDS) {
            cc.fbwaves.getFriendsRankData(forceUpdate).then(this._initList.bind(this, type)).catch(function (message) {
                console.log('Game Over Rank - error : ' + message);
            });
        } else if (type === RankType.GLOBAL) {
            cc.fbwaves.getGlobalRankData(forceUpdate).then(this._initList.bind(this, type)).catch(function (message) {
                console.log('Game Over Rank - error : ' + message);
            });
        }
    },

    _changeBtnState(type) {
        let globalSprite = this.btnGlobal ? this.btnGlobal.getComponent(cc.Sprite) : null;
        let friendsSprite = this.btnFriends ? this.btnFriends.getComponent(cc.Sprite) : null;
        let globalDesc = this.btnGlobal ? this.btnGlobal.children[0] : null;
        let friendsDesc = this.btnFriends ? this.btnFriends.children[0] : null;

        if (this.btnFriends && this.btnGlobal) {
            if (type === RankType.FRIENDS) {
                globalDesc.color = this.globalFontColor;
                friendsDesc.color = this.friendsFontColor;
                if (this.needChangeBtnBg) {
                    globalSprite.spriteFrame = null;
                    friendsSprite.spriteFrame = this.btnFriends.oriFrame;
                }
            } else {
                globalDesc.color = this.friendsFontColor;
                friendsDesc.color = this.globalFontColor;
                if (this.needChangeBtnBg) {
                    globalSprite.spriteFrame = this.btnGlobal.oriFrame;
                    friendsSprite.spriteFrame = null;
                }
            }
        }
    },

    _initList(type, entries) {
        for (let i = 0, length = entries.length; i < length; i++) {
            entries[i]['type'] = type;
        }
    }
});