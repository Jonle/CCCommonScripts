module.exports = {
    _pool: Object.create(null),
    get (prefab, poolName) {
        if(!prefab) {
            console.log(`can't find pool prefab`);
            return;
        }
        return this.getPool(poolName||prefab.name).pop() || cc.instantiate(prefab);
    },
    put (node, poolName) {
        let pool = this.getPool(poolName || node.name);
        if(pool && node.parent) {
            node.parent = null;
            pool.push(node);
        }
    },
    getPool (poolName) {
        let pool = this._pool[poolName];
        if(!pool) {
            pool = this._pool[poolName] = [];
        }
        return pool;
    },

    drainPool () {
        for (let key in this._pool) {
            this._pool[key].length = 0;
        }
        this._pool = Object.create(null);
    }
};
