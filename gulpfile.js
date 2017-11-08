'use-strict';
// requires
var gulp = require('gulp'),
    del = require('del'),
    data = require('gulp-data'),
    mergeJson = require('gulp-merge-json'),
    path = require('path'),
    fs = require('fs'),
    sass = require('gulp-sass'),
    sassGlob = require('gulp-sass-glob'),
    autoprefixer = require('autoprefixer'),
    csscomb = require('postcss-csscomb'),
    flexbugs = require('postcss-flexbugs-fixes'),
    base64 = require('gulp-base64'),
    combineMq = require('gulp-combine-mq'),
    concat = require('gulp-concat'),
    size = require('gulp-size'),
    jade = require('gulp-jade'),
    jadeInheritance = require('gulp-jade-inheritance'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    pugLinter = require('gulp-pug-linter'),
    changed = require('gulp-changed'),
    favicons    = require('gulp-favicons'),
    cached = require('gulp-cached'),
    gulpif = require('gulp-if'),
    postcss = require('gulp-postcss'),
    scsslint = require('gulp-scss-lint'),
    plumber = require('gulp-plumber'),
    filter = require('gulp-filter'),
    print = require('gulp-print'),
    runSequence = require('run-sequence'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    spritesmith = require('gulp.spritesmith'),
    mergeStream = require('merge-stream'),
    vinylBuffer = require('vinyl-buffer'),
    svgmin = require('gulp-svgmin'),
    svgstore = require('gulp-svgstore'),
    browserSync = require('browser-sync'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    debug = require('gulp-debug'),
    connectHistoryApiFallback = require('connect-history-api-fallback'),
    reload = browserSync.reload;

const $ = require('gulp-load-plugins')({
  pattern: ['*'],
  scope: ['devDependencies']
});

const onError = (err) => {
  console.log(err);
};

// configuration
const paths = {
  source: 'source',
  css: 'source/assets/css',
  scss: 'source/assets/scss',
  js: 'source/assets/js',
  img: 'source/assets/images',
  imgBase64: 'source/assets/images/base64',
  spritesPng: 'source/assets/images/sprites/png',
  spritesSvg: 'source/assets/images/sprites/svg',
  fonts: ['source/assets/fonts/**/*', './node_modules/slick-carousel/slick/fonts/*'],
  content: 'source/content'
};

const watch = {
  jade: paths.source + '/**/*.jade',
  css: paths.css + '/**/*.css',
  scss: paths.scss + '/**/*.scss',
  js: paths.js + '/**/*.js',
  img: [paths.img + '/**/*.*', '!' + paths.img + '/sprites/**/*.*'],
  content: [paths.content + '/**/*.*', paths.content + '/**/.*'],
  svgSprite: paths.spritesSvg + '/*.svg',
  pngSprite: [paths.spritesPng + '/*.png', path.scss + '/_sprites.hbs']
};

const dest = {
  source: 'html',
  css: 'html/assets/css',
  scss: 'html/assets/css',
  js: 'html/assets/js',
  img: 'html/assets/images',
  fonts: 'html/assets/fonts',
  content: 'html/content'
};

const devBuild = true;
const spa = false;

// browser sync

gulp.task('browser-sync', () => {
  let middleware = [];

  if (spa) {
    middleware.push(connectHistoryApiFallback());
  }

  browserSync
    .create()
    .init({
      notify: false,
      open: false,
      // open: 'external'
      online: false,
      // https: true,
      // online: true,
      files: [
        dest.source + '/**/*',
      ],
      server: {
        baseDir: dest.source,
        middleware,
        serveStaticOptions: {
          extensions: []
        }
      }
    });
});

// Sprite img
gulp.task('pngSprite', function generateSpritesheets () {
  const spriteData = gulp.src(paths.spritesPng + '/*.png')
    .pipe($.plumber({ errorHandler: onError }))
    .pipe($.spritesmith({
      cssName: '_sprites.scss',
      cssTemplate: 'source/assets/scss/_sprites.hbs',
      imgName: 'sprites.png',
      retinaImgName: 'sprites_2x.png',
      retinaSrcFilter: paths.spritesPng + '/*_2x.png',
      padding: 2
    }));

  return $.mergeStream(
    spriteData.img
      .pipe($.plumber({ errorHandler: onError }))
      .pipe($.vinylBuffer())
      .pipe(imagemin())
      .pipe(gulp.dest(dest.img)),
    spriteData.css
      .pipe(gulp.dest(paths.scss))
  )
});

// Sprite svg

gulp.task('svgSprite', function () {
  return gulp.src(paths.spritesSvg + '/*.svg')
    .pipe($.plumber({ errorHandler: onError }))
    .pipe($.svgmin({
      js2svg: { pretty: true },
      plugins: [{ cleanupIDs: false }]
    }))
    .pipe($.svgstore())
    .pipe(gulpif(!devBuild, $.replace('?><!', '?>\n<!')))
    .pipe(gulpif(!devBuild, $.replace('><svg', '>\n<svg')))
    .pipe(gulpif(!devBuild, $.replace('><symbol', '>\n<symbol')))
    .pipe(gulpif(!devBuild, $.replace('></svg', '>\n</svg')))
    .pipe(rename('sprites.svg'))
    .pipe(gulp.dest(dest.img));
});

// styles

gulp.task('scss', () => {
  var plugins = [
    autoprefixer({add: true, browsers: ['> 0%']}),
    flexbugs(),
    csscomb('zen')
  ];
  $.fancyLog("-> Compiling scss");
  return gulp.src([paths.scss + '/*.scss', '!' + paths.scss + '/_*.scss'])
    // .pipe(scsslint({'config': '.scss-lint.yml'}))
    .pipe($.plumber({ errorHandler: onError }))
    .pipe(gulpif(devBuild, $.sourcemaps.init({loadMaps: true})))
    .pipe(sassGlob())
    .pipe(sass().on("error", sass.logError))
    // .pipe(sass.sync().on('error', sass.logError))
    .pipe(base64({
      baseDir: paths.imgBase64,
      extensions: [/#datauri/i]
    }))
    .pipe($.cached("sass_compile"))
    .pipe(gulpif(!devBuild, combineMq({ beautify: true })))
    .pipe(gulpif(!devBuild, postcss(plugins)))
    .pipe(gulpif(devBuild, $.sourcemaps.write('./')))
    .pipe($.size({title: 'CSS'}))
    .pipe(gulp.dest(dest.scss))
    .pipe(reload({stream: true}));
});

gulp.task('css', ['scss'], () => {
  $.fancyLog("-> Building css");
  return gulp.src([paths.css+'/**/*.css', dest.css+'/**/*.css'])
    .pipe($.plumber({errorHandler: onError}))
    .pipe($.newer({dest: dest.css + 'main.css'}))
    .pipe($.print())
    .pipe(gulpif(devBuild, $.sourcemaps.init({loadMaps: true})))
    // .pipe($.cssnano({
    //   discardComments: {
    //       removeAll: true
    //   },
    //   discardDuplicates: true,
    //   discardEmpty: true,
    //   minifyFontValues: true,
    //   minifySelectors: true
    // }))
    .pipe(gulpif(devBuild, $.sourcemaps.write('./')))
    .pipe(gulp.dest(dest.css))
    .pipe($.filter("**/*.css"))
    .pipe(reload({stream: true}));
});

// html

gulp.task('html', () => {
  return gulp.src(paths.source+'/*.html')
    .pipe(gulp.dest(dest.source))
    .pipe();
});

// jade

gulp.task('jade:data', () => {
  return gulp.src([
      './source/pages/**/*.json',
      './source/blocks/Widgets/**/*.json'
    ])
    .pipe($.mergeJson({
      fileName: 'data.json',
      edit: (json, file) => {
        let filename = path.basename(file.path),
            primaryKey = filename.replace(path.extname(filename), '');
        let data = {};
            data[primaryKey.toUpperCase()] = json;

        return data;
      },
    }))
    .pipe(gulp.dest('./temp'));
});

gulp.task('jade', ['jade:data'], () => {
  return gulp.src(paths.source+'/**/*.jade')
    .pipe($.plumber({ errorHandler: onError }))
    .pipe(changed(dest.source, {extension: '.html'}))
    .pipe(gulpif(global.isWatching, $.cached('jade')))
    .pipe(jadeInheritance({basedir: paths.source, extension: '.jade', skip: 'node_modules', saveInTempFile: true}))
    .pipe($.filter((file) => {
      return /source[\\\/]pages/.test(file.path);
    }))
    .pipe(debug({title: 'debug-after-filter'}))
    .pipe(data((file) => {
      try {
        return JSON.parse(fs.readFileSync('./temp/data.json'))
      } catch (err) {
        return;
      }
    }))
    .pipe(jade({
      pretty: true,
      basedir: './'
    }))
    .pipe(rename({dirname: '.'}))
    .pipe(gulp.dest(dest.source))
    .on('end', browserSync.reload);
});

gulp.task('jade:linter', () => {
  return gulp.src(paths.source+'/**/*.jade')
    .pipe(pugLinter())
    .pipe(pugLinter.reporter('fail'))
});

// images

gulp.task('img', () => {
  return gulp.src([paths.img + '/**/*.*', '!' + paths.img + '/sprites/**/*.*', '!' + paths.imgBase64 + '/**/*.*'])
    .pipe(changed(dest.img))
    .pipe($.newer(dest.img))
    .pipe(gulpif(!devBuild, imagemin({
        progressive: true,
        interlaced: true,
        optimizationLevel: 3,
        svgoPlugins: [
          {removeViewBox: false},
          {removeUselessStrokeAndFill: false},
          {cleanupIDs: false}
        ],
        verbose: true,
        use: [pngquant()]
    })))
    .pipe(gulp.dest(dest.img));
});

// vendor-js

gulp.task('vendorjs', () => {
  return gulp.src([
      paths.js+"/vendor/*.js",
      './node_modules/jquery/dist/jquery.js',
      './node_modules/slick-carousel/slick/slick.js',
      './node_modules/svg4everybody/dist/svg4everybody.js'
    ])
    .pipe(gulp.dest(dest.js+"/vendor/"))
    .pipe(reload({stream: true}));
});

// js

gulp.task('userjs', () => {
  $.fancyLog("-> Transpiling Javascript via Babel...");
  return gulp.src(paths.js + '/*.js')
    .pipe($.plumber({errorHandler: onError}))
    .pipe($.newer({dest: dest.js}))
    .pipe($.babel({
      presets: [
        'es2015'
      ],
    }))
    .pipe($.jsbeautifier({
      js: {
        indent_with_tabs: true,
        end_with_newline: true,
        max_preserve_newlines: 2,
      },
    }))
    .pipe(gulpif(devBuild, $.sourcemaps.init({loadMaps: true})))
    .pipe(gulpif(devBuild, $.sourcemaps.write('./')))
    // .pipe($.size({gzip: true, showFiles: true})) // compress js
    .pipe(gulp.dest(dest.js))
    .pipe(reload({stream: true}));
});

// content
gulp.task('contents', () => {
  $.fancyLog("-> Copy content ...");
  return gulp.src([paths.content + '/**/*.*', paths.content + '/**/.*'])
    .pipe(changed(dest.content))
    .pipe(gulp.dest(dest.content))
    .pipe(reload({stream: true}));
});

// favicons-generate
gulp.task("favicons-generate", () => {
  $.fancyLog("-> Generating favicons");
  return gulp.src(paths.img + "/favicon.png")
    .pipe($.favicons({
      appName: "start-template",
      appDescription: "start-template",
      developerName: "",
      developerURL: "",
      background: "#FFFFFF",
      path: paths.img,
      url: "",
      display: "standalone",
      orientation: "portrait",
      version: "1.0.0",
      logging: false,
      online: false,
      html: dest.source + "/favicons.html",
      pipeHTML: true,
      replace: true,
      icons: {
          android: false, // Create Android homescreen icon. `boolean`
          appleIcon: false, // Create Apple touch icons. `boolean`
          appleStartup: false, // Create Apple startup images. `boolean`
          coast: false, // Create Opera Coast icon. `boolean`
          favicons: true, // Create regular favicons. `boolean`
          firefox: false, // Create Firefox OS icons. `boolean`
          opengraph: false, // Create Facebook OpenGraph image. `boolean`
          twitter: false, // Create Twitter Summary Card image. `boolean`
          windows: false, // Create Windows 8 tile icons. `boolean`
          yandex: false // Create Yandex browser icon. `boolean`
      }
    }))
    .pipe(gulp.dest(dest.img));
});

// copy favicons
gulp.task("favicons", ["favicons-generate"], () => {
  $.fancyLog("-> Copying favicon.ico");
  return gulp.src(dest.img + "/favicon.*")
      .pipe($.size({gzip: true, showFiles: true}))
      .pipe(gulp.dest(dest.source));
});

// fonts
gulp.task('fonts', () => {
  $.fancyLog("-> Copy fonts");
  return gulp.src(paths.fonts)
    .pipe(gulp.dest(dest.fonts));
});

// clean

gulp.task('clean', () => {
  $.fancyLog("-> Clean html");
  return del([
    dest.source
  ]);
});

// watch

gulp.task('setWatch', () => {
  global.isWatching = true;
});

gulp.task('watch', ['setWatch', 'browser-sync'], () => {
  gulp.watch(watch.content, ['contents']);
  gulp.watch(watch.img, ['img']);
  gulp.watch(watch.svgSprite, ['svgSprite']);
  gulp.watch(watch.pngSprite, ['pngSprite']);
  gulp.watch(paths.js + '/vendor/*.js', ['vendorjs']);
  gulp.watch(paths.js + '/*.js', ['userjs']);
  gulp.watch(watch.jade, ['jade']);
  gulp.watch(watch.css, ['css']);
  gulp.watch(watch.scss, ['scss']);
  gulp.watch(watch.fonts, ['fonts']);
});

// build

gulp.task('build', ['clean'], () => {
  $.runSequence(
    'img', 'pngSprite', 'svgSprite', /*'favicons',*/
    ['css', 'scss', 'jade', 'jade:linter', 'contents', 'fonts', 'vendorjs', 'userjs'],
    'watch', () => {}
  );
});

// default

gulp.task('default', ['build']);

// deploy

gulp.task('deploy', ['clean'], () => {
  devBuild = false;
  $.runSequence(
    'img', 'pngSprite', 'svgSprite', /*'favicons',*/
    ['css', 'scss', 'jade', 'contents', 'fonts', 'vendorjs', 'userjs']
  );
});