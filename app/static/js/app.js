//window.App = {
//  Models: {},
//  Collections: {},
//  Views: {},
//  Router: {}
//};

// Backbone router
var Router = Backbone.Router.extend({
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
    create: function(){
        console.log('View for creating photos rendered');
    }
});

var Mail = Backbone.Model.extend( {

    defaults: {
        subject: '',
        read: false,
        star: false,
        selected:false,
        archived:false,
        label: ''
    },
    markRead: function() {
        this.save( {read: true } );
    },

    starMail: function() {
        this.save( { star: !this.get("star")} );
    },

    archive: function(){
        this.save( { archived: true, selected:false} );
    },

    selectMail: function() {
        this.save( { selected: !this.get("selected")} );
    },

    setLabel: function(label){
        this.save( { label: label } );
    }
});



var MailList = Backbone.Collection.extend({
    model: Mail,

    localStorage: new Store("mails"),

    unread: function() {
        return _(this.filter( function(mail) { return !mail.get('read');} ) );
    },

    inbox: function(){
        return _(this.filter( function(mail) { return !mail.get('archived');}));
    },

    starred: function(){
        return _(this.filter( function(mail) { return mail.get('star');}));
    },

    unread_count: function() {
        return (this.filter ( function(mail) { return !mail.get('read');})).length;
    },

    labelled:function(label){
        return _(this.filter( function(mail) { return label in mail.get('label') } ));
    },

    starcount: function(){
        return (this.filter( function(mail) { return mail.get('star')})).length;
    },

    search: function(word){
        if (word=="") return this;

        var pat = new RegExp(word, 'gi');
        return _(this.filter(function(mail) {
            return pat.test(mail.get('subject')) || pat.test(mail.get('sender')); }));
    },
    comparator: function(mail){
        return -mail.get('timestamp');
    }

});

var MailView = Backbone.View.extend({
    tagName: "li",

    template: _.template( $("#mail-item").html()),

    events: {
        "click .mail-subject,.sender" : "markRead",
        "click .star" : "star",
        "click .check" : "select"
    },

    initialize: function() {
        this.model.bind('change', this.render, this);
    },

    render: function() {
        $(this.el).html( this.template(this.model.toJSON()) );
        return this;
    },

    unrender: function(){
        $(this.el).remove();
    },

    markRead: function() {
        this.model.markRead();
    },

    star: function() {
        this.model.starMail();
    },

    select: function(){
        this.model.selectMail();
    }
});

var InboxView = Backbone.View.extend({
    template: _.template($("#summary-tmpl").html()),

    el: $("#mailapp"),

    initialize: function(){

        this.collection.bind('change', this.renderSideMenu, this);
        this.render(this.collection);
        this.renderSideMenu();
    },

    events: {
        "change #labeler" : "applyLabel",
        "click #markallread" : "markallread",
        "click #archive" : "archive",
        "click #allmail" : "allmail",
        "click #inbox": "inbox",
        "click #starred": "starred",
        "keyup #search" : "search"
    },

    search: function(){
        this.render(this.collection.search($("#search").val()));
    },
    starred: function(){
        this.render(this.collection.starred());
    },

    inbox: function(){
        this.render(this.collection.inbox());
    },

    allmail: function(){
        this.render(this.collection);
    },

    markallread : function(){
        this.collection.each(function(item){
          item.markRead();
        }, this);
    },

    applyLabel: function(){

        var label = $("#labeler").val();
        this.collection.each(function(item){
            if(item.get('selected') == true){
              item.setLabel(label);
            }
        }, this);
    },

    archive: function(){
        this.collection.each(function(item){
            if(item.get('selected') == true){
              item.archive();
            }
        }, this);
        this.render(this.collection.inbox());
    },

    render: function(records){
        $('ul#mail-list', this.el).html('');
        var self = this;
        records.each(function(item){
            self.addOne(item);
        }, this);
    },

    renderSideMenu: function(){
        $("#sidemenu").html( this.template(
            {'inbox': this.collection.unread_count(),
             'starred':this.collection.starcount(),}));
    },

    addOne: function (mail) {
        var itemView = new MailView({ model: mail});

        $('ul#mail-list', this.el).append(itemView.render().el);
    }
});

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

// Post model
//App.Models.Post = Backbone.Model.extend({
//    url: function() {
//        return apiUrl('posts', $('html').attr('id'));
//    },
//    defaults: {
//        header: '',
//        body: '',
//        entryPhotoName: ''
//    },
//    validate: function(attrs){
//        if (!attrs.header){
//            alert('Your post must have a header!');
//        }
//        if (!attrs.body){
//            alert('Your post must have a story');
//        }
//    }
//});

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
//App.Views.Post = Backbone.View.extend({
//    tagName: 'article',
//    className: 'postArticle',
//    events: {
//        'click .edit':   'editPost',
//        'click .edit-button':   'editPost',
//        'click .submit-button':   'updatePost',
//        'click .delete-button': 'deletePost',
//        'click #n-workshop': 'loadWorkshopCollection'
//    },
//    initialize: function(){
//        this.listenTo(this.model, "change", this.savePost); // calls render function once name changed
//        this.listenTo(this.model, "destroy", this.removejunk); // calls remove function once model deleted
//        this.listenTo(this.model, "removeMe", this.removejunk); // calls remove function once model deleted
//    },
//    savePost: function(){
//        this.model.save(null, {
//            success: function (model, response) {
//                if (response.updatedsuccess == true){
//                    return response;
//                }
//                if (response.savedsuccess == true){
//                    new App.Views.Post({model:model}).render();
//                    this.remove();
//                    return response;
//                }
//                return response;
//            },
//            error: function () {
//                alert('your poem did not save properly..')
//            },
//            wait: true
//        });
//    },
//    editPost: function(e){
//        e.preventDefault();
//        if (!App.Views.Post.editable) {
//            var $target = $(e.target);
//            $target.closest("article").find(".edit-me").addClass('edit-selected');
//            var editSelected = $('.edit-selected');
//            App.Views.Post.currentwysihtml5 = editSelected.wysihtml5({
//                toolbar: {
//                    "style": true,
//                    "font-styles": true,
//                    "emphasis": true,
//                    "lists": true,
//                    "html": false,
//                    "link": false,
//                    "image": false,
//                    "color": false,
//                    fa: true
//                }
//            });
//            $target.closest("article").find('.edit-button').html("Submit Changes").attr('class', 'submit-button').css({'color':'red', 'style':'bold'});
//            editSelected.css({"border": "2px #2237ff dotted"});
//            editSelected.attr('contenteditable', false);
//            App.Views.Post.editable = true;
//        }
//    },
//    updatePost: function(e){
//        var $submittarget = $(e.target).closest("article").find(".edit-me");
//        var content = $submittarget.html();
//        $('.submit-button').html("Edit").attr('class', 'edit-button').css({'color':'#8787c1'});
//        $('.wysihtml5-toolbar').remove();
//        App.Views.Post.editable = false;
//        $submittarget.css({"border":"none"});
//        $submittarget.attr('contenteditable', false);
//        $submittarget.removeClass("edit-selected wysihtml5-editor wysihtml5-sandbox");
//        this.model.set({"body":content});
//    },
//    deletePost: function(e){
//        e.preventDefault();
//        alert("Do you really want to destroy this post?");
//        this.model.destroy({
//          success: function() {
//            console.log('model completely destroyed..');
//          }
//        });
//    },
//    removejunk: function(){
//        // same as this.$el.remove();
//        this.remove();
//        // unbind events that are set on this view
//        this.off();
//        // remove all models bindings made by this view
//        this.model.off( null, null, this );
//    },
//    render: function(){
//        this.$el.html(this.model.attributes.post_widget); // calls the template
//        $("#main").prepend(this.el);
//    }
//});

// Post collection
//App.Collections.Post = Backbone.Collection.extend({
//    url: function() {
//        return apiUrl('posts', $('html').attr('id'));
//    },
//    parse: function(response){return response.myPoems;},
//    byAuthor: function (author_id) {
//       var filtered = this.filter(function (post) {
//           return post.get("author") === author_id;
//       });
//       return new App.Collections.Post(filtered);
//    },
//    clear_all: function(){
//        this.each(function(model){
//            model.trigger('removeMe');
//        });
//    }
//});

// View for all posts (collection)
//App.Views.Posts = Backbone.View.extend({ // plural to distinguish as the view for the collection
//    attachToView: function(){
//        this.el = $("#poem-list");
//        var self = this;
//        $("article").each(function(){
//            var poemEl = $(this);
//            var id = poemEl.find("span").text();
//            var poem = self.collection.get(id);
//            new App.Views.Post({
//                model: poem,
//                el: poemEl
//            });
//        });
//    },
//    render: function(){
//        this.collection.each(function(Post){
//            var postView = new App.Views.Post({model: Post});
//            postView.render()
//        });
//    }
//});



//$.fn.serializeObject = function()
//{
//    var o = {};
//    var a = this.serializeArray();
//    $.each(a, function() {
//        if (o[this.name] !== undefined) {
//            if (!o[this.name].push) {
//                o[this.name] = [o[this.name]];
//            }
//            o[this.name].push(this.value || '');
//        } else {
//            o[this.name] = this.value || '';
//        }
//    });
//    return o;
//};
//
//
//$.fn.submitData = function(e){
//    var data = new FormData(this);
//    var xhr = new XMLHttpRequest();
//    xhr.upload.addEventListener('progress',function(e){
//        console.log('now loading')
//    }, false);
//    xhr.onreadystatechange = function(e){
//        if(xhr.readyState == 4){
//          console.log(xhr.statusText) //complete! - check xhr.status
//        }
//    };
//    xhr.open('POST', 'https://aperturus.s3.amazonaws.com/', true);
//    xhr.send(data);
//    return false;
//};
//
//App.Views.PhotoTextFormView = Backbone.View.extend({
//    el: '#photo-form-target',
//
//    initialize: function(){
//        this.render()
//    },
//
//    events: {
//        'submit': 'postnewentry',
//        'click .submit-button':   'updatePost',
//        'click #test-button':   'testAlert'
//    },
//
//    postnewentry: function(e) {
//        e.preventDefault();
//        var newPostModel = new App.Models.Post(this.$el.find('form').serializeObject());
//        if (currentFile === null){
//            alert("file upload has failed")
//        } else {
//            var entryPhotoName = currentFile.name.split(".")[0]+"-hexgenerator."+currentFile.type.split("/")[1];
//            newPostModel.set({'entryPhotoName': entryPhotoName});
//        }
//        newPostModel.save(null, {
//            success: function (model, response) {
//                alert('saved');
//                new App.Views.Post({model:model}).render();
//                return response;
//            },
//            error: function () {
//                alert('your poem did not save properly..')
//            },
//            wait: true
//        });
//    },
//    render: function() {
//        this.$el.html(nunjucks.render('/assets/forms/photo_text_form.html', { "phototextform['csrf_token']": '12345' }));
//        return this;
//    }
//});
//
//App.Views.S3FormView = Backbone.View.extend({
//    el: '#s3-form',
//    events: {
//        'change #file-input': 'validateanddisplaysample'
//    },
//
//    validateanddisplaysample: function(e) {
//        e.preventDefault();
//        //Get reference of FileUpload.
//        var fileUpload = this.$el.find("#file-input")
//        //Check whether the file is valid Image.
//        var regex = new RegExp("([a-zA-Z0-9\s_\\.\-:])+(.jpg|.png|.jpeg)$");
//        if (regex.test(fileUpload.val().toLowerCase())) {
//            //Check whether HTML5 is supported.
//            if (fileUpload.prop('files') != "undefined") {
//                currentFile = e.target.files[0];
//                //Initiate the FileReader object.
//                var reader = new FileReader();
//                //Read the contents of Image File.
//                reader.readAsDataURL(fileUpload.prop('files')[0]);
//                var self = this;
//                reader.onload = function (e) {
//                    //Initiate the JavaScript Image object.
//                    var image = new Image();
//                    //Set the Base64 string return from FileReader as source.
//                    image.src = e.target.result;
//                    //Validate the File Height and Width.
//                    image.onload = function () {
//                        var height = this.height;
//                        var width = this.width;
//                        var size = currentFile.size;
//                        if (width < 648 || height < 432) {
//                            alert("Images must be at least 648px in width and 432px in height");
//                            return false;
//                        } else {
//                            self.generateUploadFormThumb(self, currentFile);
//                        }
//                        if (height > 4896 || width > 4896 || size > 2000000) {
//                            self.generateServerFile(currentFile);
//                        }
//                    };
//                }
//            } else {
//                alert("This browser does not support HTML5.");
//                return false;
//            }
//        } else {
//            alert("Please select a jpeg or png image file.");
//            return false;
//        }
//    },
//
//    generateUploadFormThumb: function(self, currentFile){
//        loadImage(
//           currentFile,
//           function (img) {
//               if(img.type === "error") {
//                   alert("Error loading image " + currentFile);
//                   return false;
//               } else {
//                   self.replaceResults(img, currentFile);
//                   loadImage.parseMetaData(currentFile, function (data) {
//                       if (data.exif) {
//                           self.displayExifData(data.exif);
//                       }
//                   });
//               }
//           },
//           {maxWidth: 648}
//        );
//    },
//
//    generateServerFile: function(currentFile){
//        loadImage(
//            currentFile,
//            function (img) {
//                if(img.type === "error") {
//                    console.log("Error loading image " + currentFile);
//                } else {
//                    if (img.toBlob) {
//                        img.toBlob(
//                            function (blob) {
//                                serverBlob = blob
//
//                            },
//                            'image/jpeg'
//                        );
//                    }
//                }
//            },
//            {maxWidth: 4896, canvas:true}
//        );
//    },
//
//    replaceResults: function (img, currentFile) {
//        var content;
//        if (!(img.src || img instanceof HTMLCanvasElement)) {
//          content = $('<span>Loading image file failed</span>')
//        } else {
//          content = $(img);
//        }
//        $('#result').children().replaceWith(content.addClass('u-full-width').removeAttr('width').removeAttr('height').fadeIn());
//        $('#photo-submit').removeClass("hide");
//    },
//
//    displayExifData: function (exif) {  // Save Exif data to an entry model attribute to save on Flask model
//        var tags = exif.getAll(),
//            table = $('#exif').find('table').empty(),
//            row = $('<tr></tr>'),
//            cell = $('<td></td>'),
//            prop;
//        for (prop in tags) {
//            if (tags.hasOwnProperty(prop)) {
//                if(prop in {'Make':'', 'Model':'', 'DateTime':'', 'ExposureTime':'', 'ShutterSpeedValue':'',
//                    'FNumber':'', 'ExposureProgram':'', 'MeteringMode':'', 'ExposureMode':'', 'WhiteBalance':'',
//                    'PhotographicSensitivity':'', 'FocalLength':'', 'FocalLengthIn35mmFilm':'', 'LensModel':'',
//                    'Sharpness':'', 'PixelXDimension':'', 'PixelYDimension':''}) {
//                        table.append(
//                            row.clone()
//                                .append(cell.clone().text(prop))
//                                .append(cell.clone().text(tags[prop]))
//                        );
//                }
//            }
//        }
//    },
//
//    render: function() {
//        this.$el.html(this.template);
//        console.log('modal rendered');
//        return this;
//    }
//});


$(document).ready(function() {

    var list = new MailList(data); // loaded from data.js
    var App = new InboxView({collection:list}) ;

    window.s3formview = new App.Views.S3FormView();
    nunjucks.configure('/static/templates');

    $( "#s3-form" ).submit(function( e ) {
        e.preventDefault();
        var data = new FormData(this);
        if (typeof(serverBlob) !== "undefined") {
            data.append('image', serverBlob);
        }
        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress',function(e){
            $( "#progress-bar").html(e.loaded+" of "+e.total+" bytes loaded");
        }, false);
        xhr.onreadystatechange = function(e){
            if(xhr.readyState == 4){
                if(xhr.status == 200){
                    window.s3formview.$el.hide();
                    window.phototextformview = new App.Views.PhotoTextFormView();

                } else {
                    console.log(xhr.statusText)
                }

            }
        };
        xhr.open('POST', 'https://aperturus.s3.amazonaws.com/', true);
        xhr.send(data);
        return false;
    });

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

    //App.Collections.Post.postCollection = new App.Collections.Post();
    //App.Collections.Post.postCollection.fetch({
    //    success: function() {
    //        App.Views.Posts.poemListView = new App.Views.Posts({collection: App.Collections.Post.postCollection});
    //        App.Views.Posts.poemListView.attachToView();
    //    }
    //});
    //
    //
    //App.Views.Global.globalView = new App.Views.Global({el: '.page'});
    //new App.Router();
    //Backbone.history.start(); // start Backbone history
});