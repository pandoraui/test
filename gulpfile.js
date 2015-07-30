/**
 *  Web Starter Kit
 *
 *  Forked from Web Starter Kit
 *  Copyright 2014 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

/**
  编译Sass [gulp-ruby-sass](https://github.com/sindresorhus/gulp-ruby-sass)
  Autoprefixer [gulp-autoprefixer](https://github.com/Metrime/gulp-autoprefixer)
  缩小化(minify)CSS [gulp-minify-css](https://github.com/jonathanepollack/gulp-minify-css)
  JSHint [gulp-jshint](https://github.com/wearefractal/gulp-jshint)
  拼接 [gulp-concat](https://github.com/wearefractal/gulp-concat)
  丑化(Uglify) [gulp-uglify](https://github.com/terinjokes/gulp-uglify)
  图片压缩 [gulp-imagemin](https://github.com/sindresorhus/gulp-imagemin)
  即时重整(LiveReload) [gulp-livereload](https://github.com/vohof/gulp-livereload)
  清理档案 [gulp-clean](https://github.com/peter-vilja/gulp-clean)
  图片快取，只有更改过得图片会进行压缩 [gulp-cache](https://github.com/jgable/gulp-cache/)
  更动通知 [gulp-notify](https://github.com/mikaelbr/gulp-notify)
*/



'use strict';

var path = require('path');
var fs = require('fs');
var format = require('util').format;
var _ = require('lodash');
var collapser = require('bundle-collapser/plugin');
var derequire = require('derequire/plugin');
var bistre = require('bistre');

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

var pkg = require('./package.json');

var config = {
  path: {
    less: [
      './less/amazeui.less',
      './less/themes/flat/amazeui.flat.less'
    ],
    fonts: './fonts/*',
    widgets: [
      '*/src/*.js',
      '!{layout*,blank,container}' +
      '/src/*.js'],
    hbsHelper: [
      'vendor/amazeui.hbs.helper.js',
      'vendor/amazeui.hbs.partials.js'],
    buildTmp: '.build/temp/'
  },
  dist: {
    js: './dist/js',
    css: './dist/css',
    fonts: './dist/fonts'
  },
  js: {
    base: [
      'core.js',
      'util.hammer.js'
    ]
  },

  AUTOPREFIXER_BROWSERS: [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ],
  uglify: {
    output: {
      ascii_only: true
    }
  }
};

var dateFormat = 'isoDateTime';

var banner = [
  '/*! <%= pkg.title %> v<%= pkg.version %><%=ver%>',
  'by <%= pkg.team %> Team',
  '(c) ' + $.util.date(Date.now(), 'UTC:yyyy') + ' <%= pkg.author %>',
  'Licensed under <%= pkg.license %>',
  $.util.date(Date.now(), dateFormat) + ' */ \n'
].join(' | ');

var jsEntry;
var plugins;
var WIDGET_DIR = './widget/';

// Write widgets style and tpl
var preparingData = function() {
  jsEntry = ''; // empty string
  var fsOptions = {encoding: 'utf8'};

  // less
  var uiBase = fs.readFileSync('./less/amui.less', fsOptions);
  var widgetsStyle = '';

  var rejectWidgets = ['.DS_Store', 'blank', 'layout2', 'layout3', 'layout4',
    'container'];
  var allWidgets = fs.readdirSync(WIDGET_DIR).filter(function(widget) {
    return rejectWidgets.indexOf(widget) === -1;
  });

  plugins = _.union(config.js.base, fs.readdirSync('./js'));

  jsEntry += '\'use strict\';\n\n' + 'var $ = require(\'jquery\');\n';

  plugins.forEach(function(plugin, i) {
    var basename = path.basename(plugin, '.js');

    if (basename !== 'amazeui' && basename !== 'amazeui.legacy') {
      jsEntry += (basename === 'core' ? 'var UI = ' : '') +
        'require("./' + basename + '");\n';
    }
  });

  // widgets partial
  var partials = '(function(undefined){\n';
  partials += '  \'use strict\';\n\n';
  partials += '  var registerAMUIPartials = function(hbs) {\n';

  // get widgets dependencies
  allWidgets.forEach(function(widget, i) {
    // read widget package.json
    var pkg = require(path.join(__dirname, WIDGET_DIR, widget, 'package.json'));
    // ./widget/header/src/header
    var srcPath = WIDGET_DIR + widget + '/src/' + widget;

    widgetsStyle += '\r\n// ' + widget + '\r\n';
    widgetsStyle += '@import ".' + srcPath + '.less";' + '\r\n';
    pkg.themes.forEach(function(item, index) {
      if (!item.hidden && item.name) {
        widgetsStyle += '@import ".' + srcPath + '.' + item.name +
          '.less";' + '\r\n';
      }
    });

    // add to entry
    jsEntry += 'require(".' + srcPath + '.js");\n';

    // read tpl
    var hbs = fs.readFileSync(path.join(srcPath + '.hbs'), fsOptions);
    partials += format('    hbs.registerPartial(\'%s\', %s);\n\n',
      widget, JSON.stringify(hbs));
  });

  // end jsEntry
  jsEntry += '\nmodule.exports = $.AMUI = UI;\n';
  fs.writeFileSync(path.join('./js/amazeui.js'), jsEntry);

  partials += '  };\n\n';
  partials += '  if (typeof module !== \'undefined\' && module.exports) {\n';
  partials += '    module.exports = registerAMUIPartials;\n' +
  '  }\n\n';
  partials += '  this.Handlebars && registerAMUIPartials(this.Handlebars);\n';
  partials += '}).call(this);\n';

  // write partials
  fs.writeFileSync(path.join('./vendor/amazeui.hbs.partials.js'), partials);

  // write less
  fs.writeFileSync('./less/amazeui.less', uiBase + widgetsStyle);
};

gulp.task('build:preparing', preparingData);

// JavaScript 格式校验
gulp.task('jshint', function() {
  return gulp.src('app/js/**/*.js')
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});


// 图片优化
gulp.task('images', function() {
  return gulp.src('app/i/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/i'))
    .pipe($.size({title: 'i'}));
});

// 拷贝相关资源
gulp.task('copy', function() {
  return gulp.src([
    'app/*',
    '!app/*.html',
    '!app/js/*',
    '!app/less',
    'node_modules/amazeui/dist/**/*',
    'node_modules/jquery/dist/jquery.min.js'
  ], {
    dot: true
  }).pipe($.if(function(file) {
    return file.path.indexOf('jquery.min.js') > -1;
  }, $.replace(/\/\/# sourceMappingURL=jquery.min.map/, '')))
    .pipe(gulp.dest(function(file) {
      if (file.path.indexOf('jquery') > -1) {
        return 'dist/js';
      }
      return 'dist';
    }))
    .pipe($.size({title: 'copy'}));
});

// 编译 Less，添加浏览器前缀
gulp.task('styles', function() {
  return gulp.src(['app/less/*.less'])
    .pipe($.changed('styles', {extension: '.less'}))
    .pipe($.less())
    .pipe($.autoprefixer({browsers: config.AUTOPREFIXER_BROWSERS}))
    .pipe(gulp.dest('dist/css'))
    .pipe($.csso())
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest('dist/css'))
    .pipe($.size({title: 'styles'}));
});

// Build to dist dir.
gulp.task('build:less', function() {
  gulp.src(config.path.less)
    .pipe($.header(banner, {pkg: pkg, ver: ''}))
    .pipe($.less({
      //sourceMap: true,
      paths: [
        path.join(__dirname, 'less')
        //, path.join(__dirname, 'widget/*/src')
      ]
    }))
    
    .pipe($.rename(function(path) {
      //console.log(path);
      if (path.basename === 'amui') {
        path.basename = pkg.name + '.basic';
      }
    }))

    .pipe($.autoprefixer({browsers: config.AUTOPREFIXER_BROWSERS}))
    .pipe($.replace('//dn-amui.qbox.me/font-awesome/4.3.0/', '../'))
    .pipe($.sourcemaps.init())
    .pipe(gulp.dest(config.dist.css))
    .pipe($.size({showFiles: true, title: 'source'}))
    // Disable advanced optimizations - selector & property merging, etc.
    // for Issue #19 https://github.com/allmobilize/amazeui/issues/19
    .pipe($.minifyCss({noAdvanced: true}))
    .pipe($.rename({
      suffix: '.min',
      extname: '.css'
    }))
    //TODO: 调试模式多个 map 就好了，但生产环境不用要
    //.pipe(sourcemaps.write())
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(config.dist.css))
    .pipe($.size({showFiles: true, title: 'minified'}))
    .pipe($.size({showFiles: true, gzip: true, title: 'gzipped'}));
});

gulp.task('build:fonts', function() {
  gulp.src(config.path.fonts)
    .pipe(gulp.dest(config.dist.fonts));
});

// 打包 Common JS 模块
var bundleInit = function() {
  var b = watchify(browserify({
    entries: 'app/js/main.js',
    basedir: __dirname,
    cache: {},
    packageCache: {}
  }));

  // 如果你想把 jQuery 打包进去，注销掉下面一行
  b.transform('browserify-shim', {global: true});

  b.on('update', function() {
    bundle(b);
  }).on('log', $.util.log);

  bundle(b);
};

var bundle = function(b) {
  return b.bundle()
    .on('error', $.util.log.bind($.util, 'Browserify Error'))
    .pipe(source('main.js'))
    .pipe(buffer())
    .pipe(gulp.dest('dist/js'))
    .pipe($.uglify())
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest('dist/js'));
};

gulp.task('browserify', bundleInit);

gulp.task('build:js:browserify', bundleInit);

gulp.task('build:js:fuckie', function() {
  return gulp.src('vendor/polyfill/*.js')
    .pipe($.concat('amazeui.ie8polyfill.js'))
    .pipe($.header(banner, {pkg: pkg, ver: ' ~ IE8 Fucker'}))
    .pipe(gulp.dest(config.dist.js))
    .pipe($.uglify(config.uglify))
    .pipe($.header(banner, {pkg: pkg, ver: ' ~ IE8 Fucker'}))
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest(config.dist.js))
    .pipe($.size({showFiles: true, title: 'minified'}))
    .pipe($.size({showFiles: true, gzip: true, title: 'gzipped'}));
});

gulp.task('build:js:helper', function() {
  gulp.src(config.path.hbsHelper)
    .pipe($.concat(pkg.name + '.widgets.helper.js'))
    .pipe($.header(banner, {pkg: pkg, ver: ' ~ Handlebars helper'}))
    .pipe(gulp.dest(config.dist.js))
    .pipe($.uglify())
    .pipe($.header(banner, {pkg: pkg, ver: ' ~ Handlebars helper'}))
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest(config.dist.js));
});

gulp.task('build:js', function(cb) {
  runSequence(
    ['build:js:browserify', 'build:js:fuckie'],
    ['build:js:helper'],
    cb);
});

gulp.task('build', function(cb) {
  runSequence(
    'build:preparing',
    'build:clean',
    ['build:less', 'build:fonts', 'build:js'],
    cb);
});

// 压缩 HTML
gulp.task('html', function() {
  return gulp.src('app/**/*.html')
    // Minify Any HTML
    .pipe($.minifyHtml())
    // Output Files
    .pipe(gulp.dest('dist'))
    .pipe($.size({title: 'html'}));
});

// 洗刷刷
gulp.task('clean', function(cb) {
  del([
    'dist/*',
    '!dist/.git'
    ], {dot: true}, cb);
});

gulp.task('build:clean', function(cb) {
  del([
    config.dist.css,
    config.dist.js
  ], cb);
});

// 监视源文件变化自动cd编译
gulp.task('watch', function() {
  gulp.watch('app/**/*.html', ['html']);
  gulp.watch('app/less/**/*less', ['styles']);
  gulp.watch('app/i/**/*', ['images']);
  // 使用 watchify，不再需要使用 gulp 监视 JS 变化
  // gulp.watch('app/js/**/*', ['browserify']);
});

// 启动预览服务，并监视 Dist 目录变化自动刷新浏览器
gulp.task('serve', ['default'], function() {
  browserSync({
    notify: false,
    open: "external", //local
    // Customize the BrowserSync console logging prefix
    logPrefix: 'ASK',
    server: {
      baseDir: "dist",
      //下面这里没法传入正则或变量，郁闷啊
      routes: {
          '/aaa/': 'dist'
      },
      //通过下面的方法，先简单地处理下
      middleware: function (req, res, next) {
          // console.log("===============================================");
          // console.log(req.url)
          // 针对图片以及 js css 等静态资源做非过滤处理，这样考虑的问题太多了
          // 各种 ajax 静态资源等，都被过滤中
          if( !/\.(js|css|jpg|gif|png|bmp)/i.test(req.url) ){
            req.url = '/';
          }
          next();
      }
    }
  });

  gulp.watch(['dist/**/*'], reload);
});


// 默认任务
gulp.task('default', function(cb) {
  runSequence('clean', ['styles', 'jshint', 'html', 'images', 'copy', 'browserify'], 'watch', cb);
});


require('./tools/tasks/');

// Preview server.
gulp.task('app', function(callback) {
  $.nodemon({
    script: 'tools/site/app.js',
    env: {
      NODE_ENV: 'development'
    },
    stdout: false
  }).on('readable', function() {
    this.stdout
      .pipe(bistre({time: true}))
      .pipe(process.stdout);
    this.stderr
      .pipe(bistre({time: true}))
      .pipe(process.stderr);
  });
  callback();
});

// Preview server.
/*
// 静态服务器
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });
});

// 代理

gulp.task('browser-sync', function() {
    browserSync.init({
        proxy: "你的域名或IP"
    });
});
*/
gulp.task('site', function(callback) {

  $.nodemon({
    script: 'tools/site/app.js',
    env: {
      NODE_ENV: 'development'
    },
    stdout: false
  }).on('readable', function() {
    this.stdout
      .pipe(bistre({time: true}))
      .pipe(process.stdout);
    this.stderr
      .pipe(bistre({time: true}))
      .pipe(process.stderr);
  });
  // browserSync({
  //   notify: false,
  //   // Customize the BrowserSync console logging prefix
  //   logPrefix: 'ASK',
  //   server: 'dist/docs/' + version
  // });
  // Browsersync.init({
  //   proxy: "10.0.0.119:3010"
  // });
  callback();
});

gulp.task('hbs', function(callback) {
  $.nodemon({
    script: 'tools/hbs/app.js',
    env: {
      NODE_ENV: 'development'
    },
    stdout: false
  }).on('readable', function() {
    this.stdout
      .pipe(bistre({time: true}))
      .pipe(process.stdout);
    this.stderr
      .pipe(bistre({time: true}))
      .pipe(process.stderr);
  });
  callback();
});
gulp.task('hbs:html', function(callback) {
  $.nodemon({
    script: 'tools/hbs/apphtml.js',
    env: {
      NODE_ENV: 'development'
    },
    stdout: false
  }).on('readable', function() {
    this.stdout
      .pipe(bistre({time: true}))
      .pipe(process.stdout);
    this.stderr
      .pipe(bistre({time: true}))
      .pipe(process.stderr);
  });
  callback();
});