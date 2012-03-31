(function(){

    Backbone.Page = function(){};
    //statics method
    _.extend(Backbone.Page, {
        extend: Backbone.Model.extend,
        isDescendantOf: function(pageClass){
            if(this.parentPageClass == pageClass)
                return true;
            if(_.isUndefined(this.parentPageClass))
                return false;
            return this.parentPageClass.isDescendantOf(pageClass);
        }
    });
    //instance method
    _.extend(Backbone.Page.prototype, {
        willReload: function(){
            return false;
        },
        load : function(callbacks){
            callbacks.success();
        },

        open: function(){},
        close: function(){}
    });

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
            success:function () {
                if (router.loadJobId === loadJobId) {

                    it.open();
                    router.leafPage = it;
                    router.activePages.push(it);

                    i++;
                    if (i < toOpenClasses.length)
                        callbacks.run();
                }
            },
            run:function () {
                var loadArgs, toOpen = toOpenClasses[i];

                loadArgs = pageArgs.slice(0);
                loadArgs.unshift(callbacks);

                it = new toOpen();
                it.parentPage = router.leafPage;
                it.load.apply(it, loadArgs);
            }
        };
        callbacks.run();
    }

    var arraySlice = Array.prototype.slice;
    Backbone.PageRouter = Backbone.Router.extend({
        constructor: function(options){
            var RootPage = Backbone.Page.extend({});
            RootPage.id = "#root";
            var rootPage = new RootPage();
            this.rootPage = this.leafPage = rootPage;
            this.activePages = [rootPage];

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
                    var args = arraySlice.call(arguments);
                    args.unshift(pc);
                    router.openPage.apply(router, args);
              }
          }
        },
        preLoad: function(loadFlow, callbacks){
            callbacks.success();
        },
        openPage: function(pageClass){

            var
                loadFlow,
                pageArgs = arraySlice.call(arguments, 1, arguments.length),
                router = this;

            if(pageClass === this.leafPage.constructor){
                if(!this.leafPage.willReload.apply(this.leafPage, pageArgs))
                    return;
            }

            loadFlow = getLoadFlow(this, pageClass, pageArgs);
            this.preLoad(loadFlow, {
                success: function(){
                    applyLoadFlow(router, loadFlow, pageArgs);
                }
            });
        }

    });

}).call(this);

