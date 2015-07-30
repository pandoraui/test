http://github.com/pandoraui/inherit


// 这里推荐参看 john resig 版本去理解

深入了解可参考相关解析，及 《javascript 权威指南》中继承内容

在处理上，各方法大同小异，而随着对 Object.create的支持，以后可以更兼容的处理

通过示例分析及用法展示，更深入的了解使用方式及场景


```
// 简单的例子（john resig）

var Foo = Class.extend({
    qux: function() {
        return "Foo.qux";
    }
});
var Bar = Foo.extend({
    qux: function() {
        return "Bar.qux, " + this._super();
    }
});

//当 Foo.extends 被执行, 在 qux 方法中由于存在 this._super 所以 Bar原型上的qux 实际上应该是这样的:

Bar.prototype.qux = function () {
    var tmp = this._super;
    this._super = Foo.prototype.qux;
    var ret = (function() {
        return "Bar.qux, " + this._super();
    }).apply(this, arguments);
    this._super = tmp;
    return ret;
}

```

其他示例：

// blade 版本

var Super = _.inherit({
    name: 'xiaohan',
    hello: function(){
        return 'hello ' + this.name;
    }
});

var Sub = _.inherit(Super,{
    name: 'world',
    initialize: function(){
        this.name = 'good'
    },
    hello: function(){
        return 'hello ' + this.name;
    }
});

