window.App = {
  Models: {},
  Collections: {},
  Views: {},
  Router: {}
};

// List of API URLs.
var URLs = {
    posts: function(page_mark) {
        return "/photos/"+ page_mark;
    },
    post: function(id) {
        return "/photos/detail/"+ id ;
    },
};

// Helper for accessing the URL list.
var apiUrl = function(type) {
    return URLs[type] ?
        URLs[type].apply(this, [].slice.call(arguments, 1)) :
        undefined;
};

// Post model
App.Models.Post = Backbone.Model.extend({
    url: function() {
        return apiUrl('post', this.id);
    },
    fileAttribute: 'attachment',
        defaults: {
        header: '',
        body: '',
        entryPhotoName: ''
    },
    validate: function(attrs){
        if (!attrs.header){
            alert('Your post must have a header!');
        }
        if (attrs.body.length < 2){
            alert('Your post must have more than one letter!');
        }
    }
});

//App.Views.Global = Backbone.View.extend({
//    events: {
//        'click #n-workshop': 'loadWorkshop',
//        'click #n-portfolio': 'loadPortfolio'
//    },
//    loadWorkshop: function(e){
//        e.preventDefault();
//        App.Collections.Post.postCollection.clear_all()
//        App.Views.Posts.poemListView.render()
//    },
//    loadPortfolio: function(e){
//        e.preventDefault();
//        App.Collections.Post.postCollection.clear_all()
//        App.Collections.Post.myPostsCollection = App.Collections.Post.postCollection.byAuthor(14)
//        App.Views.Posts.myPoemListView = new App.Views.Posts({collection: App.Collections.Post.myPostsCollection});
//        App.Views.Posts.myPoemListView.render()
//    }
//});

// Post view
App.Views.Post = Backbone.View.extend({
    tagName: 'article',
    className: 'postArticle',
    events: {
        'click .edit':   'editPost',
        'click .edit-button':   'editPost',
        'click .submit-button':   'updatePost',
        'click .delete-button': 'deletePost',
        'click #n-workshop': 'loadWorkshopCollection'
    },
    initialize: function(){
        this.listenTo(this.model, "change", this.savePost); // calls render function once name changed
        this.listenTo(this.model, "destroy", this.removejunk); // calls remove function once model deleted
        this.listenTo(this.model, "removeMe", this.removejunk); // calls remove function once model deleted
    },
    savePost: function(){
        this.model.save(null, {
            success: function (model, response) {
                if (response.updatedsuccess == true){
                    return response;
                }
                if (response.savedsuccess == true){
                    new App.Views.Post({model:model}).render();
                    return response;
                }
                return response;
            },
            error: function () {
                alert('your poem did not save properly..')
            },
            wait: true
        });
    },
    editPost: function(e){
        e.preventDefault();
        if (!App.Views.Post.editable) {
            var $target = $(e.target);
            $target.closest("article").find(".edit-me").addClass('edit-selected');
            var editSelected = $('.edit-selected');
            App.Views.Post.currentwysihtml5 = editSelected.wysihtml5({
                toolbar: {
                    "style": true,
                    "font-styles": true,
                    "emphasis": true,
                    "lists": true,
                    "html": false,
                    "link": false,
                    "image": false,
                    "color": false,
                    fa: true
                }
            });
            $target.closest("article").find('.edit-button').html("Submit Changes").attr('class', 'submit-button').css({'color':'red', 'style':'bold'});
            editSelected.css({"border": "2px #2237ff dotted"});
            editSelected.attr('contenteditable', false);
            App.Views.Post.editable = true;
        }
    },
    updatePost: function(e){
        var $submittarget = $(e.target).closest("article").find(".edit-me");
        var content = $submittarget.html();
        $('.submit-button').html("Edit").attr('class', 'edit-button').css({'color':'#8787c1'});
        $('.wysihtml5-toolbar').remove();
        App.Views.Post.editable = false;
        $submittarget.css({"border":"none"});
        $submittarget.attr('contenteditable', false);
        $submittarget.removeClass("edit-selected wysihtml5-editor wysihtml5-sandbox");
        this.model.set({"body":content});
    },
    deletePost: function(e){
        e.preventDefault();
        alert("Do you really want to destroy this post?");
        this.model.destroy({
          success: function() {
            console.log('model completely destroyed..');
          }
        });
    },
    removejunk: function(){
        // same as this.$el.remove();
        this.remove();
        // unbind events that are set on this view
        this.off();
        // remove all models bindings made by this view
        this.model.off( null, null, this );
    },
    render: function(){
        this.$el.html(this.model.attributes.post_widget); // calls the template
        $("#main").prepend(this.el);
    }
});

// Post collection
App.Collections.Post = Backbone.Collection.extend({
    url: function() {
        return apiUrl('posts', $('html').attr('id'));
    },
    parse: function(response){return response.myPoems;},
    byAuthor: function (author_id) {
       var filtered = this.filter(function (post) {
           return post.get("author") === author_id;
       });
       return new App.Collections.Post(filtered);
    },
    clear_all: function(){
        this.each(function(model){
            model.trigger('removeMe');
        });
    }
});

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


// Backbone router
App.Router = Backbone.Router.extend({
    routes: { // sets the routes
        '':         'start', // http://netbard.com/photos/portfolio/
        'create': 'create', // http://netbard.com/photos/portfolio/#create
        'edit/:id': 'edit' // http://netbard.com/photos/portfolio/#edit/7
    },
    start: function(){
        console.log('now in view' + Backbone.history.location.href);
        var pgurl = "#" + Backbone.history.location.pathname.split("/")[2];
        $("#nav ul li a").each(function(){
            if($(this).attr("href") == pgurl) {
                $(this).addClass("active");
            }
        })
    },
    edit: function(id){
        console.log('edit route with id: ' + id);
    },
    create: function(id){
        console.log('View for creating photos rendered');
    }
});

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};



if ($('#formTemplate').val() !== undefined){
    App.Views.ModalDisplay = Backbone.View.extend({
        el: '#myPortfolio',
        events: {
            'click #open': 'openModal'
        },
        template: '<h1><button type="button" id="open" class="btn btn-info btn-lg">Create Poem</button></h1>',
        openModal: function() {
            var view = new App.Views.ModalView();
            new Backbone.BootstrapModal({
                content: view,
                title: 'Create a poem',
                animate: true,
                okText: 'Submit New Post',
                okCloses: true,
                enterTriggersOk: false
            }).open(function(){
                var $form = $('#poem-form');
                $form.find('#body-text').html($form.find('#editable').html());
                var newPostModel = new App.Models.Post($form.serializeObject());
                if (currentFile === null){
                    alert("file upload has failed")
                } else {
                    var entryPhotoName = currentFile.name.split(".")[0]+"-"+$form.find('#csrf_token').val()+"."+currentFile.type.split("/")[1];
                    newPostModel.set({'entryPhotoName': entryPhotoName});
                    if (serverBlob === null) {
                        newPostModel.set('attachment', currentFile);
                    } else {
                        newPostModel.set('attachment', serverBlob);
                    }
                }
                newPostModel.save(null, {
                    success: function (model, response) {
                        alert('saved');
                        new App.Views.Post({model:model}).render();
                        serverBlob = null;
                        currentFile = null;
                        return response;
                    },
                    error: function () {
                        alert('your poem did not save properly..')
                    },
                    wait: true
                });
            });
        },

        render: function() {
            this.$el.html(this.template);
            console.log('main rendered');
            return this;
        }

    });

    App.Views.ModalView = Backbone.View.extend({
        template: _.template($('#formTemplate').html()),
           events: {
            'change #file-input': 'validateAndUpload'
        },

        validateAndUpload: function(e) {
            e.preventDefault();
            //Get reference of FileUpload.
            var fileUpload = document.getElementById("file-input");
            //Check whether the file is valid Image.
            var regex = new RegExp("([a-zA-Z0-9\s_\\.\-:])+(.jpg|.png|.jpeg)$");
            if (regex.test(fileUpload.value.toLowerCase())) {
                //Check whether HTML5 is supported.
                if (typeof (fileUpload.files) != "undefined") {
                    currentFile = e.target.files[0]
                    //Initiate the FileReader object.
                    var reader = new FileReader();
                    //Read the contents of Image File.
                    reader.readAsDataURL(fileUpload.files[0]);
                    var self = this;
                    reader.onload = function (e) {
                        //Initiate the JavaScript Image object.
                        var image = new Image();
                        //Set the Base64 string return from FileReader as source.
                        image.src = e.target.result;
                        //Validate the File Height and Width.
                        image.onload = function () {
                            var height = this.height;
                            var width = this.width;
                            var size = currentFile.size;
                            if (width < 648 || height < 432) {
                                alert("Images must be at least 648px in width and 432px in height");
                                return false;
                            } else if (height > 1296 || width > 1296 || size > 1000000) {
                                self.generateUploadFormThumb(self, currentFile);
                                self.generateServerFile(currentFile);
                                return true;
                            } else {
                                self.generateUploadFormThumb(self, currentFile);
                                serverBlob = null;
                                return true;
                            }
                        };
                    }
                } else {
                    alert("This browser does not support HTML5.");
                    return false;
                }
            } else {
                alert("Please select a jpeg or png image file.");
                return false;
            }
        },

        generateUploadFormThumb: function(self, currentFile){
            loadImage(
               currentFile,
               function (img) {
                   if(img.type === "error") {
                       alert("Error loading image " + currentFile);
                       return false;
                   } else {
                       self.replaceResults(img, currentFile);
                       loadImage.parseMetaData(currentFile, function (data) {
                           if (data.exif) {
                               self.displayExifData(data.exif);
                           }
                       });
                   }
               },
               {maxWidth: 432}
            );
        },

        generateServerFile: function(currentFile){
            loadImage(
                currentFile,
                function (img) {
                    if(img.type === "error") {
                        console.log("Error loading image " + currentFile);
                    } else {
                        if (img.toBlob) {
                            img.toBlob(
                                function (blob) {
                                    serverBlob = blob
                                },
                                'image/jpeg'
                            );
                        }
                    }
                },
                {maxWidth: 1296, canvas:true}
            );
        },

        replaceResults: function (img, currentFile) {
            var content;
            if (!(img.src)) {
                content = $('<span>Loading image file failed</span>');
            } else {
                content = $('<a target="_blank">').append(img).attr('src', img.src);
            }
            $('#result').children().replaceWith(content);
        },

        displayExifData: function (exif) {
            var tags = exif.getAll(),
                table = $('#exif').find('table').empty(),
                row = $('<tr></tr>'),
                cell = $('<td></td>'),
                prop;
            for (prop in tags) {
                if (tags.hasOwnProperty(prop)) {
                    if(prop in {'Make':'', 'Model':'', 'DateTime':'', 'ExposureTime':'', 'ShutterSpeedValue':'',
                        'FNumber':'', 'ExposureProgram':'', 'MeteringMode':'', 'ExposureMode':'', 'WhiteBalance':'',
                        'PhotographicSensitivity':'', 'FocalLength':'', 'FocalLengthIn35mmFilm':'', 'LensModel':'',
                        'Sharpness':'', 'PixelXDimension':'', 'PixelYDimension':''}) {
                            table.append(
                                row.clone()
                                    .append(cell.clone().text(prop))
                                    .append(cell.clone().text(tags[prop]))
                            );
                    }
                }
            }
        },

        render: function() {
            this.$el.html(this.template);
            console.log('modal rendered');
            return this;
        }
    });
}


$(document).ready(function() {

    var csrftoken = $('meta[name=csrf-token]').attr('content');
    $(function(){
        $.ajaxSetup({
            beforeSend: function(xhr, settings) {
                if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken)
                }
            }
        })
    });

      // Variables
    var $nav = $('.navbar'),
        $body = $('body'),
        $navbarlogo = $('#navbar-logo'),
        $window = $(window),
        $popoverLink = $('[data-popover]'),
        navOffsetTop = $nav.offset().top,
        $document = $(document);

    function init() {
        $window.on('scroll', onScroll);
        $window.on('resize', resize);
        $popoverLink.on('click', openPopover);
        $document.on('click', closePopover);
        $('a[href^="#"]').on('click', smoothScroll);
    }

    function smoothScroll(e) {
        e.preventDefault();
        $(document).off("scroll");
        var target = this.hash;
        var $target = $(target);
        $('html, body').stop().animate({
            'scrollTop': $target.offset().top-40
        }, 0, 'swing', function () {
            window.location.hash = target;
            $(document).on("scroll", onScroll);
        });
    }

    function openPopover(e) {
        e.preventDefault();
        closePopover();
        var popover = $($(this).data('popover'));
        popover.toggleClass('open');
        e.stopImmediatePropagation();
    }

    function closePopover(e) {
        if($('.popover.open').length > 0) {
          $('.popover').removeClass('open')
        }
    }

    $("#button").click(function() {
        $('html, body').animate({
            scrollTop: $("#elementtoScrollToID").offset().top
        }, 2000);
    });

    function resize() {
        $body.removeClass('has-docked-nav');
        navOffsetTop = $nav.offset().top;
        onScroll()
    }

    function onScroll() {
        if(navOffsetTop < $window.scrollTop() && !$body.hasClass('has-docked-nav')) {
            $body.addClass('has-docked-nav');
            $navbarlogo.removeClass('hide');
        }
        if(navOffsetTop > $window.scrollTop() && $body.hasClass('has-docked-nav')) {
            $body.removeClass('has-docked-nav');
            $navbarlogo.addClass('hide');
        }
    }

    //Horizontal Tab
    $('#parentHorizontalTab').easyResponsiveTabs({
        type: 'default', //Types: default, vertical, accordion
        width: 'auto', //auto or any width like 600px
        fit: true, // 100% fit in a container
        tabidentify: 'hor_1', // The tab groups identifier
        activate: function(event) { // Callback function if tab is switched
            var $tab = $(this);
            var $info = $('#nested-tabInfo');
            var $name = $('span', $info);
            $name.text($tab.text());
            $info.show();
        }
    });

    init();


    /*
        Function to carry out the actual PUT request to S3 using the signed request from the Python app.
    */
    function upload_file(file, signed_request, url){
        var xhr = new XMLHttpRequest();
        xhr.open("PUT", signed_request);
        xhr.setRequestHeader('x-amz-acl', 'public-read');
        xhr.onload = function() {
            if (xhr.status === 200) {
                document.getElementById("preview").src = url;
                document.getElementById("avatar_url").value = url;
            }
        };
        xhr.onerror = function() {
            alert("Could not upload file.");
        };
        xhr.send(file);
    }
    /*
        Function to get the temporary signed request from the Python app.
        If request successful, continue to upload the file using this signed
        request.
    */
    function get_signed_request(file){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/sign_s3?file_name="+file.name+"&file_type="+file.type);
        xhr.onreadystatechange = function(){
            if(xhr.readyState === 4){
                if(xhr.status === 200){
                    var response = JSON.parse(xhr.responseText);
                    upload_file(file, response.signed_request, response.url);
                }
                else{
                    alert("Could not get signed URL.");
                }
            }
        };
        xhr.send();
    }
    /*
       Function called when file input updated. If there is a file selected, then
       start upload procedure by asking for a signed request from the app.
    */
    function init_upload(){
        var files = document.getElementById("file_input").files;
        var file = files[0];
        if(file == null){
            alert("No file selected.");
            return;
        }
        get_signed_request(file);
    }
    /*
       Bind listeners when the page loads.
    */
    (function() {
        document.getElementById("file_input").onchange = init_upload;
    })();

    //App.Collections.Post.postCollection = new App.Collections.Post();
    //App.Collections.Post.postCollection.fetch({
    //    success: function() {
    //        App.Views.Posts.poemListView = new App.Views.Posts({collection: App.Collections.Post.postCollection});
    //        App.Views.Posts.poemListView.attachToView();
    //    }
    //});
    //
    //
    ////App.Views.Global.globalView = new App.Views.Global({el: '.page'});
    //new App.Router();
    //Backbone.history.start(); // start Backbone history
});


    ////adding individual models to collection
    //    var chihuahua = new App.Models.Post({header: 'Sugar', post: 'This this the name of my chihuahua'});
    //    var chihuahuaView = new App.Views.Post({model: chihuahua});
    //    var postCollection = new App.Collections.Post(); // only need to create the collection once
    //    postCollection.add(chihuahua);

    ////adding multiple models to collection////
    //    var postCollection = new App.Collections.Post([
    //     {
    //       header: 'Sugar',
    //       post: 'That is the name of my chihuahua',
    //     },
    //     {
    //       header: 'Gizmo',
    //       post: 'That is the name of my beagle'
    //     }
    //    ]);
    //    var postsView = new App.Views.Posts({collection: postCollection});
    //    postsView.render();
    //    sessionStorage.setItem('postCollection', JSON.stringify(postCollection));

    ////updating a single model in a collection
    //    postCollection.get(112).set({title: "No Longer Bob"});


    ////Retrieving models from flask database////
    //    postCollection.fetch({
    //        success: function() {
    //            postsView.render();
    //        }
    //    })

    ////Bootstrapping flask models on load////
    //    postCollection = new App.Collections.Post();
    //    $(function () {
    //        $('Article').each(function() {
    //            postCollection.add(new App.Models.Post($(this).data()));
    //        });
    //        postsView = new App.Views.Posts({collection: postCollection});
    //        //postsView.render()
    //    });