
/////////////////////API\\\\\\\\\\\\\\\\\\\\\\
//--->/registerScreening/:time/:movie
//Program a screening of the file, returns the string to send to the video player
//bug here if you start watching the movie rightaway
//By the way it would be cool to have a standard wait thing fo users to wait
//Register an ID for the screening
//-->/getFiles/:id/:urlMov(*)
//to pass to the video player to get the movie the id is the ref of the screening
//-->/movieState/:movie'
//Gets back the state of the movie, ie uploading, transcoding, ready..
//-->'/sign_s3'
//Sign a user uload to the input bucket

//For use exmple, see index.html
/////////////////////API\\\\\\\\\\\\\\\\\\\\\\

/////////REQUIRE
var fs = require('fs');
var url = require('url');
var path = require('path');
var zlib = require('zlib');
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded());

/////////API FUNCTIONS
var AWS=require('./app/AWS.js');
var streamer= require('./app/streamer.js');
//constants that will be stored in the database
var appConstants = require('./app/constants.js');

/////////GLOBALS
global.MOVIEPATH='http://transcoder.output.cinext.s3.amazonaws.com/results/';
global.INDEXNAME='/index.m3u8';
PORT = 8001;

///////Testing
//AWS.uploadFile('test2.mov');

///////ROUTING
app.get('/registerScreening/:time/:movie', function (req, res) {
    res.write(streamer.startMovieBroadcast(req.params.time, req.params.movie));
    res.end();
});

app.get('/movieState/:movie', function (req, res) {
    res.write(appConstants.movieState[req.params.movie]);
    res.end();
});

app.get('/startTranscoding/:movie', function(req, res){
    AWS.transcodeData(req.params.movie);
    res.end();
});

app.get('/sign_s3', function(req, res){
  AWS.signUpload(req,res);
});


app.get('/getFiles/:id/:urlMov(*)', function (req, res) {
    var id=req.params.id;
    var decodedUrl= req.params.urlMov;
    var uri = url.parse(decodedUrl).pathname;
    var filename=global.MOVIEPATH+decodedUrl;
    switch (path.extname(uri)) {

        case '.m3u8':
            if (appConstants.fullDescriptor[filename]==null) {
                console.log('Descriptor not builded yet' + filename);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.write('file not found: %s\n', filename);
                res.end();
            } else {
                if(filename.indexOf(INDEXNAME)>0){
                    console.log("sending index");
                    streamer.sendDescriptor(appConstants.fullDescriptor[filename], req,res);
                } else {
                    console.log("sending playlist");
                    var contents=streamer.buildRealTimeDescriptor(filename,appConstants.Seance[id]);
                    streamer.sendDescriptor(contents, req,res);
                }
            }
            break;

        case '.ts':
            //Here a simple redirect would be nicer
            res.redirect(filename);
            break;

        default:
            console.log('unknown file type: ' +
            path.extname(uri));
            res.writeHead(404);
            res.end();
    }
});

app.listen(PORT, function () {
  console.log('video server listening');
});
