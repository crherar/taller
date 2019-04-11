module.exports = function(io) { 

const mysql = require('mysql');
const express = require('express');
const path = require('path');
var bodyParser = require('body-parser');
var db = require('../database');
const router = express.Router();

var urlencodedParser = bodyParser.urlencoded({ extended: true });

var usuariosConectados = {}

var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'taller',
    socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
});

con.connect(function(err) {
    if (err) {
      console.error('Error de conexion: ' + err.stack);
      return;
    }
    console.log('Conectado con el ID: ' + con.threadId);
});

io.on('connection', function(socket){
    console.log('un usuario se ha conectado');
    socket.on('net', function(direccionIP){

        usuariosConectados[direccionIP] = {socket}

        datos = {
            direccionIP: direccionIP,
            socketID: socket.id
        }

        console.log(datos);

        // con.query("INSERT INTO clientes SET ?", datos, function (error, res, fields) {
        //     if (error) {
        //         console.log("\n\nERROR:\n\n", error.code, "\n\n");
        //         res.send({
        //             mensaje: error.code
        //           });
        //     } else {
        //         res.send({
        //             mensaje: "Cliente insertado exitosamente."
        //         });
        //     }
        //     }); 

            // con.query("SELECT * FROM clientes", function (error, results, fields) {
            //     if (error) {
            //         console.log("\n\nERROR:\n\n", error.code, "\n\n");
            //         res.send({
            //             mensaje: error.code
            //           });
            //     } else {
            //         console.log(results);
            //         res.send({
            //             datos: results
            //         });
            //     }
            // }); 
        socket.on('disconnect', function () {
            //delete usuariosConectados[socket.id]; // remove the client from the array
    });
});


// Obtener clientes:


    // console.log('a user connected');
    // socket.on('net', function(msg){
    //   console.log('message: ' + msg);
    // });
    // string = "hola desde index.js";
    // socket.emit('test', string);
  });


// router.get('/', urlencodedParser, function(req, res) {


//     con.query('SELECT * FROM clientes', function (error, results, fields) {
//       if (error) {
//         console.log("\n\nERROR:\n\n", error, "\n\n");
//         res.send({
//           mensaje: error.code
//         })
//       } else {
//         res.send({
//             data:results
//         })
//       }
//       });
//   });

// var mostrarClientes = function() {
//     con.query('SELECT * FROM clientes', function (error, results, fields) {
//         if (error) {
//           console.log("\n\nERROR:\n\n", error, "\n\n");
//           res.send({
//             mensaje: error.code
//           })
//         } else {
//             var resultArray = Object.values(JSON.parse(JSON.stringify(results)));
//             console.log(resultArray);
//         }
//     });
// }

router.get('/clientes', function(req, res) {

    con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
        if (error) {
          console.log("\n\nERROR:\n\n", error, "\n\n");
          res.send({
            mensaje: error.code
          })
        } else {

            var resultados = [];
            
            console.log(results.length);
            for(i = 0; i<results.length; i++){
        
                resultados.push({
                    direccionIP : results[i].direccionIP,
                    socketID: results[i].socketID
                });
            }
            res.render('clientes', {resultados:resultados});
        }
        });
  })
// router.post('/sending', urlencodedParser, function(req, res) {

// var datos = {
//     direccionIP: req.body.direccionIP,
//     socketID: req.body.socketID
// }

// console.log(datos);

// //exports.GET = function(req, res) {
//       db.insertarClientes(datos, function(err, results) {
//           if (err) {
//               res.send(500, "Server Error");
//               return;
//           } else {
//               res.send(results);
//           }
//       });
//     });

//});

// router.get('/', (req, res, next) => {
//     res.sendFile(path.join(__dirname, '../', 'views', 'index.html'));
// });

router.get('/', (req, res, next) => {
    res.render(path.join(__dirname, '../', 'views', 'index'));
});

router.get('/importar', (req, res, next) => {
    res.render(path.join(__dirname, '../', 'views', 'importar'));
});

router.post('/send', urlencodedParser, (req, res) => {

    // Parametros: regla, IP de equipo o masivo.


    // elijo la regla -> select from * reglas
    // elijo 

    var direccionIP = req.body.direccionIP;
    var saludo = req.body.saludo;
    if (usuariosConectados[direccionIP])
    console.log('usuariosConectados[direccionIP]:' + usuariosConectados[direccionIP]);
    usuariosConectados[direccionIP].socket.emit('test', 'asdasdadasdasd');
    res.send({
        data: "recibido"
    });
});

router.get('/', (req, res, next) => {

});

return router;
}