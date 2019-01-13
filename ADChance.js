cc.Class({
    extends: cc.Component,

    properties: {
        chanceContent: cc.Node,
        btnNo: cc.Node,
        btnAd: cc.Node,
        btnPlayWithFriends: cc.Node,
    },

    onLoad() {
        this._actionDuration = 0.35;
        this.chanceContent.active = false;
        this.btnNo.oriPos = this.btnNo.position;
    },

    onDisable() {
        this._maskBg = null;
    },

    show(maskBg) {
        this.chanceContent.parent.active = true;
        this.chanceContent.active = true;
        this.chanceContent.scale = 0.3;
        this.chanceContent.opacity = 50;
        let action = cc.spawn(cc.scaleTo(this._actionDuration, 1).easing(cc.easeBackOut()), cc.fadeIn(this._actionDuration));
        this.chanceContent.runAction(action);
        if (maskBg) {
            this._maskBg = maskBg;
            maskBg.active = true;
        }
    },

    close(cb, context) {
        let action = cc.sequence(
            cc.spawn(cc.scaleTo(this._actionDuration, 0).easing(cc.easeBackIn()), cc.fadeOut(this._actionDuration)),
            cc.callFunc(function () {
                if (this._maskBg) {
                    this._maskBg.active = false;
                    this._maskBg = null;
                }
                this.chanceContent.active = false;
                cb && cb.call(context);
            }, this));
        this.chanceContent.runAction(action);

    },

    isShowing() {
        return this.chanceContent.active;
    },

    showNoAdUI() {
        this.btnAd.active = false;
        this.btnNo.position = this.btnAd.position;
    },

    showHasAdUI() {
        this.btnAd.active = true;
        this.btnNo.position = this.btnNo.oriPos;
    },

    addBtnNoListener(listener, context) {
        this._addListener(this.btnNo, listener, context);
    },

    removeBtnNoListener(listener, context) {
        this._removeListener(this.btnNo, listener, context);
    },

    addWatchAdListener(listener, context) {
        this._addListener(this.btnAd, listener, context);
    },
    removeWatchAdListener(listener, context) {
        this._removeListener(this.btnAd, listener, context);
    },
    addPlayWithFriendsListener(listener, context) {
        this._addListener(this.btnPlayWithFriends, listener, context);
    },
    removePlayWithFriendsListener(listener, context) {
        this._removeListener(this.btnPlayWithFriends, listener, context);
    },

    _addListener(node, listener, context) {
        node.on(cc.Node.EventType.TOUCH_END, listener, context);
    },

    _removeListener(node, listener, context) {
        node.off(cc.Node.EventType.TOUCH_END, listener, context);
    }
});
