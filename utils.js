module.exports = {
    RAD: Math.PI / 180,
    DEG: 180 / Math.PI,
    PI_2: Math.PI / 2,
    randomInt(min, max) {
        if (min > max) {
            let temp = max;
            max = min;
            min = temp;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    },
    random(min, max) {
        return min + Math.random() * (max - min);
    },
    pDistance(x1, y1, x2, y2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    },
    /**
     * 获取两个位置形成的夹角对应cocos节点的rotation
     */
    getRadian(x1, y1, x2, y2) {
        let dy = y2 - y1;
        let dx = x2 - x1;

        let tan_yx = Math.abs(dy) / Math.abs(dx);
        let radian = 0;
        if (dy > 0 && dx < 0) {
            radian = Math.atan(tan_yx) - this.PI_2;
        } else if (dy > 0 && dx > 0) {
            radian = this.PI_2 - Math.atan(tan_yx);
        } else if (dy < 0 && dx < 0) {
            radian = -Math.atan(tan_yx) - this.PI_2;
        } else if (dy < 0 && dx > 0) {
            radian = Math.atan(tan_yx) + this.PI_2;
        }
        return radian;
    },
    /**
     * @param {[{name:String, prob: Number}]} config     概率配置[{name:'aaa', prob: 30}, {name:'bbb',prob:70}]
     * @param {Number} [totalProb=100]  几率总和 30+70
     */
    getProbabilityResult(config, totalProb) {
        if (!totalProb) {
            totalProb = 100;
        }
        let result = null;
        for (let i = 0, length = config.length, rand; i < length; i++) {
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
        for (let i = 0, length = arr.length, item, r; i < length; i++) {
            item = arr[i];
            r = this.randomInt(0, length - 1);
            arr[i] = arr[r];
            arr[r] = item;
        }
        return arr;
    },

    getRandomItem(arr, num) {
        let temp = [];
        let cop = temp.concat(arr);
        for (let i = 0, rand; i < num; i++) {
            rand = this.randomInt(0, cop.length - 1);
            temp.push(cop.splice(rand, 1));
        }
        return temp;
    },

    fitMobileScreen() {
        let canvas = cc.find('Canvas');
        if (canvas) {
            let canvasComp = canvas.getComponent(cc.Canvas);
            if (canvasComp) {
                let isMobile = cc.sys.isMobile;
                canvasComp.fitWidth = true;
                canvasComp.fitHeight = isMobile ? false : true;
            }
        }
    },
    toUpperFirstChar(str) {
        return str.replace(/\b([\w | ']+)/g, function (word) {
            return word.replace(word.charAt(0), word.charAt(0).toUpperCase());
        });
    },
    getDesignSize() {
        let canvas = cc.find('Canvas');
        if (canvas) {
            return canvas.getComponent(cc.Canvas).designResolution;
        }
        return cc.view.getDesignResolutionSize();
    },
    getFitScale() {
        let designSize = this.getDesignSize();
        let scaleHeight = cc.winSize.height / designSize.height;
        let scaleWidth = cc.winSize.width / designSize.width;
        return scaleHeight > scaleWidth ? scaleWidth : scaleHeight;
    },
    getFitScaleY() {
        let designSize = this.getDesignSize();
        return cc.winSize.height / designSize.height;
    },
    getFitScaleX() {
        let designSize = this.getDesignSize();
        return cc.winSize.width / designSize.width;
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
            let canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            let context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, img.width, img.height);
            let dataUrl = canvas.toDataURL('image/' + ext);
            canvas = null;
            return dataUrl;
        }
    },


};