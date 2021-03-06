$( document ).ready(function() {
 // Signup
    $("#signup-form").submit(function(e) {
        e.preventDefault();
        var $form = $(this);

        $.post("/signup/", $form.serialize(),
            function(data) {
            var result = $.parseJSON(data);
            var error_firstname = $("#error_firstname");
            var error_lastname = $("#error_lastname");
            var error_email = $("#error_email");
            var error_password = $("#error_password");
            error_firstname.text("");
            error_lastname.text("");
            error_email.text("");
            error_password.text("");

            if(result.iserror) {
                if(result.firstname!=undefined) error_firstname.text('['+result.firstname[0]+']');
                if(result.lastname!=undefined) error_lastname.text('['+result.lastname[0]+']');
                if(result.email!=undefined) error_email.text('['+result.email[0]+']');
            }else if (result.savedsuccess) {
                location.href = "/profile/" + result.newuser_nickname
            }
        });
    });

// Login
    $("#login-form").submit(function(e) {
        e.preventDefault();
        var $form = $(this);
        var url = '/login/';
        $.ajax({
            type: 'POST',
            url: url,
            data: $form.serialize(),
            success: function(data) {
                var result = $.parseJSON(data);
                var error_email = $("#error_email");
                var error_password = $("#error_password");
                error_email.text("");
                error_password.text("");
                if(result.iserror) {
                    if(result.email!=undefined) error_email.text('['+result.email[0]+']');
                    if(result.password!=undefined) error_password.text('['+result.password[0]+']');
                }else if (result.savedsuccess) {
                    location.href = "/profile/" + result.returninguser_nickname
                }
            },
            error: function() {
                console.log('there was a problem checking the fields');
            }
        });
    });

// Update Profile
    $("#profile-form").submit(function(e) {
        var profile_user_id = $('.btn-lg').attr('id');
        var $form = $(this);
        var url = '/profile/' + profile_user_id;
        $.ajax({
            type: 'POST',
            url: url,
            data: $form.serialize(),
            async: false,
            success: function(data) {
                var result = $.parseJSON(data);
                var error_nickname = $("#error_nickname");
                var error_about_me = $("#error_about_me");
                var error_profile_photo = $("#error_profile_photo");
                error_nickname.text("");
                error_about_me.text("");
                error_profile_photo.text("");
                if(result.iserror) {
                    e.preventDefault();
                    if(result.nickname!=undefined) error_nickname.text('['+result.nickname[0]+']');
                    if(result.about_me!=undefined) error_about_me.text('['+result.about_me[0]+']');
                    if(result.profile_photo!=undefined) error_profile_photo.text('['+result.profile_photo[0]+']');
                }else if (result.savedsuccess) {
                    $("#myModal").modal('hide');
                    return true;
                }
            },
            error: function() {
                console.log('there was a problem checking the fields');
            }
        });
    });


// Create Post
    var myCustomTemplates = {
        ellipsis: function() {
            return "<li>" + "<a class='btn btn-default' data-wysihtml5-command='insertHTML' data-wysihtml5-command-value='&hellip;'>hellip</a>" + "</li>";
        },
        strikethrough: function() {
            return "<li>" + "<a class='btn btn-default' tabindex='-1' style='color:red' data-edit='strikethrough' title='Strikethrough' data-wysihtml5-command='strikeTHROUGH' data-wysihtml5-command-value='madeup'><i class='fa fa-strikethrough'></i></a>" + "</li>";
        }
    };

    if($("body").attr("class") != "wysihtml5-supported") {
        if ($('#user-type').html() == 1) {
            $('#editable').wysihtml5({
                toolbar: {
                    "style": true,
                    "font-styles": true,
                    "emphasis": true,
                    "lists": true,
                    "html": false,
                    "link": false,
                    "image": false,
                    "color": false,
                    fa: true,
                    ellipsis: false,
                    strikethrough: true
                },
                customTemplates: myCustomTemplates
            });
        } else {
           $('#editable').wysihtml5({
                toolbar: {
                    "style": true,
                    "font-styles": true,
                    "emphasis": true,
                    "lists": true,
                    "html": false,
                    "link": false,
                    "image": false,
                    "color": false,
                    fa: true,
                    ellipsis: false,
                    strikethrough: true
                },
                customTemplates: myCustomTemplates
            });
        }
    }


//Update Post
    var showToolbar = function() {
        if($("body").attr("class") != "wysihtml5-supported") {
            $('.edit-me').wysihtml5({
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
        } else {
            $('.wysihtml5-toolbar').show()
        }
        $('#edit-button').html("Submit Changes");
    };


    var hideToolbar = function() {
        $('#edit-button').html("Edit Poem");
        $('.wysihtml5-toolbar').hide()
    };

    var editable = false;
    $( "#edit-button" ).click(function() {
        var editme = $('.edit-me');
        if (!editable){
            showToolbar();
            editable = true;
            editme.css({"border":"2px #2237ff dotted"});
            editme.attr('contenteditable', false);
        } else {
            var content = editme.html();
            var post_id = $('.post-id').html();
            hideToolbar();
            editable = false;
            editme.css({"border":"none"});
            editme.attr('contenteditable', false);
            $.ajax({
                type: "PUT",
                url:'/detail/',
                data: {content: content, post_id: post_id}
            });
        }
    });


//Destroy Post
    $( "#delete-button" ).click(function() {
        var post_id = $('.post-id').html();
        $.ajax({
            url: '/detail/' + post_id,
            type: 'DELETE',
            success: function(result) {
                if(result.iserror) {
                    alert("An error occurred while deleting the last item..")
                }else {
                    // When backbone is complete, remove poem from the current DOM
                    location.href = "/photos/portfolio"
                }
            }
        });
    });


//Comment on Post
    $("#comment-form").submit(function(e) {
        e.preventDefault();
        var $form = $(this);
        var post_id = $('.post-id').html();
        $.post('/comment/' + post_id, $form.serialize(),
            function(data) {
            var result = $.parseJSON(data);
            var error_comment = $("#error_comment");
            error_comment.text("");
            if(result.iserror) {
                if(result.comment!=undefined) error_comment.text(result.comment[0]);
            }else if (result.savedsuccess) {
                $("#comment").val("");
                $("#comments").append(result.new_comment);
            }
        });
    });


//Vote on Post
    $(".likeme").click(function() {
        var post_id = $('.post-id').html();
        var vote_button_selector = "a." + post_id;
        var $vote_button = $(vote_button_selector); // cache this! can't access in callback!
        var post_to = '/vote/' + post_id;
        if ($vote_button.attr("data-voted") === "true") {
            $vote_button.css("color", "#000");
            $vote_button.html("<i class='fa fa-meh-o fa-lg'></i>");
            $vote_button.attr("data-voted", "false");
        } else {
            $vote_button.css("color", "rgb(235, 104, 100)");
            $vote_button.html("<i class='fa fa-smile-o fa-lg'>");
            $vote_button.attr("data-voted", "true");
        }
        $.post(post_to,
            function (response) {
                var likephrase;
                if (response.new_votes === 1) {
                    likephrase = "like";
                } else {
                    likephrase = "likes";
                }
                var new_vote_count = response.new_votes.toString();
                //var vote_status = response.vote_status;
                $vote_button.parent().next().html(new_vote_count + "&nbsp;" + likephrase);
            }, 'json'
        );
    });

    $(".prevent_default").click(function(e) {
        e.preventDefault();
    });
});

