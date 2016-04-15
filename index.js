var through2 = require('through2')
var gutil = require('gulp-util')
var path = require('path')
var vfs = require('vinyl-fs')
var rev = require('rev-hash')
var parser = require('./lib/parser.js')

var codeMaps = []
var manifest = {}
var rename = function(p,rev){
    if(p)
        return p.replace(path.extname(p),'.' + rev + path.extname(p))
    else
        return p
}
module.exports = function(prefixes){
    return through2.obj(function(file,enc,cb){
        var revs = {}
        var source = String(file.contents)
        var self = this
        var blocks = parser(file)
        var finishCnt = 0
        var genTag = function(type,src){
            if(type == 'js'){
                return '<script src="'+src+'"></script>'
            }else if(type == 'css'){
                return '<link ref="stylesheet" href="'+src+'">'
            }
        }
        var getBlocksLength = function(blocks,length){
            length = length || 0
            blocks.forEach(function(block){
                length++
                if(block.subBlocks.length>0){
                    length = getBlocksLength(block.subBlocks,length)
                }
            })
            return length
        }

        var getPath = function(p){
            for(var key in prefixes){
                if(p.match(new RegExp('^'+key))){
                    return key
                }
            }
            return ''
        }
        var clearPath = function(p){
            for(var key in prefixes){
                if(p.match(new RegExp('^'+key))){
                    return p.replace(key,'')
                }
            }
            return p
        }
        var getGlobs = function(block,rootPath,arr){
            return arr.concat(block.tags.map(function(tag) {
                var src = tag.src || tag.href
                return src ? path.resolve(rootPath,parsePath(src)) : ''
            }))
        }
        var getGlob = function(rootPath,filePath){
            return path.resolve(rootPath,parsePath(filePath))
        }
        var parsePath = function(p){
            if(p.match(/\?.*/)){
                p = p.replace(/\?.*/,'')
            }
            for(var key in prefixes){
                if(p.match(new RegExp('^'+key))){
                    return p.replace(key,prefixes[key])
                }
            }
            return p
        }
        var useref = function(block){
            if(block.subBlocks.length>0){
                block.subBlocks.forEach(function(subBlock){
                    useref(subBlock)
                })
            }
            var globs = getGlobs(block,file.base,[])
            globs = globs.filter(function(glob,idx){
                if(glob)return true
            })
            var concatBuf = new Buffer('')
            var concatFile = new gutil.File
            vfs.src(globs)
                .pipe(through2.obj(function(file2,enc2,cb2){
                    if(block.commands.file){
                        var length = concatBuf.length + file2.contents.length
                        concatBuf = Buffer.concat([concatBuf,file2.contents],length)
                        cb2()
                    }else{
                        if(block.commands.path){
                            block.tags.forEach(function(tag){
                                var glob = getGlob(file.base,tag.src)
                                if(glob == file2.path){
                                    var newPath = parsePath(path.join(block.commands.path,clearPath(tag.src)))
                                    var p = path.resolve(file.base,newPath)
                                    var revision = rev(file2.contents)
                                    revs[p] = revision
                                    file2.path = rename(p,revision)
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
                    if(finishCnt == getBlocksLength(blocks)){
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
            block.subBlocks.forEach(function(subBlock){
                code = getNewBlock(subBlock,code)
            })
            if(block.commands.file){
                return code.concat(block.code.replace(block.code,block.commands.file))
            }else if(block.commands.path){
                return code.concat(block.tags.map(function(tag){
                    var src = path.join(block.commands.path,clearPath(tag.src))
                    var ext = path.extname(tag.src).replace('.','')
                    return src
                }))
            }
            return code
        }
        var replaceBlocks = function(){
            blocks.forEach(function(block){
                var code = getCodeBlock(block)
                if(block.commands.path){
                    var newBlock = getNewBlock(block)
                    newBlock = newBlock.reverse()
                    var map = {}
                    newBlock.forEach(function(item){
                        var key = item.replace(block.commands.base,'').replace(/^\//,'')
                        for(var rev in revs){
                            if(rev.match(key)){
                                map[key] = revs[rev]
                            }
                        }
                    })
                    var newCode = "var __require__ = {\r\n"
                                + "                      baseUrl:'"+ (block.commands.base) + "',\r\n" //only for gome'
                                + "                      deps: "+JSON.stringify(map)+",\r\n"
                                + "                  }\r\n"
                    source = source.replace(code,newCode)
                }else if(block.commands.file){
                    var key = block.commands.file
                    for(var rev in revs){
                        if(rev.match(key)){
                            source = source.replace(code,genTag(block.commands.compile,rename(key,revs[rev])))
                        }
                    }
                }
            })
        }
        blocks.forEach(function(block){
            useref(block)
        })
        if(blocks.length == 0){
            cb()
        }
    },function(cb){
        /*var file = new gutil.File
        file.path ='uself-manifest.json'
        file.contents = new Buffer(JSON.stringify(manifest))
        this.push(file)*/
        cb()
    })
}
