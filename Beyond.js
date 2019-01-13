cc.Class({
    extends: cc.Component,

    properties: {
        imgSprite: cc.Sprite,
        nickName: cc.Label,
        score: cc.Label,
        _currentEntry:{
            default:null,
            serializable:false,
        }
    },

    onLoad() {
        this.node.active = false;
        cc.fbgame.getFriendsRankList().then(function () {
            cc.fbgame.getPlayerRankData().then(function(entry){
                this.refreshBeyong(entry.score);
                cc.fbgame.setMyBestScore(entry.score);
            }.bind(this));
        }.bind(this));
    },

    refreshBeyong(score) {
        this.node.active = !!this._currentEntry;
        let bestScore = cc.fbgame.getMyBestScore();
        if(score < bestScore) return;
        let entry = cc.fbgame.getFriendsGoalEntry(score);
        if (entry) {
            this._currentEntry = entry;
            this.node.active = true;
            if (this.nickName.string !== entry.name) {
                let url = entry.photo;
                let type = url.split('?')[0].split('.');
                type = type[type.length - 1];
                cc.loader.load({ url: url, type: type }, (function (error, texture) {
                    if (!error && this.imgSprite) {
                        this.imgSprite.spriteFrame = new cc.SpriteFrame(texture);
                    }
                }).bind(this));
            }
            this.nickName.string = entry.name;
            this.score.string = entry.score;
        } else {
            this._currentEntry = null;
            this.node.active = false;
        }
    },

    refreshVisible () {
        this.node.active = !!this._currentEntry;
    }
});
