// An example Backbone application contributed by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses a simple
// [LocalStorage adapter](backbone-localstorage.js)
// to persist Backbone models within your browser.

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function () {

    // Todo Model
    // ----------

    // Our basic **Todo** model has `title`, `order`, and `done` attributes.
    window.Todo = Backbone.Model.extend({

        // Default attributes for the todo item.
        defaults:function () {
            return {
                title:"empty todo...",
                order:Todos.nextOrder(),
                details: "",
                done:false
            };
        },

        // Ensure that each todo created has `title`.
        initialize:function () {
            if (!this.get("title")) {
                this.set({"title":this.defaults.title});
            }
        },

        // Toggle the `done` state of this todo item.
        toggle:function () {
            this.save({done:!this.get("done")});
        },

        // Remove this Todo from *localStorage* and delete its view.
        clear:function () {
            this.destroy();
        }

    });

    // Todo Collection
    // ---------------

    // The collection of todos is backed by *localStorage* instead of a remote
    // server.
    var TodoList = Backbone.Collection.extend({

        // Reference to this collection's model.
        model:Todo,

        // Save all of the todo items under the `"todos"` namespace.
        localStorage:new Store("todos-backbone"),

        // Filter down the list of all todo items that are finished.
        done:function () {
            return this.filter(function (todo) {
                return todo.get('done');
            });
        },

        // Filter down the list to only todo items that are still not finished.
        remaining:function () {
            return this.without.apply(this, this.done());
        },

        // We keep the Todos in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder:function () {
            if (!this.length) return 1;
            return this.last().get('order') + 1;
        },

        // Todos are sorted by their original insertion order.
        comparator:function (todo) {
            return todo.get('order');
        }

    });

    // Create our global collection of **Todos**.
    window.Todos = new TodoList;

    // Todo Item View
    // --------------

    // The DOM element for a todo item...
    var TodoView = Backbone.View.extend({

        //... is a list tag.
        tagName:"li",

        // Cache the template function for a single item.
        template:_.template($('#item-template').html()),

        // The DOM events specific to an item.
        events:{
            "click .toggle":"toggleDone",
            "dblclick .view":"edit",
            "click a.destroy":"clear"
        },

        // The TodoView listens for changes to its model, re-rendering. Since there's
        // a one-to-one correspondence between a **Todo** and a **TodoView** in this
        // app, we set a direct reference on the model for convenience.
        initialize:function () {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },

        // Re-render the titles of the todo item.
        render:function () {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass('done', this.model.get('done'));
            return this;
        },

        // Toggle the `"done"` state of the model.
        toggleDone:function () {
            this.model.toggle();
        },

        // Switch this view into `"editing"` mode, displaying the input field.
        edit:function (e) {
            e.preventDefault();
            window.Router.navigate(this.model.id, true);
        },

        // Remove the item, destroy the model.
        clear:function () {
            this.model.clear();
        }

    });

    // The Application
    // ---------------

    // Our overall **AppView** is the top-level piece of UI.
    var ListView = Backbone.View.extend({

        // Our template for the line of statistics at the bottom of the app.
        statsTemplate:_.template($('#stats-template').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events:{
            "click #new-todo":"add",
            "click #clear-completed":"clearCompleted",
            "click #toggle-all":"toggleAllComplete"
        },

        // At initialization we bind to the relevant events on the `Todos`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting todos that might be saved in *localStorage*.
        initialize:function () {

            this.$el.html($('#list-template').html());
            this.input = this.$("#new-todo");
            this.allCheckbox = this.$("#toggle-all")[0];

            var that = this;
            Todos.each(function(t){
                that.addOne(t);
            });

            Todos.bind('add', this.addOne, this);
            Todos.bind('reset', this.addAll, this);
            Todos.bind('all', this.render, this);

            this.footer = this.$('footer');
            this.main = this.$('#main');
        },

        // Re-rendering the App just means refreshing the statistics -- the rest
        // of the app doesn't change.
        render:function () {
            var done = Todos.done().length;
            var remaining = Todos.remaining().length;

            if (Todos.length) {
                this.main.show();
                this.footer.show();
                this.footer.html(this.statsTemplate({done:done, remaining:remaining}));
            } else {
                this.main.hide();
                this.footer.hide();
            }

            this.allCheckbox.checked = !remaining;
            return this;
        },

        // Add a single todo item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne:function (todo) {
            var view = new TodoView({model:todo});
            this.$("#todo-list").append(view.render().el);
        },

        // Add all items in the **Todos** collection at once.
        addAll:function () {
            Todos.each(this.addOne);
        },

        // If you hit return in the main input field, create new **Todo** model,
        // persisting it to *localStorage*.
        add:function (e) {
            e.preventDefault();
            window.Router.navigate("add", true);
        },

        // Clear all done todo items, destroying their models.
        clearCompleted:function () {
            _.each(Todos.done(), function (todo) {
                todo.clear();
            });
            return false;
        },

        toggleAllComplete:function () {
            var done = this.allCheckbox.checked;
            Todos.each(function (todo) {
                todo.save({'done':done});
            });
        }

    });

    var InfoView = Backbone.View.extend({
        initialize:function () {
            Todos.bind('add', this.render, this);
            Todos.bind('reset', this.render, this);
            Todos.bind('all', this.render, this);
        },
        render:function () {
            this.$el.html(this.collection.length + " todos");
            return this;
        }
    });

    var EditView = Backbone.View.extend({
        events:{
            "click .cancel":"cancel",
            "click .save":"save"
        },
        initialize:function () {
        },
        save:function (e) {
            if(!this.model){
                this.model = Todos.create({});

            }
            this.model.save({
                "title": this.$("[name='title']").val(),
                "details": this.$("[name='details']").val()
            });
            e.preventDefault();
            window.Router.navigate("", true);
        },
        cancel:function (e) {
            e.preventDefault();
            window.Router.navigate("", true);
        },
        render:function () {
            this.$el.html($('#add-template').html());
            if(this.model){
                this.$("[name='title']").val(this.model.get("title"));
                this.$("[name='details']").val(this.model.get("details"));
            }
            return this;
        }
    });

    var TodoPage = Backbone.Page.extend({
        load: function(callbacks){
            Todos.fetch(callbacks);
        },
        open:function () {
            $("#todoapp").html($('#app-template').html());
            this.infoView = new InfoView({el:"#info-view", collection:Todos}).render();
        },
        close:function () {
            this.infoView.remove();
        }
    });

    var ListPage = Backbone.Page.extend({
        open:function () {
            this.view = new ListView({collection:Todos}).render();
            this.view.$el.appendTo($("#content"));
            document.title = "Todos";
        },
        close:function () {
            this.view.remove();
        }
    });
    ListPage.parentPageClass = TodoPage;

    var AddPage = Backbone.Page.extend({
        open:function () {
            this.view = new EditView().render();
            this.view.$el.appendTo($("#content"));
            document.title = "Add Todos";
        },
        close:function () {
            this.view.remove();
        }
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
            document.title = this.model.get("title");
        },
        close:function () {
            this.view.remove();
        }
    });
    EditPage.parentPageClass = TodoPage;

    window.Router = new Backbone.PageRouter({
        pageClasses:[TodoPage, ListPage, AddPage, EditPage],
        pageRoutes:{
            "":ListPage,
            ":id":EditPage,
            "add":AddPage
        }
    });
    Backbone.history.start();

});
