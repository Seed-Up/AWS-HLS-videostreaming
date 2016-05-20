////////JUST TO WAIT FOR SQL INTEGRATION
var fullDescriptor={};   //here we remember the file builded descriptor
var Seance={};  //here we remember when the seance started
var movieState={}; //here we remember the movie upload State
module.exports = {

  fullDescriptor,
  Seance,
  movieState
}
Object.freeze(module.exports); // ensure protection against modification
