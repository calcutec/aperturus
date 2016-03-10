import os
from flask import Flask
from jinja2 import FileSystemLoader
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.login import LoginManager
from flask.ext.mail import Mail
from flask.ext.assets import Environment, Bundle
from config import ADMINS, MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, \
    MAIL_PASSWORD, SQLALCHEMY_DATABASE_URI
from flask_wtf.csrf import CsrfProtect

app = Flask(__name__)
base_dir = os.path.dirname(os.path.realpath(__file__))

app.jinja_loader = FileSystemLoader(os.path.join(base_dir, 'static', 'templates'))

app.config.from_object('config')
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
db = SQLAlchemy(app)
lm = LoginManager()
lm.init_app(app)
lm.login_view = 'login'
lm.login_message = 'Please log in to access this page.'
mail = Mail(app)
CsrfProtect(app)

assets = Environment(app)
assets.cache = False
assets.manifest = "json:{path}"

appcss = Bundle('css/fix.css', 'css/custom.css', 'css/navbar.css', 'css/fonts.css', filters='cssmin',
                output='gen/app.css')
assets.register('css_app', appcss)

appjs = Bundle('js/data.js', 'js/main.js', 'js/navbar.js', filters='jsmin', output='gen/app.js')
libsjs = Bundle('js/_libs/jquery/jquery-2.2.0.min.js', 'js/_libs/nunjucks.min.js', 'js/_libs/canvas-to-blob.min.js',
                'js/_libs/load-image.all.min.js', 'js/_libs/backbone/underscore-min.js',
                'js/_libs/backbone/backbone-min.js', 'js/_libs/backbone/backbone.localStorage-min.js', filters='jsmin',
                output='gen/libs.js')
assets.register('js_app', appjs)
assets.register('js_libs', libsjs)

# app.config['ASSETS_DEBUG'] = True

app.config['OAUTH_CREDENTIALS'] = {
    'facebook': {
        'id': os.environ['FACEBOOK_AUTH'],
        'secret': os.environ['FACEBOOK_AUTH_SECRET']
    },
    'google': {
        'id': os.environ['GOOGLE_AUTH'],
        'secret': os.environ['GOOGLE_AUTH_SECRET'],
        'immediate': 'true'
    }
}

if not app.debug and MAIL_SERVER != '':
    import logging
    from logging.handlers import SMTPHandler
    credentials = None
    if MAIL_USERNAME or MAIL_PASSWORD:
        credentials = (MAIL_USERNAME, MAIL_PASSWORD)
    mail_handler = SMTPHandler((MAIL_SERVER, MAIL_PORT),
                               'no-reply@' + MAIL_SERVER, ADMINS,
                               'homeporch failure', credentials)
    mail_handler.setLevel(logging.ERROR)
    app.logger.addHandler(mail_handler)

if not app.debug and os.environ.get('HEROKU') is None:
    import logging
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler('tmp/burtonblog.log', 'a',
                                       1 * 1024 * 1024, 10)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('homeporch startup')

if os.environ.get('HEROKU') is not None:
    import logging
    stream_handler = logging.StreamHandler()
    app.logger.addHandler(stream_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('homeporch startup')


app.config["S3_LOCATION"] = 'https://s3.amazonaws.com/aperturus/'
app.config["S3_UPLOAD_DIRECTORY"] = 'site_assets'
app.config["S3_BUCKET"] = 'aperturus'
app.config["S3_REGION"] = 'us-east-1'
app.config["AWS_ACCESS_KEY_ID"] = os.environ['AWS_ACCESS_KEY_ID']
app.config["AWS_SECRET_ACCESS_KEY"] = os.environ['AWS_SECRET_ACCESS_KEY']

from app import views, models
