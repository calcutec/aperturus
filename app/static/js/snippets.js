/*
// View for all posts (collection)
App.Views.Posts = Backbone.View.extend({ // plural to distinguish as the view for the collection
    attachToView: function(){
        this.el = $("#poem-list");
        var self = this;
        $("article").each(function(){
            var poemEl = $(this);
            var id = poemEl.find("span").text();
            var poem = self.collection.get(id);
            new App.Views.Post({
                model: poem,
                el: poemEl
            });
        });
    },
    render: function(){
        this.collection.each(function(Post){
            var postView = new App.Views.Post({model: Post});
            postView.render()
        });
    }
});
*/

/*
// List of API URLs.
var URLs = {
    posts: function(page_mark) {
        return "/photos/"+ page_mark;
    },
    post: function(id) {
        return "/photos/detail/"+ id ;
    }
};

// Helper for accessing the URL list.
var apiUrl = function(type) {
    return URLs[type] ?
        URLs[type].apply(this, [].slice.call(arguments, 1)) :
        undefined;
};
*/

/*
//adding individual models to collection
var chihuahua = new App.Models.Post({header: 'Sugar', post: 'This this the name of my chihuahua'});
var chihuahuaView = new App.Views.Post({model: chihuahua});
var postCollection = new App.Collections.Post(); // only need to create the collection once
postCollection.add(chihuahua);

//adding multiple models to collection////
var postCollection = new App.Collections.Post([
 {
   header: 'Sugar',
   post: 'That is the name of my chihuahua',
 },
 {
   header: 'Gizmo',
   post: 'That is the name of my beagle'
 }
]);
var postsView = new App.Views.Posts({collection: postCollection});
postsView.render();
sessionStorage.setItem('postCollection', JSON.stringify(postCollection));

//updating a single model in a collection
postCollection.get(112).set({title: "No Longer Bob"});


//Retrieving models from flask database////
postCollection.fetch({
    success: function() {
        postsView.render();
    }
})

//Bootstrapping flask models on load////
postCollection = new App.Collections.Post();
$(function () {
    $('Article').each(function() {
        postCollection.add(new App.Models.Post($(this).data()));
    });
    postsView = new App.Views.Posts({collection: postCollection});
    //postsView.render()
});
*/