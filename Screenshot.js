cc.Class({
    extends: cc.Component,

    properties: {
        captureNode: cc.Node,
        _realHeight: {
            default: 0,
            serializable: false
        },
        _base64: {
            default: null,
            serializable: false
        },
        show: cc.Node,
        top: 0,
    },

    onLoad() {
        this._realHeight = this.captureNode.height;
    },

    setHeight(height) {
        this._realHeight = height;
    },

    capture(cb, ctx) {
        function callback() {
            cc.director.off(cc.Director.EVENT_AFTER_DRAW, callback, this);
            this.getCapture((frame) => {
                // let sprite = this.show.getComponent(cc.Sprite);
                // sprite.spriteFrame = frame;
                // sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                // this.show.width = this.captureNode.width;
                // this.show.height = this._realHeight;
                if (cb) cb.call(ctx, this._base64);
            });

        }
        cc.director.on(cc.Director.EVENT_AFTER_DRAW, callback, this);
    },

    getCapture(callback) {
        var gameCanvas = document.getElementById("GameCanvas");
        var base64 = gameCanvas.toDataURL("image/png");
        var canvas = document.createElement("canvas");
        var img = new Image();
        img.src = base64;
        let self = this;
        img.onload = function () {
            let widthScale = img.width / cc.winSize.width;
            let heightScale = img.height / cc.winSize.height;
            let rect = {
                x: 0,
                y: self.top * heightScale,
                width: (img.width - 2) * widthScale,
                height: self._realHeight * heightScale
            };

            canvas.width = rect.width;
            canvas.height = rect.height;
            var context2d = canvas.getContext('2d');
            context2d.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

            self._base64 = canvas.toDataURL("image/png");
            var texture = new cc.Texture2D();
            texture.initWithElement(canvas);
            texture.handleLoadedTexture();
            var newframe = new cc.SpriteFrame(texture);
            if (callback) callback(newframe);
        }
    },
    /**
     * 切图
     * @param { cc.SpriteFrame or cc.Texture2D} data 
     * @param {*} rect 
     */
    cutPicture(data, rect) {
        let frame;
        if (data instanceof cc.SpriteFrame) {
            frame = data;
        } else if (data instanceof cc.Texture2D) {
            frame = new cc.SpriteFrame(texture);
        }
        if (!frame) {
            return null;
        }
        frame.setRect({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        });
        return frame;
    },

    getBase64Capture() {
        return this._base64;
    }
});