const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

// Start server
const server = app.listen(port='3000', () => {
  console.log("Servidor corriendo en puerto", port);
});

app.use(bodyParser.urlencoded({extended:false}));

// Websockets
const SocketIO = require('socket.io');
const io = SocketIO(server);

io.on('connection', function(socket) {
  io.emit('this', { will: 'be received by everyone'});
  console.log('Alguien se ha conectado con sockets');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});



// app.use('/admin', adminRoutes);
// app.use('/shop', shopRoutes);


// io.on('connection', function(socket){
//   console.log('a user connected');
//   socket.on('net', function(msg){
//     console.log('message: ' + msg);
//   });
//   string = "hola";
//   socket.emit('test', string);
// });

// 





// const server = app.listen(port='3000', () => {
//   console.log("Servidor corriendo en puerto", port);
// });


