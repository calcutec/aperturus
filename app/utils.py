import boto
from PIL import Image
from app import app
from config import ALLOWED_EXTENSIONS, POSTS_PER_PAGE
from forms import SignupForm, EditForm, PostForm, CommentForm, LoginForm
from rauth import OAuth2Service
import json
import urllib2
import cStringIO
from flask import request, redirect, url_for, render_template, g, flash, current_app, make_response
from models import User, Post
from functools import wraps
from functools import update_wrapper
from datetime import timedelta
from datetime import datetime
import hmac
from uuid import uuid4
from base64 import b64encode
import hashlib


class ViewData(object):
    def __init__(self, page_mark='home', slug=None, nickname=None, page=1, form=None, render_form=None,
                 posts_for_page=POSTS_PER_PAGE, editor=None):
        self.posts_for_page = posts_for_page
        self.slug = slug
        self.nickname = nickname
        self.page = page
        self.page_mark = page_mark
        self.form = form
        self.render_form = render_form
        self.editor = editor
        self.profile_user = None
        self.posts = None
        self.post = None
        self.assets = {}
        self.context = None

        self.get_items()
        self.get_context()

    def get_items(self):
        if self.page_mark == 'home':
            self.posts_for_page = 1
            self.posts = Post.query.filter_by(writing_type="op-ed").order_by(Post.timestamp.desc())
            # .paginate(self.page, self.posts_for_page, False)
            self.assets['body_form'] = self.get_form()
            self.assets['image_form'] = self.create_s3_form()

        elif self.page_mark == 'gallery':
            self.posts = Post.query.filter_by(writing_type="entry").order_by(Post.timestamp.desc())
            # .paginate(self.page, self.posts_for_page, False)
            self.assets['body_form'] = self.get_form()

        elif self.page_mark == 'portfolio':
            self.posts = g.user.posts.filter(Post.writing_type == "entry").order_by(Post.timestamp.desc())
            # .paginate(self.page, self.posts_for_page, False)
            self.assets['body_form'] = self.get_form()

        elif self.page_mark == 'profile':
            self.profile_user = User.query.filter_by(nickname=self.nickname).first()
            self.posts = Post.query.filter_by(author=self.profile_user)
            # .order_by(Post.timestamp.desc()).paginate(self.page, self.posts_for_page, False)
            if not self.form:
                self.assets['header_form'] = self.get_form()

        elif self.page_mark == 'detail':
            self.post = Post.query.filter(Post.slug == self.slug).first()
            if not self.form:
                self.assets['body_form'] = self.get_form()

        elif self.page_mark == 'members':
            self.posts = User.query.all()

    def get_form(self):
        rendered_form = None
        if not g.user.is_authenticated():
                rendered_form = render_template("assets/forms/login_form.html", loginform=LoginForm(),
                                                signupform=SignupForm())
        else:
            if self.page_mark == 'home':
                if g.user.email == 'burton.wj@gmail.com':
                    form = PostForm()
                    rendered_form = render_template("assets/forms/photo_form.html", form=form, page_mark=self.page_mark)

            if self.page_mark == 'portfolio' or self.page_mark == 'gallery':
                form = PostForm()
                rendered_form = render_template("assets/forms/photo_form.html", form=form, page_mark=self.page_mark)
            elif self.page_mark == 'profile':
                form = EditForm()
                form.nickname.data = g.user.nickname
                form.about_me.data = g.user.about_me
                rendered_form = render_template("assets/forms/profile_form.html", form=form)
            elif self.page_mark == 'detail':
                form = CommentForm()
                rendered_form = render_template("assets/forms/comment_form.html", form=form, post=self.post)
        return rendered_form

    def create_s3_form(self):
        key = str(uuid4())
        form = self.s3_upload_form(app.config['AWS_ACCESS_KEY_ID'], app.config['AWS_SECRET_ACCESS_KEY'],
                                   app.config['S3_REGION'], 'aperturus', key=key)
        ctx = {'region': app.config['S3_REGION'], 'bucket': 'aperturus', 'form': form}
        return render_template('assets/forms/S3_upload_form.html', **ctx)

    def hmac_sha256(self, key, msg):
        return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

    def sign(self, key, date, region, service, msg):
        date = date.strftime('%Y%m%d')
        hash1 = self.hmac_sha256('AWS4'+key, date)
        hash2 = self.hmac_sha256(hash1, region)
        hash3 = self.hmac_sha256(hash2, service)
        key = self.hmac_sha256(hash3, 'aws4_request')
        return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).hexdigest()

    def s3_upload_form(self, access_key, secret_key, region, bucket, key=None, prefix=None):
        assert (key is not None) or (prefix is not None)
        if (key is not None) and (prefix is not None):
            assert key.startswith(prefix)
        now = datetime.utcnow()
        form = {
            'acl': 'private',
            'success_action_status': '200',
            # 'success_action_status_redirect': "http://localhost:8000/photos/home",
            'x-amz-algorithm': 'AWS4-HMAC-SHA256',
            'x-amz-credential': '{}/{}/{}/s3/aws4_request'.format(access_key, now.strftime('%Y%m%d'), region),
            'x-amz-date': now.strftime('%Y%m%dT000000Z'),
        }
        expiration = now + timedelta(minutes=30)
        policy = {
          'expiration': expiration.strftime('%Y-%m-%dT%H:%M:%SZ'),
          'conditions': [
            {'bucket': bucket},
            {'acl': 'private'},
            ['content-length-range', 32, 10485760],
            {'success_action_status': form['success_action_status']},
            # {'success_action_status_redirect': form['success_action_status_redirect']},
            {'x-amz-algorithm':       form['x-amz-algorithm']},
            {'x-amz-credential':      form['x-amz-credential']},
            {'x-amz-date':            form['x-amz-date']},
          ]
        }
        if region == 'us-east-1':
            form['action'] = 'https://{}.s3.amazonaws.com/'.format(bucket)
        else:
            form['action'] = 'https://{}.s3-{}.amazonaws.com/'.format(bucket, region)
        if key is not None:
            form['key'] = key
            policy['conditions'].append(
              {'key':    key},
            )
        if prefix is not None:
            form['prefix'] = prefix
            policy['conditions'].append(
              ["starts-with", "$key", prefix],
            )
        form['policy'] = b64encode(json.dumps(policy))
        form['x-amz-signature'] = self.sign(secret_key, now, region, 's3', form['policy'])
        return form

    def get_context(self):
        self.context = {'post': self.post, 'posts': self.posts, 'profile_user': self.profile_user,
                        'page_mark': self.page_mark, 'form': self.form, 'assets': self.assets, 'editor': self.editor}


def check_expired(func):
    @wraps(func)
    def decorated_function(page_mark=None, slug=None, post_id=None):
        if page_mark and page_mark not in ['poetry', 'portfolio', 'workshop', 'create']:
            flash("That page does not exist.")
            return redirect(url_for('home'))
        return func(page_mark, slug, post_id)

    return decorated_function


def allowed_file(extension):
    return extension in ALLOWED_EXTENSIONS


def pre_upload(img_obj):
    thumbnail_name, thumbnail_file, upload_directory = generate_thumbnail(**img_obj)
    s3_file_name = s3_upload(thumbnail_name, thumbnail_file, upload_directory)
    return s3_file_name


def s3_upload(filename, source_file, upload_directory, acl='public-read'):
    # """ Uploads WTForm File Object to Amazon S3
    #
    #     Expects following app.config attributes to be set:
    #         S3_KEY              :   S3 API Key
    #         S3_SECRET           :   S3 Secret Key
    #         S3_BUCKET           :   What bucket to upload to
    #         S3_UPLOAD_DIRECTORY :   Which S3 Directory.
    #
    #     The default sets the access rights on the uploaded file to
    #     public-read.  Optionally, can generate a unique filename via
    #     the uuid4 function combined with the file extension from
    #     the source file(to avoid filename collision for user uploads.
    # """
    # Connect to S3 and upload file.
    conn = boto.connect_s3(app.config["AWS_ACCESS_KEY_ID"], app.config["AWS_SECRET_ACCESS_KEY"])
    b = conn.get_bucket(app.config["S3_BUCKET"])

    sml = b.new_key("/".join([upload_directory, filename]))
    sml.set_contents_from_file(source_file, rewind=True)
    sml.set_acl(acl)

    return filename


def generate_thumbnail(filename, img, box, photo_type, crop, extension):

    if box is not None:
        """Downsample the image.
        @param box: tuple(x, y) - the bounding box of the result image
        """
        # preresize image with factor 2, 4, 8 and fast algorithm
        factor = 1
        while img.size[0]/factor > 2*box[0] and img.size[1]*2/factor > 2*box[1]:
            factor *= 2
        if factor > 1:
            img.thumbnail((img.size[0]/factor, img.size[1]/factor), Image.NEAREST)

        # calculate the cropping box and get the cropped part
        if crop:
            x1 = y1 = 0
            x2, y2 = img.size
            wratio = 1.0 * x2/box[0]
            hratio = 1.0 * y2/box[1]
            if hratio > wratio:
                y1 = int(y2/2-box[1]*wratio/2)
                y2 = int(y2/2+box[1]*wratio/2)
            else:
                x1 = int(x2/2-box[0]*hratio/2)
                x2 = int(x2/2+box[0]*hratio/2)
            img = img.crop((x1, y1, x2, y2))

        # Resize the image with best quality algorithm ANTI-ALIAS
        img.thumbnail(box, Image.ANTIALIAS)

    # save it into a file-like object
    thumbnail_name = photo_type + "_" + filename
    upload_directory = "user_imgs"
    image_stream = cStringIO.StringIO()
    img.save(image_stream, extension, quality=75)
    image_stream.seek(0)
    thumbnail_file = image_stream
    return thumbnail_name, thumbnail_file, upload_directory


class OAuthSignIn(object):
    providers = None

    def __init__(self, provider_name):
        self.provider_name = provider_name
        credentials = app.config['OAUTH_CREDENTIALS'][provider_name]
        self.consumer_id = credentials['id']
        self.consumer_secret = credentials['secret']

    def authorize(self):
        pass

    def callback(self):
        pass

    def get_callback_url(self):
        return url_for('login', provider=self.provider_name,
                       _external=True)

    @classmethod
    def get_provider(cls, provider_name):
        if cls.providers is None:
            cls.providers = {}
            for provider_class in cls.__subclasses__():
                provider = provider_class()
                cls.providers[provider.provider_name] = provider
        return cls.providers[provider_name]


class FacebookSignIn(OAuthSignIn):
    def __init__(self):
        super(FacebookSignIn, self).__init__('facebook')
        self.service = OAuth2Service(
            name='facebook',
            client_id=self.consumer_id,
            client_secret=self.consumer_secret,
            authorize_url='https://graph.facebook.com/oauth/authorize',
            access_token_url='https://graph.facebook.com/oauth/access_token',
            base_url='https://graph.facebook.com/'
        )

    def authorize(self):
        return redirect(self.service.get_authorize_url(
            scope='email',
            response_type='code',
            redirect_uri=self.get_callback_url())
        )

    def callback(self):
        if 'code' not in request.args:
            return None, None, None
        oauth_session = self.service.get_auth_session(
            data={'code': request.args['code'],
                  'grant_type': 'authorization_code',
                  'redirect_uri': self.get_callback_url()}
        )
        me = oauth_session.get('me').json()
        nickname = me.get('email').split('@')[0]
        nickname = User.make_valid_nickname(nickname)
        nickname = User.make_unique_nickname(nickname)
        return nickname, me.get('email')


class GoogleSignIn(OAuthSignIn):
    def __init__(self):
        super(GoogleSignIn, self).__init__('google')
        googleinfo = urllib2.urlopen('https://accounts.google.com/.well-known/openid-configuration')
        google_params = json.load(googleinfo)
        self.service = OAuth2Service(
            name='google',
            client_id=self.consumer_id,
            client_secret=self.consumer_secret,
            authorize_url=google_params.get('authorization_endpoint'),
            base_url=google_params.get('userinfo_endpoint'),
            access_token_url=google_params.get('token_endpoint')
        )

    def authorize(self):
        return redirect(self.service.get_authorize_url(
            scope='email',
            response_type='code',
            redirect_uri=self.get_callback_url())
            )

    def callback(self):
        if 'code' not in request.args:
            return None, None, None
        oauth_session = self.service.get_auth_session(
            data={'code': request.args['code'],
                  'grant_type': 'authorization_code',
                  'redirect_uri': self.get_callback_url()},
            decoder=json.loads
        )
        me = oauth_session.get('').json()
        nickname = me['name']
        nickname = User.make_valid_nickname(nickname)
        nickname = User.make_unique_nickname(nickname)
        return nickname, me['email']


def crossdomain(origin=None, methods=None, headers=None,
                max_age=21600, attach_to_all=True,
                automatic_options=True):
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods

        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp

            h = resp.headers

            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)
            if headers is not None:
                h['Access-Control-Allow-Headers'] = headers
            return resp

        f.provide_automatic_options = False
        return update_wrapper(wrapped_function, f)
    return decorator
