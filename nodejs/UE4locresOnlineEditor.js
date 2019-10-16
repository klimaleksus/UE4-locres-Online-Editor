
// UE4locresOnlineEditor v1.1, by Kly_Men_COmpany!

"use strict";

const fs = require('fs');
const path = require('path');
const util = require('util');
const TextEncoder = function(){
  return {
    encode: function(str){
      const n = str.length;
      const buf = new Uint8Array(n);
      for(let i=0; i<n; i++){
        let c = str.charCodeAt(i);
        if(c>127)
          throw new Error('TextEncoder mock only supports ASCII');
        buf[i] = c;
      }
      return buf;      
    }
  }; 
};
const TextDecoder = function(){
  return {
    decode: function(ab){
      const n = ab.byteLength;
      const res = [];
      res.length = n;
      for(let i=0; i<n; i++){
        let c = ab[i];
        if(c>127)
          throw new Error('TextDecoder mock only supports ASCII');
        res[i] = String.fromCharCode(c);
      }
      return res.join('');
    }
  }; 
};
const Blob = function(arr){
  return Buffer.concat(arr.map(function(ab){
    return Buffer.from(ab);
  }));
};

const argv = [];
let argc;
for(let i=1; i<process.argv.length; i++)
  argv.push(process.argv[i]);
argc = argv.length;
return (process.exitCode = main(argc,argv));


function main(argc, argv){
  const action = (argc>2 ? argv[1] : '');
  argv = argv.slice(2);
  const save = argv[0]+'.txt';
  switch(action.toLowerCase().replace(/[^a-z_]/g,'')){
    case 'locres_to_txt': {
      node_write_text(save,argv.map(function(file){
        return locres_export(node_locres_load(node_read_file(file),path.basename(file)));
      }).join(''));
      return 0;
    }
    case 'txt_to_locres': {
      locres_import(node_txt(argv)).forEach(function(loc){
        const file = locres_save(loc);
        node_write_file(argv[0]+'.'+filter_name(file.name),file);      
      });
      return 0;
    }
    case 'reparse_text': {
      node_write_text(save,locres_import(node_txt(argv)).map(function(locres){
        return locres_export(locres);
      }).join(''));
      return 0;
    }
    case 'remove_original': {
      node_write_text(save,locres_import(node_txt(argv)).map(function(locres){
        locres_move(locres,true);
        return locres_export(locres);
      }).join(''));
      return 0;
    }
    case 'remove_translation': {
      node_write_text(save,locres_import(node_txt(argv)).map(function(locres){
        locres_move(locres,false);
        return locres_export(locres);
      }).join(''));
      return 0;
    }
    case 'translation_stats': {
      node_write_text(save,locres_import(node_txt(argv)).map(function(locres){
        return locres_stats(locres,false)
      }).join(''));
      return 0;
    }
    case 'split_translation': {
      node_write_text(save,locres_import(node_txt(argv)).map(function(locres){
        return locres_stats(locres,true);
      }).join(''));
      return 0;
    }
  }
  console.log('UE4locresOnlineEditor v1.1, NodeJS port. Usage:');
  console.log('node UE4locresOnlineEditor.js <action> "file1" ["file2" ...]');
  console.log('Where <action> is one of (only "a" - "z" and "_" are checked):');
  console.log('"locres_to_txt" - import some binary .locres and convert to one .txt');
  console.log('"txt_to_locres" - join some .txt and export them as .locres under <FILE> names');
  console.log('All following actions are also joining several .txt and outputting one .txt:');
  console.log('"reparse_text", "remove_original", "remove_translation",');
  console.log('"translation_stats", "split_translation" - they work just as in browser.');
  console.log('There should be 7 .bat files, just use them as drag-and-drop targets!');
  return 255;
};

function node_txt(argv){
  return argv.map(function(file){
    return node_read_text(file);
  }).join('\n');
};

function filter_name(name){
  return name.replace(/[^a-zа-яё0-9.,=_!#$%&( )[\]{~}`№@'+-]/gi,'_');
}

function node_read_file(name){
  return fs.readFileSync(name,{encoding:null}).buffer;
};

function node_read_text(name){
  return fs.readFileSync(name,{encoding:'utf8'});
};

function node_write_text(name,text){
  const bom = '\ufeff';
  return fs.writeFileSync(name,bom+text,{encoding:'utf8'});
};

function node_write_file(name,buf){
  return fs.writeFileSync(name,buf,{encoding:null});
};

function node_locres_load(buf,name){
  var stream = node_stream_reader(buf);
  try{
    var head = read_header(stream);
    var count = locres_number(stream);
    var chunks = [];
    while(--count>=0)
      chunks.push(read_chunk(stream));
    var lines = read_lines(stream);
    stream.free();
    stream = null;
    merge_lines(chunks,lines);
    return {
      name: name,
      head: head,
      chunks: chunks,
    };
  }catch(e){
    console.error(e);
    return null;
  }
};

function node_stream_reader(buf){
  return {
    skip: function(count){
      if(count<1)
        count = 0;
      this._offset += count;
      if(this._offset>=this._size){
        this._offset = this._size;
        return true;
      }
      return false;
    },
    read: function(count){
      if(this._offset+count>this._size)
        count = this._size-this._offset;
      if(count<1)
        return new Uint8Array(0);
      this._offset += count;
      return new Uint8Array(this._buffer,this._offset-count,count);
    },
    pos: function(){
      return this._offset;
    },
    seek: function(offset){
      if(offset<1)
        this._offset = 0;
      if(offset>=this._size)
        this._offset = this._size;
      this._offset = offset;
    },
    free: function(){
      this._buffer = null;
      this._offset = 0;
      this._size = -1;
      this.skip = null;
      this.read = null;
      this.pos = null;
      this.seek = null;
      this.free = null;
    },
    _offset: 0,
    _buffer: buf,
    _size: buf.byteLength,
  };
};

function locres_move(locres,orig){
  locres.chunks.forEach(function(chunk){
    chunk.parts.forEach(function(part){
      var arr = trans_export(part.line);
      if(arr.length<2)
        return;
      if(orig)
        arr.shift();
      else
        arr.pop();
      part.line = trans_import(arr);        
    });
  });
};

function locres_stats(locres,split){
  var i,next;
  var text = '';
  i = 0;
  locres.oldchunks = locres.chunks;
  locres.oldchunks.forEach(function(chunk){
    chunk.oldparts = chunk.parts;
    chunk.parts.forEach(function(part){
      part.oldline = part.line;
    });
  });
  while(i<Infinity){
    next = Infinity;
    var mychunks = [];
    locres.oldchunks.forEach(function(chunk){
      var myparts = [];
      chunk.oldparts.forEach(function(part){
        var arr = trans_export(part.line);
        if(arr.length>i&&arr.length<next)
          next = arr.length;
        if(split){
          if(arr.length>i){
            part.line = arr[i];
            myparts.push(part);
          }
        }else{
          if(arr.length==i)
            myparts.push(part);
        }
      });
      chunk.parts = myparts;
      if(myparts.length)
        mychunks.push(chunk);
    });
    locres.chunks = mychunks;
    i = next;
    if(mychunks.length)
      text += locres_export(locres);
    if(split){
      locres.chunks.forEach(function(chunk){
        chunk.parts.forEach(function(part){
          part.line = part.oldline;
        });
      });
    }
  }
  locres.chunks = locres.oldchunks;
  delete locres.oldchunks;
  locres.chunks.forEach(function(chunk){
    chunk.parts = chunk.oldparts;
    delete chunk.oldparts;
    chunk.parts.forEach(function(part){
      part.line = part.oldline;
      delete part.oldline;
    });
  });
  return text;
};

function locres_load(file,cb){
  stream_reader(file,function(stream){
    try{
      var head = read_header(stream);
      var count = locres_number(stream);
      var chunks = [];
      while(--count>=0)
        chunks.push(read_chunk(stream));
      var lines = read_lines(stream);
      stream.free();
      stream = null;
      merge_lines(chunks,lines);
      return cb({
        name: file.name,
        head: head,
        chunks: chunks,
      });
    }catch(e){
      console.error(e);
      cb(null);
    }
  });
};

function read_header(stream){
  stream.seek(0);
  stream.skip(4);
  var one = locres_number(stream);
  stream.skip(13);
  var two = locres_number(stream);
  var head = '';
  stream.seek(0);
  if(one||!two){
    head = locres_binary(stream,17);
    stream.skip(8);
  }
  return head;
}

function read_lines(stream){
  var lines = [];
  if(stream.skip(0))
    return lines;
  var count = locres_number(stream);
  while(--count>=0)
    lines.push(locres_string(stream));
  return lines;
};

function read_chunk(stream){
  var name = locres_string(stream);
  var count = locres_number(stream);
  var parts = [];
  while(--count>=0)
    parts.push(read_part(stream));
  return {
    name: name,
    parts: parts,
  };
};

function read_part(stream){
  var key = locres_string(stream);
  var id = locres_binary(stream,4);
  var number = locres_number(stream);
  var line = false;
  if(number<0){
    line = locres_string(stream,number);
    number = -1;
  }
  return {
    key: key,
    id: id,
    number: number,
    line: line,
  };
  parts.push(part);
};

function merge_lines(chunks,lines){
  chunks.forEach(function(chunk){
    var pool = Object.create(null);
    chunk.parts = chunk.parts.filter(function(part){
      if(pool[part.key])
        return false;
      pool[part.key] = true;
      if(part.line!==false)
        return true;
      if(part.number<0||part.number>=lines.length)
        return false;
      part.line = lines[part.number];
      return true;
    });
  });
};

function split_lines(chunks){
  var pool = Object.create(null);
  var lines = [];
  chunks.forEach(function(chunk){
    var keys = Object.create(null);
    chunk.parts.forEach(function(part){
      keys[part.key] = part;
    });
    chunk.parts = chunk.parts.filter(function(part){
      return keys[part.key] == part;
    });
    chunk.parts.forEach(function(part){
      if(!pool[part.line]){
        lines.push(part.line);
        pool[part.line] = lines.length;
      }
      part.number = pool[part.line]-1;
    });
  });
  return lines;
};

function locres_save(locres){
  var lines = split_lines(locres.chunks);
  var buffers = [null];
  locres.chunks.forEach(function(chunk){
    buffers.push(save_chunk(chunk,!!locres.head));
  });
  buffers[0] = save_header(buffers,locres.head);
  if(locres.head)
    buffers.push(save_lines(lines));
  var blob = new Blob(buffers,{type:'application/octet-stream'});
  blob.name = locres.name;
  return blob;
};

function save_lines(lines){
  var size = lines.reduce(function(size,line){
    return size+locres_strlen(line,-1);
  },4);
  var ab = new ArrayBuffer(size);
  var dv = new DataView(ab);
  var off = locres_writenum(dv,0,lines.length);
  if(lines.reduce(function(off,line){
    return locres_writestr(dv,off,line,-1);
  },off)!=size)
    return null;
  return ab;
};

function save_chunk(chunk,list){
  var size;
  if(chunk.name)
    size = locres_strlen(chunk.name,-1);
  else
    size = 4;
  size = chunk.parts.reduce(function(size,part){
    return size+locres_strlen(part.key,-1) +
      (list ? 8 : 4+locres_strlen(part.line,0));
  },size+4);
  var ab = new ArrayBuffer(size);
  var dv = new DataView(ab);
  var off = 0;
  off = locres_writestr(dv,off,chunk.name,-1);
  off = locres_writenum(dv,off,chunk.parts.length);
  off = chunk.parts.reduce(function(off,part){
    off = locres_writestr(dv,off,part.key,-1);
    off = write_hex(dv,off,part.id);
    if(list)
      off = locres_writenum(dv,off,part.number);
    else
      off = locres_writestr(dv,off,part.line,0);
    return off;
  },off);
  if(off!=size)
    throw new Error('how? '+off+','+size);
  return ab;
};

function save_header(chunk_buffers,header){
  var cnt = 0;
  var size = chunk_buffers.reduce(function(size,buffer){
    if(!buffer)
      return size;
    cnt++;
    return size+buffer.byteLength;
  },29);
  var ab,dv;
  if(header.length!=17*2){
    ab = new ArrayBuffer(4);
    dv = new DataView(ab);
    locres_writenum(dv,0,cnt);
    return ab;
  }
  var off = 0;
  ab = new ArrayBuffer(29);
  dv = new DataView(ab);
  off = write_hex(dv,off,header);
  off = locres_writenum(dv,off,size);
  off = locres_writenum(dv,off,0);
  off = locres_writenum(dv,off,cnt);
  return ab;  
};

function locres_export(locres){
  var res = [];
  res.push('<FILE> "'+escape_export(locres.name)+'" ('+locres.head+')\n');
  locres.chunks.forEach(function(chunk){
    res.push('\n<NAME> "'+escape_export(chunk.name)+'":\n');
    var pool = Object.create(null);
    var take = [];
    chunk.parts.forEach(function(part){
      if(pool[part.line])
        pool[part.line].push(part);
      else{
        pool[part.line] = [part];
        take.push(part.line);
      }
    });
    take.forEach(function(line){
      pool[line].forEach(function(part){
        res.push('<TEXT> "'+escape_export(part.key)+'" ('+part.id+')');
      });
      trans_export(line).forEach(function(text){
        res.push('"'+escape_export(text)+'"');
      });
      res.push('');
    });
  });
  return '\n'+res.join('\n')+'\n\n';
};

function locres_import(text){
  var reg_name = /<name>/gi;
  var reg_text = /<text>/gi;
  var reg_quote = /^\s*"([^"]*)"\s*\(([^)]*)\)([^\0]*)$/;
  var reg_colon = /^\s*"([^"]*)"\s*:?([^\0]*)$/;
  var reg_line = /"([^"]*)"/g;
  var match,files,chunks,parts,texts,line,back;
  files = [];
  text.replace(/\0/g,'').replace(/<file>/gi,'\0').split('\0').forEach(function(file,index){
    if(!index)
      return;
    match = file.match(reg_quote);
    if(!match)
      return;
    chunks = [];
    files.push({
      name: escape_import(match[1]),
      head: escape_import(match[2]),
      chunks: chunks,
    });
    match[3].replace(reg_name,'\0').split('\0').forEach(function(chunk,index){
      if(!index)
        return;
      match = chunk.match(reg_colon);
      if(!match)
        return;
      parts = [];
      chunks.push({
        name: escape_import(match[1]),
        parts: parts,
      });
      back = [];
      match[2].replace(reg_text,'\0').split('\0').forEach(function(part,index){
        if(!index)
          return;
        match = part.match(reg_quote);
        if(!match)
          return;
        texts = [];
        match[3].replace(reg_line,function(line,text){
          texts.push(escape_import(text));
        });
        line = trans_import(texts);
        back.push({
          key: escape_import(match[1]),
          id: escape_import(match[2]),
          line: line,
          number: -1,
        });
        if(line){
          back.forEach(function(part){
            part.line = line;
            parts.push(part);
          });
          back = [];
        };
      });
    });
  });
  return locres_translation(files);
};

function locres_translation(files){
  var pool,bro;
  pool = Object.create(null);
  files = files.filter(function(file){
    if(!pool[file.name])
      pool[file.name] = file;
    else{
      bro = pool[file.name];
      file.chunks.forEach(function(chunk){
        bro.chunks.push(chunk);
      });
      return false;
    }
    return true;
  });
  files.forEach(function(file){
    pool = Object.create(null);
    file.chunks = file.chunks.filter(function(chunk){
      if(!pool[chunk.name])
        pool[chunk.name] = chunk;
      else{
        bro = pool[chunk.name];
        chunk.parts.forEach(function(part){
          bro.parts.push(part);
        });
        return false;
      }
      return true;
    });
    file.chunks.forEach(function(chunk){
      pool = Object.create(null);
      chunk.parts = chunk.parts.filter(function(part){
        if(!pool[part.key])
          pool[part.key] = part;
        else{
          bro = pool[part.key];
          bro.line = trans_join(bro.line,part.line);
          return false;
        }
        return true;
      });
    });
  });
  return files;
};

function escape_export(text){
  return text.replace(/(\r\n)|[<>\t"\0]|/g,function(ch){
    switch(ch){
      case '\r\n': return '<cf>';
      case '<': return '<lt>';
      case '>': return '<gt>';
      case '\t': return '<tab>';
      case '"': return '<q>';
      case '\0': return '<nul>';
      default: return ch;
    }
  }).replace(/[\x01-\x1f]/g,function(ch){
    switch(ch){
      case '\r': return '<cr>';
      case '\n': return '<lf>';
      default: return '<$'+byte2hex(ch.charCodeAt(0))+'>';
    }
  });
};

function escape_import(text){
  return text.replace(/<(?:\$([0-9a-fA-F][0-9a-fA-F])|[^>]+)>/g,function(ch,pt){
    if(pt)
      return String.fromCharCode(parseInt(pt));
    switch(ch.toLowerCase()){
      case '<cf>': return '\r\n';
      case '<tab>': return '\t';
      case '<q>': return '"';
      case '<cr>': return '\r';
      case '<lf>': return '\n';
      case '<nul>': return '\0';
      case '<lt>': return '<';
      case '<gt>': return '>';
      default: return ch;
    }
  });
};

function locres_binary(stream,bytes){
  var arr = stream.read(bytes);
  return read_hex(arr2view(arr),0,bytes);
};

function locres_number(stream){
  var arr = stream.read(4);
  return arr2view(arr).getInt32(0,true);
};

function trans_export(line){
  return line.split('\0').reverse();
};

function trans_import(arr){
  return arr.reverse().join('\0');
};

function trans_join(prev,next){
  var a = trans_export(prev);
  var b = trans_export(next);
  b = b.filter(function(line){
    return a.indexOf(line)<0;
  });
  return trans_import(a.concat(b));
};

function locres_string(stream,size){
  if(!size)
    size = locres_number(stream);
  if(size>0){
    var data = stream.read(size);
    return fix_string((new TextDecoder()).decode(data));
  }
  if(!size)
    return '';
  size =- size;
  var data = stream.read(size<<1);
  var utf = arr2view(data);
  var s = '';
  for(var i=0; i<size; i++)
    s += String.fromCharCode(utf.getUint16(i<<1,true));
  return fix_string(s);
};

function fix_string(str){
  if(!str.length)
    return '';
  if(!str.charCodeAt(str.length-1))
    return str.substring(0,str.length-1);
  return str;
};

function locres_strlen(str,utf8){
  if(!str)
    return 4;
  if(utf8<0)
    utf8 = str.match(/^[ -~\t\n\r]+$/) ? 1 : -1;
  if(utf8>0)
    return 4+(new TextEncoder()).encode(str).length+1;
  return 4+(str.length+1)*2;
};

function locres_writestr(view,offset,str,utf8){
  if(!str)
    return locres_writenum(view,offset,0);
  var size = str.length+1;
  if(utf8<0)
    utf8 = str.match(/^[ -~\t\n\r]+$/) ? 1 : -1;
  if(utf8>0){
    var buf = (new TextEncoder()).encode(str);
    view.setInt32(offset,buf.length+1,true);
    offset += 4;
    for(var i=0,n=buf.length; i<n; i++){
      view.setUint8(offset,buf[i]);
      offset++;
    }
    view.setUint8(offset,0,true);
    offset ++;
  }else{
    view.setInt32(offset,-size,true);
    offset += 4;
    for(var i=0,n=str.length; i<n; i++){
      view.setUint16(offset,str.charCodeAt(i),true);
      offset += 2;
    }
    view.setUint16(offset,0,true);
    offset += 2;
  }
  return offset;
};

function locres_writenum(view,offset,value){
  view.setUint32(offset,value,true);
  return offset+4;
};

function int2hex(val){
  var ab = new ArrayBuffer(4);
  var dv = new DataView(ab);
  dv.setUint32(0,val,true);
  return read_hex(dv,0,4);
};

function read_hex(view,offset,count){
  var s = '';
  for(var i=0,j=offset; i<count; i++,j++)
    s += byte2hex(view.getUint8(j));
  return s;
};

function write_hex(view,offset,str){
  var none = str.replace(/[0-9a-f][0-9a-f]/g,function(b){
    view.setUint8(offset++,parseInt(b,16));
    return '';
  });
  if(none!='')
    throw new Error('none?');
  return offset;
};

function arr2view(arr){
  return new DataView(arr.buffer,arr.byteOffset);
};

function byte2hex(val){
  if(val<16)
    return '0'+val.toString(16);
  return val.toString(16);
};

//EOF