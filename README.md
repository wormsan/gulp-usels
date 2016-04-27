# gulp-usels

A front-end build system that use localstorage to cache res

## gulp-usels是什么？

gulp-usels(gulp-use-localstorage)是一个前端构建工具，类似于[gulp-useref](https://github.com/jonkemp/gulp-useref)，
可以同[lsrequire.js](#)结合使用，从而做到基于localstorage的缓存

## gulp-usels能做什么？

* 通过特点语法解析页面中`js`、`css`的引用
* 将引用的`js`、`css`进行合并、注入
* 自带版本控制，基于md5文件重命名，缓存控制更科学，更简单
* 结合lsrequire.js，可以做到用localstorage本地缓存js甚至css文件，提高缓存命中率，节省浏览，极大减少请求数
* 基于gulp，RPY，自由搭配各种工具如uglifyjs、cssmin、imagemin等等

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

比如有些文件在开发时并不是都放在web站点的根目录下，例如cdn，那么可以自定义前缀，让gulp-usels在编译时将此类特殊变量（如域名，后台模板的变量）转义成指定目录。


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
<!--@file:[file]-->
```

代码块内的引用文件，会合并为`[file]`的指定文件

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

```
<!--@base: [base]-->
<!--@ignore: [path to ignore]-->
<!--@path: [path]-->
```
例子

**源码**
```html
<!--@start-->
<!--@compile: js-->
<!--@base: //blog.geekie.online-->
<!--@ignore: /static/js/-->
<!--@path: js-->
<script type="text/javascript" src="/static/js/test-path/test-path-1.js"></script>
<script type="text/javascript" src="/static/js/test-path/test-path-2.js"></script>
<script type="text/javascript" src="/static/js/test-path/test-path-3.js"></script>
    <!--@start-->
    <!--@compile: js-->
    <!--@file: //blog.geekie.online/js/test-path-file-combo.js-->
    <script type="text/javascript" src="{{res}}/js/test-path/test-path-file-1.js"></script>
    <script type="text/javascript" src="{{res}}/js/test-path/test-path-file-2.js"></script>
    <!--@end-->
<!--@end-->
```

**输出后**
```html
<script type='text/javascript'>
if(typeof __require__ == 'undefined'){
    var __require__ = {
        requireArray:[],
        config: function(param){
            this.requireArray.push(param)
        }
    }
}
__require__.config({
    baseUrl: '//blog.geekie.online',
    deps: {"js/test-path/test-path-1.js":"11a942de37","js/test-path/test-path-2.js":"6a371c9354","js/test-path/test-path-3.js":"60d8df8802","js/test-path-file-combo.js":"3bc8b5d5ec"},
})
</script>
```

代码块内的文件，输出到path的指定路径

#### @base

path块中，包裹的js或css将会输出到指定路径的根目录

`@base`可以匹配`prefix`中的规则，输出到指定路径

### @path

path块中，包裹的js或css将会输出到从`@base`指定的根目录出发的 **相对路径**

举例
`prefix: { "//blog.geekie.online": "[glob]" }`

`@base: //blog.geekie.online`

`@path: js/foojs/`

此时，文件将输出到`[glob]/js`中

#### @ignore

`@path`中的src的路径将会被忽略的部分
举例
`@ignore: /static`，那么`@path`中的src如 `src="/static/js/foo.js"`在编译时将会忽略`/static`

结合之前的例子，那么脚本将会被输出到 `[glob]/js/foojs/js/foo.js`

#### 嵌套

`@path`中可以嵌套`@path`和`@file`

#　路线图

* 支持amd规范（有可能会支持cmd、commonjs规范）
* 支持prefix配置绝对路径（目前还只支持相对于`gulp.dist`目录的相对路径）
* ...
