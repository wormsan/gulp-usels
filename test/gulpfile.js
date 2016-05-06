var gulp = require('gulp')
//var gulpif = require('gulp-if')
//var uglify = require('gulp-uglify')
//var cssmin = require('gulp-cssmin')
var usels = require('../index.js')
var prefix = {
        "{{res}}": "../res",
        '{JS_CDN_IP}': '../res/js',
        '//blog.geekie.online': '../res',
        '{GOMEUI_CDN_IP}': '../res/gomeUI'
}
gulp.task('test',function(){
    gulp.src(['./src/website/**/test-path.html','./src/website/**/test-path2.html'])
        .pipe(usels(prefix,{
            simpleMode: true,
            usevm: true,
            vm:{
                pre: '{',
                post: '}'
            }
        }))
        //.pipe(gulpif('*.js',uglify()))
        //.pipe(gulpif('*.css',cssmin()))
        .pipe(gulp.dest('./dist/website'))
        .pipe(usels.rewrite())
        .pipe(gulp.dest('./dist/website'))
        .pipe(usels.vm())
        .pipe(gulp.dest('./dist/website/version_map'))
})
