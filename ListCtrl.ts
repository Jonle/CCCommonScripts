
import {ListView , ListViewDir} from './listview';
const {ccclass, property} = cc._decorator;

@ccclass
export default class ListCtrl extends cc.Component {

    @property(cc.ScrollView)
    scrollView:cc.ScrollView = null;
    @property(cc.Node)
    maskNode:cc.Node = null;
    @property(cc.Node)
    itemContent:cc.Node = null;
    @property(cc.Prefab)
    item_tpl:cc.Prefab = null;

    private _list:ListView = null;

    public show() {
        if(!this._list) {
            this._list = new ListView({
                scrollview:this.scrollView,
                mask:this.maskNode,
                content:this.itemContent,
                item_tpl:this.item_tpl,
                cb_host:this,
                item_setter:this.list_item_setter,
                column:1,
                gap_y:10,
                direction:ListViewDir.Vertical,
            });
        }
    }

    public setData (data) {
        this._list.set_data(data);
    }

    private list_item_setter(item, data, index) {
        item.getComponent(item.name).init(data);
    }
}