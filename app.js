var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var path = require('path');

//const bodyParser = require('body-parser');
//var urlencodedParser = bodyParser.urlencoded({ extended: true });
app.set('view engine', 'ejs');
app.use(bodyParser.json());

var indexRoutes = require('./routes/index')(io);

app.use(indexRoutes);


http.listen(3000, function(){
  console.log('listening on *:3000');
});