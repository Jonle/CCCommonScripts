function DataManager() {
    this.init();
};
DataManager.prototype = {
    constructor: DataManager,
    init: function (gameId, saveBody) {
        this._data = Object.create(null);
        this._gameId = gameId || 'gameID-or-gameName';
        this._saveBody = saveBody || null;
    },
    /**
     * 设置执行保存的平台对象
     * @param {Object} body 
     */
    setSaveBody(body) {
        this._saveBody = body;
    },
    /**
     * 添加保存数据，如果存在则更新数据
     * @param {String} key
     * @param {Any} value
     */
    add: function (key, value) {
        this._data[key] = value;
    },
    /**
     * 获取key值对应的数据
     * @param {String} key
     */
    get: function (key) {
        return this._data[key];
    },
    /**
     * 保存到存储地
     * @param flushData 立即刷新到存储池（非本地存储）
     */
    saveDataToStorage: function (flushData) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (!self._saveBody) {
                cc.sys.localStorage.setItem(self._gameId, JSON.stringify(self._data));
                resolve('local-success');
            } else {
                console.log(self._data)
                self._saveBody.saveData(self._data, flushData).then(function () {
                    resolve('fb-success');
                }).catch(function (message) {
                    reject('savedata : ' + message);
                });
            }
        });
    },
    /**
     * 从存储地获取数据
     * @param {Array} [keys] 当keys为空时使用本地获取 
     */
    getDataFromStorage: function (keys) {
        let self = this;
        return new Promise(function (resolve, reject) {
            if (keys) {
                self._saveBody.getData(keys).then(function (data) {
                    if (JSON.stringify(data) !== JSON.stringify(self._data)) {
                        for (let key in data) {
                            self._data[key] = data[key];
                        }
                    }
                    resolve(self._data);
                }).catch(function (message) {
                    reject(message);
                });
            } else {
                let data = cc.sys.localStorage.getItem(self._gameId);
                if (JSON.stringify(data) !== JSON.stringify(self._data)) {
                    for (let key in data) {
                        self._data[key] = data[key];
                    }
                }
                resolve(self._data);
            }
        });

    },

    removeStorage: function () {
        cc.sys.localStorage.removeItem(this._gameId);
    }
};
module.exports = new DataManager();
