#AWS-backed HLS Video streaming service

A simple HLS video stream service. Basically you can use that as a VOD service or as a live streaming service of file.

###API
--
#####--->/registerScreening/:time/:movie
Program a screening of the file, returns the string to send to the video player
bug here if you start watching the movie rightaway
By the way it would be cool to have a standard wait thing fo users to wait
#####-->/getFiles/:id/:urlMov(*)
to pass to the video player to get the movie the id is the ref of the screening
#####-->/movieState/:movie'
Gets back the state of the movie, ie uploading, transcoding, ready..
#####-->'/sign_s3'
Sign a user uload to the input bucket


###Flow

* The user request an upload key
* The server sends back an url for him to upload on the input bucket
* When the upload is complete a pipeline on AWS-transcoder automatically converts it in 3 HLS files
* When the admin requets a screening, a live descriptor is builded, this function returns an url
* The video player then plays the live video if given the url

###Needed Setup

* two S3 bucket, for input and transcoding output, with CORS setup right for the input one
* one pipeline on aws-transcoder
* Cors setup right for the viewer


Work in progress (maybe a few things missing in the package.Json but should be a good start for an Open-Source Live streaming platform


