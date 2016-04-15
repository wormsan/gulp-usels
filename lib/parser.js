/*
* @Author: zhaoye-ds1
* @Date:   2016-04-05 21:23:16
* @Last Modified by:   zhaoye-ds1
* @Last Modified time: 2016-04-06 03:24:46
*/
'use strict';
var scriptToken = /<.*?script.*?>[\s\S]*?<\/.*?script.*?>/g
var commentToken = /<!--[\s\S]*?-->/g
//compare link or other tag
var tagToken = /(<[\s\S]*?link[\s\S]*?>)|(<[\s\S]+?>[\s\S]*?<\/[\s\S]+?>)/g
var startToken = /<!--.*?@start.*?-->/
var endToken = /<!--.*?@end.*?-->/
var methods = {
    targetToken: /<!--\s*?@compile\s*?\:\s*?(.*?)\s*?-->/,
    mtdToken: /<!--\s*?@(path|inject|file|combo|base)\s*?\:\s*?(.*?)\s*?-->/g,
}
var Block = function(opt){
    this.cplTar = opt.cplTar
    this.cplMtd = opt.cplMtd
}

var Scope = function(){
    this.code = ''
    this.subBlocks = []
}
var getBlocks = function(source){
    var preBlocks = []
    //string cache
    var cache = ''
    //recoder
    var code = ''
    //stack counter
    var cnt = -1
    //parse
    for(var i=0; i< source.length; i++){
        cache += source[i];
        if(cnt>=0){
           setBlockCode(cnt,preBlocks,source[i])
        }
        if(startToken.test(cache)){
            cnt++
            makeBlock(cnt,preBlocks)
            setBlockCode(cnt,preBlocks,cache.match(startToken)[0])
            cache = ''
            //dirty code
            //mark where subBlocks should be replace
            if(cnt>0)
                preBlocks[preBlocks.length-1].code = preBlocks[preBlocks.length-1].code.replace(/<!--.*?@start.*?-->$/,'<!--THIS_IS_WHERE_SUB_BLOCKS_NEED_TO_BE_REPLACED-->')
        }else if(endToken.test(cache)){
            cache = ''
            cnt--
        }
    }
    return preBlocks
}
function makeBlock(cnt,blocks){
    if(cnt==0){
        blocks.push(new Scope)
    }else{
        cnt--
        makeBlock(cnt,blocks[blocks.length-1].subBlocks)
    }
}
function setBlockCode(cnt,blocks,code){
    if(cnt==0){
        blocks[blocks.length-1].code += code
        //blocks[blocks.length-1].code = blocks[blocks.length-1].code//.replace(startToken,'').replace(endToken,'')
    }else{
        var _cnt = cnt - 1
        setBlockCode(_cnt,blocks[blocks.length-1].subBlocks,code)
    }
}

function parseBlock(block){
    var cplTar
    var cplMtd
    if(methods.targetToken.test(block.code)){
        cplTar = RegExp.$1
    }
    block.commands = {}
    block.commands["compile"] = cplTar.trim()
    block.code.match(methods.mtdToken).forEach(function(f){
        methods.mtdToken.test(block.code)
        block.commands[RegExp.$1.trim()] = RegExp.$2.trim()
    })
    var tags = block.code.match(tagToken)
    block.tags = tags.map(function(tag){
        return parseTag(tag)
    })
    if(block.subBlocks.length>0){
        block.subBlocks.map(function(block){
            return parseBlock(block)
        })
    }
    //block.code is useless so delete it
    return block
}
function parseTag(tagCode){
    var tag = {}
    tag.tagName = /<\s*?([\w\d]+)/.test(tagCode) ? RegExp.$1 : null
    var attrToken = /<\s*?[a-zA-Z0-9]+\s*?([\w\d]+\=["'].*?["'])*?\s*?>/
    var attrs = tagCode.match(attrToken)[1]
                ? tagCode.match(attrToken)[1].match(/[\w\d]+\=["'].*?["']/g)
                : []
    attrs.forEach(function(attr){
        var key = attr.match(/^([\w\d]+)/)[1].trim()
        var value = attr.match(/["'](.*?)["']/)[1].trim()
        tag[key] = value
    })
    if(!tag.href && !tag.src){
        //pure code
        tag.code = tagCode.replace(/<[\s\S]*?>/,'').replace(/<\/[\s\S]*?>/,'')
    }
    return tag
}

module.exports =  function(file){
    return getBlocks(String(file.contents))
                    .map(function(block){
                        return parseBlock(block)
                    })
}
