cc.Class({
    extends: cc.Component,

    properties: {
        btnInvite: cc.Node,
        id: {
            default: 0,
            visible: false,
            serializble: false,
        },
        rank: cc.Label,
        avatar: cc.Sprite,
        nickName: cc.Label,
        score: cc.Label,
        bgSprite: cc.Sprite,
        defaultAvatar: cc.SpriteFrame,
        bgSpriteFrames: [cc.SpriteFrame],
        _isGlobalRank: false,
    },

    onEnable() {
        if (this.btnInvite) {
            this.btnInvite.on(cc.Node.EventType.TOUCH_END, this._onClickInvite, this);
        }

    },

    onDisable() {
        if (this.btnInvite) {
            this.btnInvite.off(cc.Node.EventType.TOUCH_END, this._onClickInvite, this);
        }

    },
    /**
     * 
     * @param {{rank:Number, score:Number, extraData:any, extraData: any, timestamp:string, name:String, id:String, photo:String}} entry 
     */
    init(entry) {
        if (this.nickName.string !== entry.name) {
            this.avatar.spriteFrame = this.defaultAvatar;
            let url = entry.photo;
            let type = url.split('?')[0].split('.');
            type = type[type.length - 1];
            cc.loader.load({ url: url, type: type }, ((error, texture) => {
                if (!error && this.avatar) {
                    this.avatar.spriteFrame = new cc.SpriteFrame(texture);
                }
            }).bind(this));
        }
        let rank = entry.rank;
        let isSelf = entry.id === cc.fbgame.getMyID();
        this.bgSprite.spriteFrame = this.bgSpriteFrames[isSelf ? 0 : 1];
        this.rank.string = rank;
        this.score.string = entry.score;
        this.nickName.string = entry.name;
        this.id = entry.id;
        if (this.btnInvite) {
            this.btnInvite.active = !isSelf && !this._isGlobalRank;
        }

    },

    setGlobalRank(value) {
        this._isGlobalRank = value;
        if (this.btnInvite) {
            this.btnInvite.active = !value;
        }
    },

    _onClickInvite() {
        cc.fbgame.challengeWithPlayerID(this.id).then(function () {
            console.log('--challenge--');
        }).catch(function (message) {
            console.log(message);
        });
    }
});
