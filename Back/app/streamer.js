/////////REQUIRE
var uuid = require('node-uuid');
var appConstants = require('./constants.js');
var request = require('request');
var slidingWindow=60;

var startMovieBroadcast = function startMovieBroadcast(timetoStart, filename){
    //lets get an identifier for the seance
    var id=uuid.v4();
    appConstants.Seance[id]=timetoStart;
    var filePath=global.MOVIEPATH+filename;
    //Lets build all date for this movie
    buildBroadcastData(filePath+'/2M/2M.m3u8');
    buildBroadcastData(filePath+'/1M/1M.m3u8');
    buildBroadcastData(filePath+'/600k/600k.m3u8');
    request.get(filePath+global.INDEXNAME, function (error, response, data) {
        if (!error && response.statusCode == 200) {
        appConstants.fullDescriptor[filePath+global.INDEXNAME]=data.toString();
      }
    });
    //Return the id to send to the client
    return  id+'/'+(filename+global.INDEXNAME);
}
exports.startMovieBroadcast = startMovieBroadcast;


function buildBroadcastData(filename) {
  request.get(filename, function (error, response, data) {
    if (!error && response.statusCode == 200) {
      var array=data.toString().split('\n');
      //we build the data
      var broadcast={};
      broadcast.name=filename;
      broadcast.data=[]
      var absTime=0;
      var index=0;
      var headers="";
      var line=0;
      while(array[line].indexOf("#EXTINF")<0){
        if(array[line].indexOf("#EXT-X-MEDIA-SEQUENCE")<0){
          headers=headers+array[line]+' \n ';
        }
        line+=1;
      }
      broadcast.headers=headers;


      while(array[line].indexOf("#EXTINF")>-1){
        broadcast.data[index]={};
        broadcast.data[index].chunkName=array[line]+ '\n'+ array[line+1] + '\n' ;
        broadcast.data[index].timeLength=parseFloat(array[line].split((/:|,/))[1]);
        broadcast.data[index].absTime=absTime;
        broadcast.data[index].num=index;
        absTime+=broadcast.data[index].timeLength;
        index+=1;
        line+=2;
      }
      broadcast.footer="#EXT-X-ENDLIST";
      broadcast.size=index;
      //register it on the global file
      appConstants.fullDescriptor[filename]=broadcast;
      return broadcast;
    };
  });
}

var buildRealTimeDescriptor = function buildRealTimeDescriptor(filename,startTime){
    //given a time and a film, we send the chunk to the client
    broadcastData=appConstants.fullDescriptor[filename];
    console.log(broadcastData);
    var d = new Date();
    var now = d.getTime();
    var elapsedTime=(now-startTime)/1000; //Converting in seconds
    var Descriptor=broadcastData.headers;

    //let's select the chunks he is allowed to ask
    var GoodChunks = broadcastData.data.filter(function (element) {
        return (element.absTime < elapsedTime+slidingWindow && element.absTime > elapsedTime-slidingWindow);
    });
    var bool=true;

    //Appending them
    GoodChunks.forEach(function(element) {
        if(bool){
            //If it is the first chunk, we need this part
            Descriptor +="#EXT-X-MEDIA-SEQUENCE:"+element.num+'\n';
            bool=false;
        }
        Descriptor += element.chunkName;
        //If this is the last element lets warn the client

        if(element.num==broadcastData.size-1){
            Descriptor+=broadcastData.footer;
        }
    });
    //If the descriptor is empty, it would be a good idea to fill it
    if(bool){
        console.log("warning!! Empty descriptor")
    }
    return  Descriptor;
}
exports.buildRealTimeDescriptor= buildRealTimeDescriptor;



var sendDescriptor = function sendDescriptor(data,req,res){
    if (data) {
        res.writeHead(200,{'Content-Type':'application/vnd.apple.mpegurl'});
        res.end(data, 'utf-8');
    } else {
        console.log('emptly playlist');
        res.writeHead(500);
        res.end();
    }
}
exports.sendDescriptor = sendDescriptor;
