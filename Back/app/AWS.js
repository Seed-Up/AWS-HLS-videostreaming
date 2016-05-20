/////////REQUIRE
var AWS=require('aws-sdk');
var fs = require('fs');
var appConstants = require('./constants.js');

/////////AWS PARAMETERS
global.INDEXNAME='/index.m3u8';
global.ACCESSKEYID=''
global.SECRETACCESSKEY='';
global.INPUTBUCKET='';
global.OUTPUTBUCKET='';
global.TRANSCODINGPIPELINE='';

//////////////NOTE
//////////////CORS FOR INPUT bucket
/*
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
   <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
*/


/////////AWS SETUP
AWS.config.apiVersions = {
  elastictranscoder: '2012-09-25',
};
AWS.config.region = 'eu-west-1';
//The transcoder
var elastictranscoder = new AWS.ElasticTranscoder(
  options = {
    accessKeyId : ACCESSKEYID,
    secretAccessKey: SECRETACCESSKEY
  }
);
//the bucket for upload
var inbucket = new AWS.S3(
  options = {
    accessKeyId : ACCESSKEYID,
    secretAccessKey: SECRETACCESSKEY,
    params: {Bucket: INPUTBUCKET}
});
//the one for outputting the transcoding
var outbucket = new AWS.S3(
  options = {
    accessKeyId : ACCESSKEYID,
    secretAccessKey: SECRETACCESSKEY,
    params: {Bucket: OUTPUTBUCKET}
});


/////////PUBLIC FUNCTION
var signUpload = function signUpload(req,res){
  var params = {
      Key: req.query.file_name,
      ContentType: req.query.file_type,
      ACL: 'public-read'
  };
  inbucket.getSignedUrl('putObject', params, function(err, data){
      if(err){
          console.log('error', err);
      }
      else{
          console.log('data', data);
          var return_data = {
              signed_request: data,
              url: 'https://'+INPUTBUCKET+'.s3.amazonaws.com/'+req.query.file_name
          };
          res.write(JSON.stringify(return_data));
          return res.end();
      }
  });
}
exports.signUpload=signUpload;

var uploadFile = function uploadFile(file){
  var fileName=file.replace(/\.[^/.]+$/, "");
  if(appConstants.movieState[fileName]!=null){
    console.log("overwriting an existing file")
    return error;
  }
  var body = fs.createReadStream(file);
  var params = {Key: file, Body: body};
  inbucket.upload(params).on('httpUploadProgress', function(evt) {
    appConstants.movieState[fileName]="uploading"
    console.log(evt);
  }).send(function(err, data) {
        appConstants.movieState[fileName]="error"
        console.log(err, data)
        if(data){
          appConstants.movieState[fileName]="uploaded"
          console.log(data);
          transcodeData(file);
        }
      });
}
exports.uploadFile = uploadFile;

var transcodeData=function transcodeData(file){
  var fileName=file.replace(/\.[^/.]+$/, "");
  appConstants.movieState[fileName]="transcoding"
  elastictranscoder.createJob({
    PipelineId: TRANSCODINGPIPELINE, // specifies output/input buckets in S3
    OutputKeyPrefix: 'results/',
    Input: {
      Key: file,
      FrameRate: 'auto',
      Resolution: 'auto',
      AspectRatio: 'auto',
      Interlaced: 'auto',
      Container: 'auto' },
    Outputs: [ {
      Key: fileName+'/2M/2M',
      ThumbnailPattern: fileName+'2M-{count}',
      PresetId: '1351620000001-200015', // specifies the format of the output video
      Rotate: 'auto',
      SegmentDuration: '10' },
      {
      Key: fileName+'/1M/1M',
      ThumbnailPattern: fileName+'1M-{count}',
      PresetId: '1351620000001-200035', // specifies the format of the output video
      Rotate: 'auto',
      SegmentDuration: '10' },
     {
      Key: fileName+'/600k/600k',
      ThumbnailPattern: fileName+'600k-{count}',
      PresetId: '1351620000001-200045', // specifies the format of the output video
      Rotate: 'auto',
      SegmentDuration: '10' }]
    },
   function(error, data) {
     console.log(error);
     if(data){
      appConstants.movieState[fileName]="transcoded";
       writeHLSIndex(fileName);
     }
  });
}
exports.transcodeData = transcodeData;

//Write dynamic streaming index by hand
function writeHLSIndex(fileName,bucket){
  var params = {Key: 'results/'+fileName+INDEXNAME,
    Body: "#EXTM3U\n \
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=600000\n \
600k/600k.m3u8\n \
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1000000\n \
1M/1M.m3u8\n \
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2000000\n \
2M/2M.m3u8"
  };
  outbucket.upload(params, function(err, data) {
    if (err) {
      console.log("Error uploading data: ", err);
    } else {
      appConstants.movieState[fileName]="ready"
      console.log("Successfully uploaded data to myBucket/myKey");
    }
  });
}
