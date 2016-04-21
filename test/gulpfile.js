var gulp = require('gulp')
var gulpif = require('gulp-if')
var uglify = require('gulp-uglify')
var cssmin = require('gulp-cssmin')
var crypto = require('crypto')
var usels = require('../index.js')
var prefix = {
        "{{res}}": "../res",
        '//geekie.online': '../res'
}
var manifest = {}
gulp.task('test',function(){
    gulp.src('./src/website/**/*.html')
        .pipe(usels(prefix))
        //.pipe(gulpif('*.js',uglify()))
        //.pipe(gulpif('*.css',cssmin()))
        .pipe(gulp.dest('./dist/website'))
        .pipe(usels.rewrite())
        .pipe(gulp.dest('./dist/website'))
})
