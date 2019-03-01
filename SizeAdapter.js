
let Type = cc.Enum({
    CONTENT:1,
    SCALE:2
});


cc.Class({
    extends: cc.Component,

    properties: {
        type:{
            default:1,
            type:Type
        }
    },
    onLoad () {
        if(this.type === Type.CONTENT) {
            this.setFitContent(this.node);
        } else if(this.type === Type.SCALE) {
            this.setFitScale(this.node);
        }
    },

    setFitContent (node) {
        if(cc.sys.isMobile) {
            // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
            let srcScaleForShowAll = Math.min(cc.view.getCanvasSize().width / node.width, cc.view.getCanvasSize().height / node.height);
            let realWidth = node.width * srcScaleForShowAll;
            let realHeight = node.height * srcScaleForShowAll;

            // 2. 基于第一步的数据，再做节点宽高适配
            let scaleX = cc.view.getCanvasSize().width / realWidth;
            let scaleY = cc.view.getCanvasSize().height / realHeight;
            node.width = node.width * scaleX;
            node.height = node.height * scaleY;
        }
    },

    setFitScale (node) {
        if (cc.sys.isMobile) {
            // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
            let srcScaleForShowAll = Math.min(cc.view.getCanvasSize().width / node.width, cc.view.getCanvasSize().height / node.height);
            let realWidth = node.width * srcScaleForShowAll;
            let realHeight = node.height * srcScaleForShowAll;

            // 2. 基于第一步的数据，再做缩放适配
            node.scale = Math.max(cc.view.getCanvasSize().width / realWidth, cc.view.getCanvasSize().height / realHeight);
        }
    }
});
