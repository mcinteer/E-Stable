var gulp = require('gulp'),
    watch = require('gulp-watch'),
    sass = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    streamqueue = require('streamqueue'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    rename = require('gulp-rename'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    cache = require('gulp-cache');


gulp.task('styles', function () {
      return gulp.src('src/sass/**/*.scss')
    .pipe(sass({ style: 'expanded' }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(gulp.dest('dist/css'))
    .pipe(rename({suffix: '.min'}))
    .pipe(minifycss())
    .pipe(gulp.dest('dist/css'))
    //.pipe(notify({ message: 'Styles task complete' }));
});

gulp.task('scripts', function () {
    var stream = streamqueue({ objectMode: true });

//    stream.queue(Fs.createReadStream('jquery.min.js



    stream.queue(gulp.src([ 'src/js/vendor/jquery.min.js',
                            'src/js/vendor/bootstrap.js',
                            'src/js/vendor/bootstrap-editable.js',
                            'src/js/vendor/jquery.dynatable.js',
                            'src/js/Wizard/**/*.js']));


  return stream.done()
    .pipe(concat('EstableBase.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'))
    //.pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('clean', function() {
  return gulp.src(['dist/css', 'dist/js'], {read: false})
    .pipe(clean());
});


gulp.task('default', ['clean'], function() {
    gulp.start('styles', 'scripts');
});


// Watch
gulp.task('watch', function () {
    var cssWatcher = gulp.watch(['src/sass/**/*.scss'], ['styles']);
    cssWatcher.on('change', function(event) {
        console.log(event.type, event.path);
    });

    var jsWatcher = gulp.watch(['src/js/**/*.js'], ['scripts']);
    jsWatcher.on('change', function(event) {
        console.log(event.type, event.path);
    });
 });