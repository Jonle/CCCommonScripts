
let Type = cc.Enum({
    NONE:0,
    CONTENT:1,
    SCALE:2
});


cc.Class({
    extends: cc.Component,

    properties: {
        type:{
            default:1,
            type:Type,
            notify() {
                if(this.type === Type.SCALE || this.type === Type.CONTENT) {
                    cc.Canvas.instance.fitWidth = true;
                    cc.Canvas.instance.fitHeight = true;
                }
            },
            tooltip:'WARN:该组件会强制使用SHOW_ALL模式。\n尺寸适配类型：\n1、CONTENT: 内容适配，适合UI、窗口等布局使用。\n2、SCALE: 缩放适配，适合背景使用。'
        },
        _tempMask:null,
        _useMask:false,
        useMask :{
            get () {
                return this._useMask;
            },
            set (value) {

                if(cc.sys.isMobile) {
                    value = false;
                }
                this._useMask = value;
                let mask = this.node.getComponent(cc.Mask);
                if(value && !mask) {
                    if(!this.node.getComponent(cc.RenderComponent)) {
                        mask = this.node.addComponent(cc.Mask);
                    }
                } else if(!value && mask) {
                    this.node.removeComponent(cc.Mask);
                    mask = null;
                }
                if(!mask && this._useMask) {
                    this.useMask = false;
                    CC_EDITOR && Editor.warn('每个节点只能存在一个渲染组件，当前使用Mask组件无效！');
                }
            },
            tooltip:'默认：false。\n使用遮罩遮挡视窗外元素，\n如果已添加请忽略。'
        }
    },
    onLoad () {
        if(!cc.sys.isMobile) {
            this.type = Type.NONE;
        }
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
    },
});
