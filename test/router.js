$(document).ready(function(){
    // Variable to catch the last request.
    var lastRequest = null;
    // Variable to catch ajax params.
    var ajaxParams = null;
    var sync = Backbone.sync;
    var ajax = $.ajax;
    var urlRoot = null;

    var proxy = Backbone.Model.extend();
    var klass = Backbone.Collection.extend({
        url : function() { return '/collection'; }
    });
    var doc, collection;

    module("Backbone.Page", {

        setup: function() {
            doc = new proxy({
                id     : '1-the-tempest',
                title  : "The Tempest",
                author : "Bill Shakespeare",
                length : 123
            });
            collection = new klass();
            collection.add(doc);

            Backbone.sync = function(method, model, options) {
                lastRequest = {
                    method: method,
                    model: model,
                    options: options
                };
                sync.apply(this, arguments);
            };
            $.ajax = function(params) { ajaxParams = params; };
            urlRoot = Backbone.Model.prototype.urlRoot;
            Backbone.Model.prototype.urlRoot = '/';

        },

        teardown: function() {
            Backbone.sync = sync;
            $.ajax = ajax;
            Backbone.Model.prototype.urlRoot = urlRoot;
        }

    });

    test("Page: define", function() {
        var PageA = Backbone.Page.extend({
        }, {
            "id": "a"
        });
        equal(PageA.id, "a");
    });

    test("Router: initialize", function() {
        var PageA = Backbone.Page.extend({});
        var PageB = Backbone.Page.extend({});
        var PageC = Backbone.Page.extend({});

        var router = new Backbone.PageRouter({
            pageClasses: [PageA, PageB, PageC],
            pageRoutes: {}
        });
        equal(router.pageClasses.length, 3);
        notEqual(router, undefined, "router is defined");
    });

    test("Router: open page from null", function() {
        var PageA = Backbone.Page.extend({
        }, {
            "id": "a"
        });
        var PageAB = Backbone.Page.extend({
        }, {
            "id": "a.b",
            "parentPageClass": PageA
        });
        var PageAC = Backbone.Page.extend({
        }, {
            "id": "a.c",
            "parentPageClass": PageA
        });
        var PageABD = Backbone.Page.extend({
        }, {
            "id": "a.b.d",
            "parentPageClass": PageAB
        });

        var router = new Backbone.PageRouter({
            pageClasses: [PageA, PageAB, PageAC, PageABD],
            pageRoutes: {}
        });

        console.log(router.pageClasses);
        equal(router.pageClasses.length, 4);

        router.openPage(PageAC);
        equal(router.activePages.length, 3);
        equal(router.leafPage.constructor.id, "a.c");
        console.log(_.map(router.activePages, function(p){return p.constructor.id}));
        console.log(router.leafPage.constructor.id);

        router.openPage(PageABD);
        equal(router.activePages.length, 4);
        equal(router.leafPage.constructor.id, "a.b.d");
        console.log(_.map(router.activePages, function(p){return p.constructor.id}));
        console.log(router.leafPage.constructor.id);

        notEqual(router, undefined, "router is defined");
    });

}());