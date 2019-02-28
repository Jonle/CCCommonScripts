module.exports = {
    RAD: Math.PI / 180,
    DEG: 180 / Math.PI,
    PI_2: Math.PI / 2,
    randomInt(min, max) {
        if (min > max) {
            var temp = max;
            max = min;
            min = temp;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    },
    random(min, max) {
        return min + Math.random() * (max - min);
    },
    pDistance(x1, y1, x2, y2) {
        var dx = x1 - x2;
        var dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    },
    /**
     * 获取两个位置形成的夹角对应cocos节点的rotation
     * 以起点为原点建立坐标系,计算两个点之间的角度（按照数学四象限划分）
     注：若涉及到图片方向，则图片出图方向默认朝右，若该角度需要赋值给rotation，则只需要将获得的角度取反后再赋值即可
     例如：（图片方向默认朝右）
     var angle = f.angleAnalyseForQuad(startPos, curPos);
     this.node.rotation = -angle;
     */
    angleAnalyseForQuad (startPos, endPos){
        var dis = Math.sqrt((startPos.x - endPos.x)*(startPos.x - endPos.x) + (startPos.y - endPos.y)*(startPos.y - endPos.y));
        var disX = Math.abs(endPos.x - startPos.x);
        if (startPos.y < endPos.y)  // 1,2象限
        {
            var cosValue = null;
            if(startPos.x <= endPos.x) //1象限
            {
                cosValue = disX / dis;
                return Math.acos(cosValue)*180/Math.PI;
            }
            else  //2象限
            {
                cosValue = - disX / dis;
                return Math.acos(cosValue)*180/Math.PI;
            }
        }
        else  // 3,4象限
        {
            var sinValue = null;
            if(startPos.x <= endPos.x) //4象限
            {
                sinValue = disX / dis;
                return (270 + Math.asin(sinValue)*180/Math.PI);
            }
            else  //3象限
            {
                sinValue = - disX / dis;
                return ( 270 + Math.asin(sinValue)*180/Math.PI);
            }
        }
    },
    /**
     * @param {[{name:String, prob: Number}]} config     概率配置[{name:'aaa', prob: 30}, {name:'bbb',prob:70}]
     * @param {Number} [totalProb=100]  几率总和 30+70
     */
    getProbabilityResult(config, totalProb) {
        if (!totalProb) {
            totalProb = 100;
        }
        var result = null;
        for (var i = 0, length = config.length, rand; i < length; i++) {
            rand = Math.floor(Math.random() * totalProb);
            if (rand <= config[i].prob) {
                result = config[i];
                break;
            } else {
                totalProb -= config[i].prob;
            }
        }
        return result;
    },

    shuffleArray(arr) {
        for (var i = 0, length = arr.length, item, r; i < length; i++) {
            item = arr[i];
            r = this.randomInt(0, length - 1);
            arr[i] = arr[r];
            arr[r] = item;
        }
        return arr;
    },

    getRandomItem(arr, num) {
        var temp = [];
        var cop = temp.concat(arr);
        for (var i = 0, rand; i < num; i++) {
            rand = this.randomInt(0, cop.length - 1);
            temp.push(cop.splice(rand, 1));
        }
        return temp;
    },
    /***
     * SHOW_ALL模式宽高适配
     * @param node
     */
    setFitContent (node) {
        if(cc.sys.isMobile) {
            // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
            var srcScaleForShowAll = Math.min(cc.view.getCanvasSize().width / node.width, cc.view.getCanvasSize().height / node.height);
            var realWidth = node.width * srcScaleForShowAll;
            var realHeight = node.height * srcScaleForShowAll;

            // 2. 基于第一步的数据，再做节点宽高适配
            var scaleX = cc.view.getCanvasSize().width / realWidth;
            var scaleY = cc.view.getCanvasSize().height / realHeight;
            node.width = node.width * scaleX;
            node.height = node.height * scaleY;
        }
    },
    /***
     * SHOW_ALL模式缩放适配
     * @param node
     */
    setFitScale (node) {
        if (cc.sys.isMobile) {
            // 1. 先找到 SHOW_ALL 模式适配之后，本节点的实际宽高以及初始缩放值
            var srcScaleForShowAll = Math.min(cc.view.getCanvasSize().width / node.width, cc.view.getCanvasSize().height / node.height);
            var realWidth = node.width * srcScaleForShowAll;
            var realHeight = node.height * srcScaleForShowAll;

            // 2. 基于第一步的数据，再做缩放适配
            node.scale = Math.max(cc.view.getCanvasSize().width / realWidth, cc.view.getCanvasSize().height / realHeight);
        }
    },
    /**
     * 
     * @param {Image} img 
     * @param {'jpg' | 'png'} ext 
     */
    getImageBase64(img, ext) {

        if (img instanceof cc.SpriteFrame) {
            img = img.getTexture().getHtmlElementObj();
        } else if (img instanceof cc.Texture2D) {
            img = img.getHtmlElementObj();
        }

        if (!ext) {
            ext = 'png';
        }

        if (img instanceof Image) {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, img.width, img.height);
            var dataUrl = canvas.toDataURL('image/' + ext);
            canvas = null;
            return dataUrl;
        }
    },
};