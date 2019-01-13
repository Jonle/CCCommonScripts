
const { ccclass, property } = cc._decorator;

@ccclass
export default class NodeCapture extends cc.Component {

    @property(cc.Node)
    captureNode: cc.Node = null;

    capture(cb, ctx) {
        let callback = function () {
            cc.director.off(cc.Director.EVENT_AFTER_DRAW, callback, this);
            let renderTexture = null;
            if (cc._renderType === cc.game.RENDER_TYPE_WEBGL) {
                renderTexture = new cc.RenderTexture(cc.winSize.width, cc.winSize.height, cc.ImageFormat.PNG, window.gl.DEPTH24_STENCIL8_OES);
            } else {
                renderTexture = new cc.RenderTexture(cc.winSize.width, cc.winSize.height, cc.ImageFormat.PNG);
            }
            //把 renderTexture 添加到场景中去，否则截屏的时候，场景中的元素会移动
            let node = new cc.Node();
            node.addComponent(cc.Sprite);
            // node._sgNode.addChild(renderTexture);
            node.parent = this.captureNode.parent;
            node.y = -200;
            //把 renderTexture 设置为不可见，可以避免截图成功后，移除 renderTexture 造成的闪烁
            renderTexture.setVisible(true);

            //实际截屏的代码
            renderTexture.begin();
            //this.richText.node 是我们要截图的节点，如果要截整个屏幕，可以把 this.richText 换成 Canvas 切点即可
            this.captureNode._sgNode.visit();
            renderTexture.end();
            let base64 = null;
            if (cc._renderType === cc.game.RENDER_TYPE_WEBGL) {

                let gl = <WebGLRenderingContext>cc.game._renderContext;
                let width = gl.drawingBufferWidth;
                let height = gl.drawingBufferHeight;
                let uint8Array = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
                gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, uint8Array);
                // webGL 图像数据是上下颠倒的
                let halfHeight: number = Math.floor(height / 2);
                let bytesPerRow: number = width * 4;
                let temp = new Uint8Array(width * 4);
                for (let y = 0; y < halfHeight; ++y) {
                    let topOffset: number = Math.round(y * bytesPerRow);
                    let bottomOffset = Math.round((height - y - 1) * bytesPerRow);
                    temp.set(uint8Array.subarray(topOffset, topOffset + bytesPerRow));
                    uint8Array.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);
                    uint8Array.set(temp, bottomOffset);
                }
                let clampArray = new Uint8ClampedArray(this.toArrayBuffer(uint8Array), 0, uint8Array.length);
                let imageData = new ImageData(clampArray, gl.drawingBufferWidth, gl.drawingBufferHeight);
                let tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
                var texture = new cc.Texture2D();
                texture.initWithElement(tempCanvas);
                texture.handleLoadedTexture();
                var newframe = new cc.SpriteFrame(texture);
                node.getComponent(cc.Sprite).spriteFrame = newframe;
                base64 = tempCanvas.toDataURL('image/png');
            } else {
                base64 = renderTexture.getSprite().getTexture().getHtmlElementObj().toDataURL();
            }
            // node.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(renderTexture.getSprite().getTexture());

            if (cb) cb.call(ctx, base64);
        }

        cc.director.on(cc.Director.EVENT_AFTER_DRAW, callback, this);

    }

    toArrayBuffer(buf) {
        let ab = new ArrayBuffer(buf.length);
        let view = new Uint8Array(ab);
        for (let i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }
}
