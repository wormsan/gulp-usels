var through2 = require('through2')
var gutil = require('gulp-util')
var path = require('path')
var vfs = require('vinyl-fs')
var rev = require('rev-hash')
var url = require('url')
var parser = require('./lib/parser.js')
var manifest = []

module.exports = function(prefixes,opt){
    opt = opt || {}
    return through2.obj(function(file,enc,cb){
        var revs = {}
        var source = String(file.contents)
        var self = this
        var blocks = parser(file)
        var finishCnt = 0
        var blockPathFix = function(block){
            if(!opt.simpleMode)return
            if(block.commands.path && !block.commands.base){
                for(var key in prefixes){
                    if(block.commands.path.match(key)){
                        block.commands.base = prefixes[key]
                        block.commands.path = block.commands.path.replace(new RegExp(key+'[\/]'),'')
                        return
                    }
                }
            }
        }
        //文件重命名
        var rename = function(p,rev){
            if(p)
                return p.replace(path.extname(p),'.' + rev + path.extname(p))
            else
                return p
        }
        var reGlob = function(newGlob, glob, prefix){
            prefix = prefix || ''
            var globs
            var _dir = function(glob){
                return path.extname(glob) ? path.dirname(glob) : glob
            }
            if(typeof newGlob == 'string'){
                globs = [newGlob]
            }else{
                globs = newGlob
            }
            globs = globs.map(function(glob){
                return _dir(glob)
            })
            globs.push(glob.replace(prefix,''))
            return globs.join('/')
        }
        var genTag = function(type,src){
            if(type == 'js'){
                return '<script type="text/javascript" src="'+src+'"></script>'
            }else if(type == 'css'){
                return '<link rel="stylesheet" href="'+src+'">'
            }
        }
        var genCode = function(type,code){
            if(type == 'js'){
                return '<script type="text/javascript">\r\n'+code+'</script>\r\n'
            }else if(type == 'css'){
                return '<style type="text/css">'+code+'</style>'
            }
        }
        //获取块的数量
        var getBlocksCount = function(blocks,length){
            length = length || 0
            blocks.forEach(function(block){
                length++
                if(block.subBlocks.length>0){
                    length = getBlocksCount(block.subBlocks,length)
                }
            })
            return length
        }
        //解析前缀
        var getPath = function(p){
            for(var key in prefixes){
                if(p.match(new RegExp('^'+key))){
                    return key
                }
            }
            return ''
        }
        var getSrc = function(tag){
            var src = tag.src || tag.href
            //去掉ｓｅａｒｃｈ和ｈａｓｈ
            if(/(\?[\s\S]*$)/.test(src)){
                src = src.replace(RegExp.$1,'')
            }else if(/(\#[\s\S]*$)/.test(src)){
                src = src.replace(RegExp.$1,'')
            }
            return src
        }
        //获取css中的图片地址
        var getImgInCss = function(code){
            var arr = code.match(/url\s*?\(['"]*?[\s\S]*?\.(jpg|jpeg|png|bmp|gif|webp).*?['"]*?\)/gi)
            return arr ? arr.map(function(cssUrl){
                return cssUrl.match(/\(['"]*?([\s\S]*?\.[jpegnbmifw]{3,4}).*?['"]*?\)/)[1]
            }) : null
        }
        //清除前缀
        var clearPath = function(p){
            for(var key in prefixes){
                if(p.match(new RegExp('^'+key))){
                    return p.replace(key,'')
                }
            }
            return p
        }
        //获取网页内的要收集的js和css路径
        var getGlobs = function(block,rootPath){
            if(!block.tags)return []
            return [].concat(block.tags.map(function(tag) {
                var src = getSrc(tag)
                if(path.isAbsolute(src)){
                    src = '.'+src
                }
                return src ? path.resolve(rootPath,parsePath(src)) : ''
            }))
        }
        //在path块内收集js和css路径
        var getGlob = function(rootPath,filePath){
            return path.resolve(rootPath,parsePath(filePath))
        }
        //解析path块
        var parsePath = function(p){
            //if(p.match(/\?.*/)){
            //    p = p.replace(/\?.*/,'')
            //}
            for(var key in prefixes){
                if(p.match(new RegExp('^'+key))){
                    return p.replace(key,prefixes[key])
                }
            }
            return path.isAbsolute(p) ? '.'+p : p
        }
        //解析块，并输出目标文件
        var useref = function(block){
            if(block.subBlocks.length>0){
                block.subBlocks.forEach(function(subBlock){
                    useref(subBlock)
                })
            }
            var globs = getGlobs(block,file.base)
            globs = globs.filter(function(glob,idx){
                if(glob)return true
            })
            var concatBuf = new Buffer('')
            var concatFile = new gutil.File
            vfs.src(globs)
                .pipe(through2.obj(function(file2,enc2,cb2){
                    if(block.commands.file){
                        //css文件里的图片的路径
                        var imgGlobs = originGlobs = getImgInCss(String(file2.contents))
                        if(imgGlobs){
                            var partten = {}
                            var originsPartten = {}
                            imgGlobs = imgGlobs.map(function(glob){
                                var outputGlob = path.resolve(file.base,parsePath(block.commands.file))
                                var outputPath = path.dirname(outputGlob)
                                originsPartten[glob] = path.resolve(outputPath,glob)
                                //绝对路径和相对路径的区别
                                if(path.isAbsolute(glob)){
                                    var result = path.join(file.base,glob)
                                    var a = gutil.replaceExtension(outputGlob,glob)
                                    //求所有css的base
                                    for(var key in prefixes){
                                        if(block.commands.file.match(key)){
                                            var newBase = path.resolve(file.base,parsePath(prefixes[key]))
                                        }
                                    }
                                    partten[result] = {
                                        'src': glob,
                                        'dist': newBase ? path.join(newBase,glob) : path.join(file.base,originsPartten[glob]),
                                    }
                                    return result
                                }else{
                                    var result = path.resolve(path.dirname(file2.path),glob)
                                    partten[result] = {
                                        'src': originsPartten[glob],
                                        'dist': originsPartten[glob]
                                    }
                                    return path.resolve(file2.base,glob)
                                }
                            })
                            if(imgGlobs.length > 0) {
                                vfs.src(imgGlobs)
                                    .pipe(through2.obj(function(file3,enc3,cb3){
                                        file3.base = file.base
                                        var revision = rev(file3.contents)
                                        var source = String(file2.contents)
                                        var originPath = partten[file3.path].dist
                                        //查找自己在ｃｓｓ中的路径ｐａｔｈ
                                        for(var key in originsPartten){
                                            if(originsPartten[key] == partten[file3.path].src){
                                                file2.contents = new Buffer(source.replace(new RegExp(key,'g'),rename(key,revision)))
                                            }
                                        }
                                        //替换版本
                                        file3.path = rename(originPath,revision)
                                        self.push(file3)
                                        cb3()
                                    },function(cb3){
                                        cb3()
                                        var length = concatBuf.length + file2.contents.length
                                        concatBuf = Buffer.concat([concatBuf,file2.contents],length)
                                        cb2()
                                    }))
                            }else{
                                var length = concatBuf.length + file2.contents.length
                                concatBuf = Buffer.concat([concatBuf,file2.contents],length)
                                cb2()
                            }

                        }else{
                            var length = concatBuf.length + file2.contents.length
                            concatBuf = Buffer.concat([concatBuf,file2.contents],length)
                            cb2()
                        }
                    }else{
                        if(block.commands.path){
                            blockPathFix(block)
                            block.tags.forEach(function(tag){
                                var src = getSrc(tag)
                                var glob = getGlob(file.base,src)
                                if(glob == file2.path){
                                    var originGlob = reGlob(block.commands.base+'/'+block.commands.path,clearPath(src),block.commands.ignore)
                                    var parsedGlob = parsePath(originGlob)
                                    var p = path.resolve(file.base,parsedGlob)
                                    var revision = rev(file2.contents)
                                    revs[originGlob] = revision
                                    manifest.push(parsePath(rename(parsedGlob,revision)))
                                    file2.path = rename(p,revision)
                                }
                            })
                        }else if(block.commands.combo){
                            block.tags.forEach(function(tag){
                                var src = getSrc(tag)
                                var glob = getGlob(file.base,src)
                                if(glob == file2.path){
                                    var revision = rev(file2.contents)
                                    revs[src] = revision
                                    file2.path = rename(file2.path,revision)
                                }
                            })
                        }else if(block.commands.inject){
                            block.tags.forEach(function(tag){
                                var src = getSrc(tag)
                                var glob = getGlob(file.base,src)
                                if(glob == file2.path){
                                    revs[src] = file2.contents
                                }
                            })
                        }
                        cb2(null,file2)
                    }
                },function(cb2){
                    if(block.commands.file){
                        //concat
                        var b = path.resolve(file.base)
                        var p = path.resolve(file.base,parsePath(block.commands.file))
                        var revision = rev(concatBuf)
                        revs[block.commands.file] = revision
                        if(block.parent)
                            manifest.push(parsePath(rename(block.commands.file,revision)))
                        concatFile.base = b
                        concatFile.path = rename(p,revision)
                        concatFile.contents = concatBuf
                        self.push(concatFile)
                    }
                    cb2()
                }))
                .pipe(through2.obj(function(file2,enc2,cb2){
                    file2.base = file.base
                    self.push(file2)
                    cb2()
                }))
                .on('finish',function(){
                    finishCnt++
                    if(finishCnt == getBlocksCount(blocks)){
                        replaceBlocks()
                        file.contents = new Buffer(source)
                        cb(null,file)
                    }
                })
        }
        var getCodeBlock = function(block){
            code = block.code
            block.subBlocks.forEach(function(subBlock){
                code = code.replace('<!--THIS_IS_WHERE_SUB_BLOCKS_NEED_TO_BE_REPLACED-->',getCodeBlock(subBlock))
            })
            return code
        }
        var getNewBlock = function(block,code){
            code = code || []
            if(block.commands.file){
                code = code.concat(block.code.replace(block.code,block.commands.file))
            }else if(block.commands.path){
                blockPathFix(block)
                code = code.concat(block.tags.map(function(tag){
                    return reGlob(block.commands.base+'/'+block.commands.path,clearPath(getSrc(tag)),block.commands.ignore)
                }))
            }
            block.subBlocks.forEach(function(subBlock){
                code = getNewBlock(subBlock,code)
            })
            return code
        }
        //根据生成的代码，替换ｈｔｍｌ中的代码块
        var replaceBlocks = function(){
            blocks.forEach(function(block){
                var code = getCodeBlock(block)
                if(block.commands.path){
                    blockPathFix(block)
                    var map = {}
                    getNewBlock(block).forEach(function(item){
                        var key = item.replace(block.commands.base,'').replace(/^\//,'')
                        for(var rev in revs){
                            if(rev.match(key)){
                                map[key] = path.normalize(revs[rev])
                            }
                        }
                    })
                    var newCode ="<script type='text/javascript'>\r\n"
                                +"if(typeof __require__ == 'undefined'){\r\n"
                                +"    var __require__ = {\r\n"
                                +"        requireArray:[],\r\n"
                                +"        config: function(param){\r\n"
                                +"            this.requireArray.push(param)\r\n"
                                +"        }\r\n"
                                +"    }\r\n"
                                +"}\r\n"
                                +"__require__.config({\r\n"
                                +"    baseUrl: '"+ (block.commands.base) + "',\r\n"
                                +"    deps: "+JSON.stringify(map)+",\r\n"
                                +"})"
                                +"</script>\r\n"
                    source = source.replace(code,newCode)
                }else if(block.commands.file){
                    var key = block.commands.file
                    for(var rev in revs){
                        if(rev.match(key)){
                            source = source.replace(code,genTag(block.commands.compile,rename(key,revs[rev])))
                        }
                    }
                }else if(block.commands.combo){
                    var combo = block.commands.base+'/??'
                    block.tags.forEach(function(tag,idx){
                        if(revs[getSrc(tag)]){
                            var src = rename(getSrc(tag),revs[getSrc(tag)])
                            if(typeof block.commands.combo === 'string'){
                                src = src.replace(new RegExp(block.commands.combo + '[\/]'),'')
                            }
                            combo += src + (idx < block.tags.length-1 ? ',' : '')
                        }
                    })
                    source = source.replace(code,genTag(block.commands.compile,combo))
                }else if(block.commands.inject){
                    var injectCode = ''
                    block.tags.forEach(function(tag){
                        if(revs[getSrc(tag)]){
                            injectCode += genCode(block.commands.compile,String(revs[getSrc(tag)]))
                        }
                    })
                    source = source.replace(code,injectCode)
                }
            })
        }
        blocks.forEach(function(block){
            useref(block)
        })
        if(blocks.length == 0){
            cb()
        }
    })
}
module.exports.inject = function(){
    return through2.obj(function(file,enc,cb){
        //TODO inject分离?
        cb(null,file)
    })
}
module.exports.rewrite = function(){
    return through2.obj(function(file,enc,cb){
        manifest.forEach(function(p){
            var glob = path.resolve(file.base,p)
            if(glob == file.path){
                var source = String(file.contents)
                source = ['!function(){'
                         ,'    if(lsrequire){'
                         ,'        var content = {"code": ' + JSON.stringify(source)
                                              + ',"filename":'+JSON.stringify(path.basename(file.path).replace(/\.[0-9a-z]{10}.*$/,''))+'}'
                         ,'        lsrequire.inject(content)'
                         ,'    }'
                         ,'}();'].join('\r\n')
                file.contents = new Buffer(source)
            }
        })
        cb(null,file)
    })
}
