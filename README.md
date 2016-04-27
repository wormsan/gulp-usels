# still on developing =.=

# Zzz...

# gulp-usels

A front-end build system that use localstorage to cache res

## gulp-usels是什么？

gulp-usels(gulp-use-localstorage)是一个前端构建工具，类似于[gulp-useref](https://github.com/jonkemp/gulp-useref)
同[lsrequire.js](#)结合使用，可以做到基于localstorage的缓存

## gulp-usels能做什么？

* 通过特点语法解析页面中`js`、`css`的引用
* 将引用的`js`、`css`进行合并、注入
* 自带版本控制，基于md5文件重命名，缓存控制更科学，更简单
* 结合lsrequire.js，可以做到用localstorage本地缓存js甚至css文件，提高缓存命中率，节省浏览，极大减少请求数

## gulp-usels怎么用？
```javascript
var gulp = require('gulp')
var gulpif = require('gulp-if')
var uglify = require('gulp-uglify')
var cssmin = require('gulp-cssmin')
var usels = require('gulp-usels')
var prefix = {
        "{{res}}": "../res",
        '//geekie.online': '../res'
}
gulp.task('test',function(){
    gulp.src('./src/website/**/*.html')
        .pipe(usels(prefix))
        //.pipe(gulpif('*.js',uglify()))
        //.pipe(gulpif('*.css',cssmin()))
        .pipe(gulp.dest('./dist/website'))
        .pipe(usels.rewrite())
        .pipe(gulp.dest('./dist/website'))
})
```
## API

### usels(prefix)

```javascript
var usels = require('gulp-usels')
var prefix = {
        "{{res}}": "../res",
        '//geekie.online': '../res'
}
gulp.task('test',function(){
    gulp.src('./src/website/**/*.html')
        .pipe(usels(prefix))
        //stream流过的时候，通过gulpif判断类型
        //可以做压缩处理
        //.pipe(gulpif('*.js',uglify()))
        //.pipe(gulpif('*.css',cssmin()))
        .pipe(gulp.dest('./dist/website'))
        //如果用到了@path模式，需要重写path中的引用文件
        //以适配lsrequire.js
        .pipe(usels.rewrite())
        .pipe(gulp.dest('./dist/website'))
})
```
### prefix

`prefix`是一个`key-value`对象，用来对路径中的全局变量，域名等特殊字符做处理

`key`为路径中要替换的文本
`value`为相对于`gulp`构建时`base`的实际路径


## gulp-usels语法说明

### 说明

`[]`，表示变量

### 解析标识块

```
<!--@start-->
<!--@end-->
```

在`<!--@start-->`和`<!--@end-->`中的内容，会被gulp-usels解析

### 编译目标语言

```
<!--@compile:[param]-->
```

表示代码块内的内容，是那种语言，`[param]`可以是`js`或`css`

### 合并文件

```
<!--@file:[path]-->
```

代码块内的引用文件，会合并为`[path]`的指定文件

例子

```html
<!--@start-->
<!--@compile: js-->
<!--@file: /static/js/concat.js-->
<script src="/static/js/file1.js"></script>
<script src="/static/js/file2.js"></script>
<script src="/static/js/file3.js"></script>
<!--@end-->
```

编译后输出为
```html
<script src="/static/js/concat.[md5].js"></script>
```

### 注入文件

```
<!--@inject: true-->
```
代码块内的引用文件，会合并并注入到html中


### path模式(适配lsrequire.js)
