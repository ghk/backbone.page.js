(function(){

    Backbone.Page = function(){};
    //statics method
    _.extend(Backbone.Page, {
        extend: Backbone.Model.extend
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

    /*
        Find lowest common ancestor between an opened page to page class to open
     */
    function findLCA(page, pageClass){
        var pages = [], pageClasses = [], result = undefined;

        while(page){
            pages.push(page);
            page = page.parentPage;
        }

        while(pageClass){
            pageClasses.push(pageClass);
            pageClass = pageClass.parentPageClass;
        }

        while(pages.length > 0 && pageClasses.length > 0){
            page = pages.pop();
            pageClass = pageClasses.pop();
            if(page.constructor != pageClass){
                return result;
            }
            result = page;
        }
        return result;
    }

    function getLoadFlow(router, pageClass, pageArgs){
        var toOpenClasses, it, persistPage;

        toOpenClasses = [];
        persistPage = findLCA(router.leafPage, pageClass);

        //query to root page whether some page need to reload
        //the highest will reload page become persist page
        it = persistPage;
        while(it != router.rootPage){
            if(it.willReload.apply(it, pageArgs)){
                persistPage = it;
            }
            it = it.parentPage;
        }

        it = pageClass;
        while(it != persistPage.constructor){
            toOpenClasses.unshift(it); //unshift so array become top-down
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

        if(toOpenClasses.length <= 0)
            return;

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
                    else
                        router.postLoad(loadFlow, it);
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
            //internal root page to make it easier so we dont have to deal with undefined parent page
            var RootPage = Backbone.Page.extend({});
            var rootPage = new RootPage();
            this.rootPage = this.leafPage = rootPage;

            this.activePages = [rootPage];

            //get all page from routes
            this.pageClasses = [];
            var leafPageClasses = _.values(options.pageRoutes);
            for(var i = 0, len = leafPageClasses.length; i < len; i++){
                var pageClass = leafPageClasses[i];
                while(pageClass){
                    this.pageClasses.push(pageClass);
                    pageClass = pageClass.parentPageClass;
                }
            }
            this.pageClasses = _.unique(this.pageClasses);

            _.each(this.pageClasses, function(pageClass){
                if(_.isUndefined(pageClass.parentPageClass)){
                    pageClass.parentPageClass = RootPage;
                }
            });

            this._bindPageRoutes(options.pageRoutes, options.routesRoot);

            Backbone.Router.prototype.constructor.apply(this, arguments);
        },
        _bindPageRoutes : function(pageRoutes, routesRoot) {
            var router = this, pageClass, callback;
            for (var route in pageRoutes){
                pageClass = pageRoutes[route];
                callback =  makeCallback(pageClass);

                //TODO: change id
                this.route(route, pageClass.id, callback);
                if(!_.isUndefined(routesRoot))
                    this.route(routesRoot+route, pageClass.id, callback);
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
        postLoad: function(loadFlow, page){
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

