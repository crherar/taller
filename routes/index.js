module.exports = function(io) { 

const mysql = require('mysql');
const express = require('express');
const path = require('path');
const multer = require('multer');
var bodyParser = require('body-parser');
var async = require('async');

//var db = require('../database');


// Objeto de conexion BDD

var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'taller',
    socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
});

// Conexion a BDD

con.connect(function(err) {
    if (err) {
      console.error('Error de conexion: ' + err.stack);
      return;
    }
    console.log('Conectado con el ID: ' + con.threadId);
});


const router = express.Router();

var urlencodedParser = bodyParser.urlencoded({ extended: true });

const storage = multer.diskStorage({
    destination: 'reglas',
    filename: function(req, file, cb) {
        cb(null, file.originalname); // + path.extname(file.originalname));
    }
});

const upload =  multer({
    storage: storage
}).single('archivo');


router.get('/', (req, res, next) => {
    res.render(path.join(__dirname, '../', 'views', 'index'));
});

router.get('/importar', (req, res, next) => {
    res.render(path.join(__dirname, '../', 'views', 'importar'));
});

router.get('/ejecutar-regla', (req, res, next) => {
    //res.render(path.join(__dirname, '../', 'views', 'ejecutar-regla'));
    async.series({
        clientes: function(cb) {
            con.query("SELECT direccionIP, socketID FROM clientes", function (error, result, client){
                cb(error, result);
            })
        },
        reglas: function(cb){
            con.query("SELECT * FROM reglas", function (error, result, client){
                cb(error, result)
            })


        }
    }, function(error, results) {
        if (!error) {

            var resultadosClientes = [];
            
            // console.log(results.clientes.length);
            for(i = 0; i<results.clientes.length; i++){
        
                resultadosClientes.push({
                    direccionIP : results.clientes[i].direccionIP,
                    socketID: results.clientes[i].socketID
                });
            }

            var resultadosReglas = [];

            for(i = 0; i<results.reglas.length; i++){
        
                resultadosReglas.push({
                    nombre : results.reglas[i].nombre,
                });
            }

            // console.log('Resultados clientes: ' + resultadosClientes);
            // console.log('Resultados reglas: ' + resultadosReglas);
            //res.send({results});
            res.render('ejecutar-regla', {resultadosClientes:resultadosClientes, resultadosReglas:resultadosReglas});
        }



        // for(i = 0; i<results.length; i++){
    
        //     resultados.push({
        //         direccionIP : results[i].direccionIP,
        //         socketID: results[i].socketID
        //     });
        // }

    });

        // con.query('SELECT nombre FROM reglas', function (error, results, fields) {
        //     if (error) {
        //       console.log("\n\nERROR:\n\n", error, "\n\n");
        //       res.send({
        //         mensaje: error.code
        //       })
        //     } else {
    
        //         var resultados = [];
                
        //         console.log(results.length);
        //         for(i = 0; i<results.length; i++){
            
        //             resultados.push({
        //                 nombre : results[i].nombre,
        //                 // socketID: results[i].socketID
        //             });
        //         }
        //         res.render('clientes', {resultados:resultados});
        //     }
        //     });
});

// Guarda los socket clientes
var usuariosConectados = {}

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
});


// Obtener clientes activos

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

// Subir reglas de YARA de forma local al servidor

router.post('/upload', function(req, res) {
    upload(req, res, (err) => {
       if(err) {
           res.render('index', {
               msg:err
           });
       } else {
           var nombre = req.file.originalname;
           con.query('INSERT INTO reglas SET nombre=?', nombre, function (error, results, fields) {
            if (error) {
              console.log("\n\nERROR:\n\n", error.code, "\n\n");
              res.send({
                mensaje: error.code
              })
            } else {
              res.send({
                mensaje: "Regla insertada correctamente"
              });
            }
            });
       }
    
  });
});

// Ejecutar regla en socket cliente, 

router.post('/send', urlencodedParser, (req, res) => {

    // Parametros: regla, IP de equipo o masivo.


    // elijo la regla -> select from * reglas
    // elijo

    var direccionIP = req.body.direccionIP;
    var saludo = req.body.saludo;
    console.log(saludo);
    if (usuariosConectados[direccionIP])
    console.log('usuariosConectados[direccionIP]:' + usuariosConectados[direccionIP]);
    usuariosConectados[direccionIP].socket.emit('test', saludo);
    res.send({
        data: "recibido"
    });
});

// El socket cliente viene a buscar los archivos de reglas de YARA a esta ubicacion.

router.get('/reglas/:file(*)',(req, res) => {
    var file = req.params.file;
    var fileLocation = path.join('./reglas',file);
    console.log(fileLocation);
    res.download(fileLocation, file); 
});


router.post('/pruebaejecutar',urlencodedParser, (req, res) => {
    console.log(req.body);
    res.send('recibido');
});


return router;
}