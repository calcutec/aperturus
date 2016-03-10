from app import app
from config import ALLOWED_EXTENSIONS
from forms import SignupForm, EditForm, PostForm, CommentForm, LoginForm
from rauth import OAuth2Service
import json
import urllib2
from flask import request, redirect, url_for, render_template, g, current_app, make_response
from models import User, Post
from functools import update_wrapper
from datetime import timedelta
from datetime import datetime
import hmac
from uuid import uuid4
from base64 import b64encode
import hashlib


class BasePage(object):
    def __init__(self, page_mark):
        self.page_mark = page_mark
        self.assets = self.getassets()

    def getassets(self):
        assets = {}
        posts = self.getposts()
        renderedform = self.getrenderedform()
        assets['title'] = render_template("title.html", page_mark=self.page_mark)
        assets['body_form'] = renderedform
        if self.page_mark != "login":
            assets['main_entry'] = render_template("main_entry.html", posts=posts)
            assets['archives'] = render_template("archives.html", posts=posts)
            # assets['initial_data'] = json.dumps({'posts': [i.json_view() for i in posts[0:6]]})
        return assets

    def getposts(self):
        posts = None
        if self.page_mark == 'intro':
            posts = Post.query.filter_by(writing_type="op-ed").order_by(Post.timestamp.desc())
        elif self.page_mark == 'gallery':
            posts = Post.query.filter_by(writing_type="entry").order_by(Post.timestamp.desc())
        elif self.page_mark == 'profile':
            posts = Post.query.filter_by(author=g.user).order_by(Post.timestamp.desc())
        elif self.page_mark == 'members':
            posts = User.query.all()
        elif self.page_mark == 'detail':
            posts = User.query.all()
        return posts

    def getrenderedform(self):
        rendered_form = None
        if g.user.is_authenticated() is False:
                rendered_form = render_template("assets/forms/login_form.html", loginform=LoginForm(),
                                                signupform=SignupForm())
        else:
            if self.page_mark == 'gallery':
                s3_form = self.create_s3_form()
                photo_text_form = render_template("assets/forms/photo_text_form.html", phototextform=PostForm())
                rendered_form = render_template("assets/forms/photo_form.html", S3form=s3_form,
                                                PhotoTextForm=photo_text_form)
            elif self.page_mark == 'profile':
                form = EditForm()
                form.nickname.data = g.user.nickname
                form.about_me.data = g.user.about_me
                rendered_form = render_template("assets/forms/profile_form.html", form=EditForm)
            elif self.page_mark == 'detail':
                rendered_form = render_template("assets/forms/comment_form.html", form=CommentForm(),
                                                post=self.getposts)
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
            # 'success_action_status_redirect': "http://www.netbard.com",
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

    def __str__(self):
        return "This is the %s page" % self.page_mark


def allowed_file(extension):
    return extension in ALLOWED_EXTENSIONS


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
