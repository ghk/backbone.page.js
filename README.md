backbone.page.js
================

Provides page structure and routing for [backbone.js](http://documentcloud.github.com/backbone/). It is licensed under [MIT License](https://github.com/ghk/backbone.page.js/blob/master/LICENSE)

###Backbone.Page###

A `Backbone.Page` is a node in an application routing tree. A `Backbone.Page` class can have a `parentPageClass` attribute which means that the `parentPageClass` must be loaded and opened before that page class is loaded.

For example, in a routing tree like

```
--RootPage
 |--Child1Page
 |--Child2Page
```
Child2Page can be defined with

```javascript
var RootPage = Backbone.Page.extend({});
var Child1Page = Backbone.Page.extend({});
Child1Page.parentPageClass = RootPage;
```

###Backbone.PageRouter###

A `Backbone.PageRouter` extends `Backbone.Router` where one can define a `Backbone.Page` class as a target of a route pattern.

```javascript
var AppRouter = Backbone.PageRouter.extend({
  pageRoutes: {
    "child1": Child1Page,
    ":id": Child2Page
  }
});
```

When route match to a page class, a page of that class will be created and opened. Opening a page class `P` means:

* Closing previously opened page which class is an ancestor of `P`.
* Creating, loading, and opening each page classes between that ancestor and `P`.

On opening sequence, a `Backbone.Page` has two methods that you could override:

* `load(callbacks, routeMatchArguments)`. Where all asynchronous loading should be performed. `callbacks.success()` must be called when all loading operation finishs.
* `open()`. Called after `callbacks.success()` invoked in `load` methods. this is where you perform synchronous logic for pages.

For example, a page that responsible for model's loading can be declared with

```javascript
var ModelPage = Backbone.Page.extend({
  load: function(callbacks, id){
    this.model = new Model({"id": id}).fetch(callbacks);
  },
  open: function(){
    this.model.sayHello();
  }
})
```

`Backbone.PageRouter` will only load a page after its `parentPageClass` page loaded and opened. For example, on opening page classes `[RoutePage, ChildPage, ChildChildPage]` load sequence will be like this

1. `routePage.load(callbacks)` then wait for asynchronous operations finish.
2. `routePage.open()` followed by `childPage.load(callbacks)` then wait for asynchronous operations finish.
3. `childPage.open()` followed by `childChildPage.load(callbacks)` then wait for asynchronous operations finish.`
4. and finally `childChildPage.open()` will be called.


##Example##

According to tradition, in `example` folder you can find Todo example. It is a slight variation of backbone.js' Todo example. Here, pages are responsible for views and models. Pages and router are defined with:

```javascript
    var TodoPage = Backbone.Page.extend({
        open:function () {
            $("#todoapp").html($('#app-template').html());
            this.infoView = new InfoView({el:"#info-view", collection:Todos}).render();
        },
        close:function () {
        }
    });

    var ListPage = Backbone.Page.extend({
        open:function () {
            this.view = new ListView({collection:Todos}).render();
            this.view.$el.appendTo($("#content"));
        },
        close:function () {
            this.view.remove();
        },
        title: "Todos"
    });
    ListPage.parentPageClass = TodoPage;

    var AddPage = Backbone.Page.extend({
        open:function () {
            this.view = new EditView().render();
            this.view.$el.appendTo($("#content"));
        },
        close:function () {
            this.view.remove();
        },
        title: "Add Todo"
    });
    AddPage.parentPageClass = TodoPage;

    var EditPage = Backbone.Page.extend({
        load: function(callbacks, id){
            this.model = Todos.get(id);
            callbacks.finish();
        },
        open:function () {
            this.view = new EditView({model: this.model}).render();
            this.view.$el.appendTo($("#content"));
        },
        close:function () {
            this.view.remove();
        },
        makeTitle: function(){
            return this.model.get("title");
        }
    });
    EditPage.parentPageClass = TodoPage;

    Todos.fetch();
    window.Router = new Backbone.PageRouter({
        pageClasses:[TodoPage, ListPage, AddPage, EditPage],
        pageRoutes:{
            "":ListPage,
            ":id":EditPage,
            "add":AddPage
        }
    });
    Backbone.history.start();
```