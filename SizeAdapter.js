

/**
 * @description 用于适配的通用脚本
 * @author Jonle
 * @time 2019.04
 */


/**
 * 全屏适配类型
 * @type {{NONE: number, SHOW_ALL_CONTENT: number, SHOW_ALL_SCALE: number, EXACT_SCALE: number}}
 */
let AdapterType = cc.Enum({
    NONE: 0,
    SHOW_ALL_CONTENT: 1,
    SHOW_ALL_SCALE: 2,
    EXACT_SCALE: 3
});
cc.Class({
    extends: cc.Component,

    properties: {
        type: {
            default: 1,
            type: AdapterType,
            notify() {
                if (this.type === AdapterType.SHOW_ALL_SCALE || this.type === AdapterType.SHOW_ALL_CONTENT) {
                    cc.Canvas.instance.fitWidth = true;
                    cc.Canvas.instance.fitHeight = true;
                }
            },
            tooltip: 'WARN:该组件必要時会强制使用SHOW_ALL模式。\n尺寸适配类型：\n1、SHOW_ALL_CONTENT: 内容适配，适合UI、窗口等布局使用。\n2、SHOW_ALL_SCALE: 等比缩放适配，适合背景使用。\n3、EXACT_SCALE: 撐滿屏幕缩放适配，适合背景使用。'
        },
        _useMask: false,
        useMask: {
            get() {
                return this._useMask;
            },
            set(value) {

                if (cc.sys.isMobile) {
                    value = false;
                }
                this._useMask = value;
                let mask = this.node.getComponent(cc.Mask);
                if (value && !mask) {
                    if (!this.node.getComponent(cc.RenderComponent)) { // 只在当前节点没有渲染组件的情况添加遮罩，用于遮挡web端是窗外元素
                        mask = this.node.addComponent(cc.Mask);
                    }
                } else if (!value && mask) {
                    this.node.removeComponent(cc.Mask);
                    mask = null;
                }
                if (!mask && this._useMask) {
                    this.useMask = false;
                    CC_EDITOR && Editor.warn('每个节点只能存在一个渲染组件，当前使用Mask组件无效！');
                }
            },
            tooltip: '默认：false。\n使用遮罩遮挡视窗外元素，\n如果已添加自动忽略。'
        }
    },
    onLoad() {
        this.updateSize();
    },

    start() {
        this.updateSize();
    },
    /**
     * 按照canvas做content适配
     * @param node
     */
    setFitContent(node) {
        if (cc.sys.isMobile) {
            let canvasSize = cc.view.getCanvasSize();
            // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
            let srcScaleForShowAll = Math.min(canvasSize.width / node.width, canvasSize.height / node.height);
            let realWidth = node.width * srcScaleForShowAll;
            let realHeight = node.height * srcScaleForShowAll;

            // 2. 基于第一步的数据，再做节点宽高适配
            let scaleX = canvasSize.width / realWidth;
            let scaleY = canvasSize.height / realHeight;
            node.width = node.width * scaleX;
            node.height = node.height * scaleY;
        }
    },
    /**
     * 按照canvas做scale适配
     * @param node
     */
    setFitScale(node) {
        let canvasSize = cc.view.getCanvasSize();
        // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
        let srcScaleForShowAll = Math.min(canvasSize.width / node.width, canvasSize.height / node.height);
        let realWidth = node.width * srcScaleForShowAll;
        let realHeight = node.height * srcScaleForShowAll;

        // 2. 基于第一步的数据，再做缩放适配
        node.scale = Math.max(canvasSize.width / realWidth, canvasSize.height / realHeight);
    },
    /**
     * 按照父节点做scale适配
     * @param node
     */
    setExactScale(node) {
        // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
        let parentSize = node.parent.getContentSize();
        node.scale = Math.max(parentSize.width / node.width, parentSize.height / node.height);
    },

    updateSize() {
        if (!cc.sys.isMobile && this.type === AdapterType.SHOW_ALL_CONTENT) {
            this.type = AdapterType.NONE;
        }
        if (this.type === AdapterType.SHOW_ALL_CONTENT) {
            this.setFitContent(this.node);
        } else if (this.type === AdapterType.SHOW_ALL_SCALE) {
            this.setFitScale(this.node);
        } else if (this.type === AdapterType.EXACT_SCALE) {
            this.setExactScale(this.node);
        }
    }
});
