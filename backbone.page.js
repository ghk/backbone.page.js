/*

    Page: a collection of views, has models and responsible for retrieving them, delegate that models to views, has unique url to route
            page can has a sub-page

*/

(function(){

    Backbone.Page = function(){
        this.childPages = [];
        this.models = {};
        this.views = [];
    };

    _.extend(Backbone.Page.prototype, {
        templatePacks: [],

        willReload: function(){
            return false;
        },
        load : function(callbacks){
            callbacks.finish();
        },

        open: function(){},
        close: function(){},

        makeTitle: function(){
            return this.title;
        }
        
    });

    Backbone.Page.isDescendantOf = function(pageClass){
        if(this.parentPageClass == pageClass)
            return true;
        if(_.isUndefined(this.parentPageClass))
            return false;
        return this.parentPageClass.isDescendantOf(pageClass);
    }

    Backbone.Page.loadTemplatePacks = function(packs, callbacks){
        callbacks.success();
    }

    Backbone.Page.extend = Backbone.Model.extend;


    function loadTemplatePacks(router, toOpenClasses, success, error){
        var requiredPacks = _.flatten(_.map(toOpenClasses, function (p) { return p.templatePacks; }));
        var unloadedPacks = _.uniq(_.without(requiredPacks, router.loadedTemplatePacks));
        Backbone.Page.loadTemplatePacks(unloadedPacks, {
            success: function(){
                for(var i = 0; i < unloadedPacks.length; i++)
                    router.loadedTemplatePacks.push(unloadedPacks[i]);
                success();
            },
            error: error
        });
    }

    function getLoadFlow(router, pageClass, pageArgs){
        var toOpenClasses, it, commonAncestor, needReload, persistPage;

        commonAncestor = router.leafPage;
        toOpenClasses = [];
        persistPage = router.rootPage;

        while(commonAncestor != router.rootPage){
            if(pageClass.isDescendantOf(commonAncestor.constructor))
                    break;
            commonAncestor = commonAncestor.parentPage;
        }

        it = router.leafPage;
        while(it.constructor != commonAncestor.constructor){
            it = it.parentPage;
            persistPage = it;
        }

        needReload = null;
        it = commonAncestor;
        while(it != router.rootPage){
            if(it.willReload.apply(it, pageArgs)){
                    needReload = it;
            }
            it = it.parentPage;
        }

        if(needReload != null){
            it = commonAncestor;
            while(it != needReload){
                it = it.parentPage;
                persistPage = it;
            }
        }

        it = pageClass;
        while(it != persistPage.constructor){
            toOpenClasses.unshift(it);
            it = it.parentPageClass;
        }

        return {persistPage: persistPage, toOpenClasses: toOpenClasses};
    }

    function applyLoadFlow(router, loadFlow, pageArgs){
        var toOpenClasses = loadFlow.toOpenClasses,
            persistPage = loadFlow.persistPage,
            i, it,
            loadJobId, callbacks;

        loadJobId = _.uniqueId("rlj-");
        router.loadJobId = loadJobId;

        while(router.leafPage != persistPage){
            it = router.leafPage;
            it.close();
            router.activePages.pop();
            router.leafPage = it.parentPage;
        }

        i = 0;

        callbacks = {
            finish:function () {
                if (router.loadJobId === loadJobId) {

                    it.open();
                    router.leafPage = it;
                    router.activePages.push(it);

                    i++;
                    if (i < toOpenClasses.length)
                        this.run();
                    else
                        document.title = it.makeTitle();
                }
            },
            run:function () {
                var loadArgs, toOpen = toOpenClasses[i];

                loadArgs = pageArgs.slice(0);
                loadArgs.unshift(this);

                it = new toOpen();
                it.parentPage = router.leafPage;
                it.load.apply(it, loadArgs);
            }
        };
        callbacks.run();
    }



    Backbone.PageRouter = Backbone.Router.extend({
        constructor: function(options){
            var RootPage = Backbone.Page.extend({});
            RootPage.id = "#root";
            var rootPage = new RootPage();
            this.rootPage = this.leafPage = rootPage;
            this.activePages = [rootPage];

            this.loadedTemplatePacks = [];

            this.pageClasses = options.pageClasses;
            _.each(this.pageClasses, function(pageClass){
                if(_.isUndefined(pageClass.parentPageClass)){
                    pageClass.parentPageClass = RootPage;
                }
            });

            this._bindPageRoutes(options.pageRoutes);

            Backbone.Router.prototype.constructor.apply(this, arguments);
        },
        _bindPageRoutes : function(pageRoutes) {
            var router = this;
            for (var route in pageRoutes){
                var pageClass = pageRoutes[route];
                var callback =  makeCallback(pageClass);

                //TODO: change id
                this.route(route, pageClass.id, callback);
          }

          function makeCallback(pageClass){
              var pc = pageClass;
              return function(){
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift(pc);
                    router.openPage.apply(router, args);
              }
          }
        },
        openPage: function(pageClass){

            var loadFlow;

            var pageArgs = Array.prototype.slice.call(arguments, 1, arguments.length);

            if(pageClass === this.leafPage.constructor){
                if(!this.leafPage.willReload.apply(this.leafPage, pageArgs))
                    return;
            }

            var router = this;
            loadFlow = getLoadFlow(this, pageClass, pageArgs);
            loadTemplatePacks(this, loadFlow.toOpenClasses, function(){
                applyLoadFlow(router, loadFlow, pageArgs);
            });
        }

    });

}).call(this);

