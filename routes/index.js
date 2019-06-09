module.exports = function(io) { 

const mysql = require('mysql');
const express = require('express');
const path = require('path');
const multer = require('multer');
var jwt = require('jwt-simple');
var bodyParser = require('body-parser');
var async = require('async');
var crearToken = require('../services/creartoken');
var auth = require('../middlewares/auth');
var moment = require('moment');
var fecha = moment().format('YYYY-MM-DD');
var hora = moment().format('HH:mm:ss');


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
var estaAutenticado = auth.isAuth;

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

router.get('/importar', auth, (req, res, next) => {
    res.render(path.join(__dirname, '../', 'views', 'importar'));
});

router.get('/ejecutar-regla', auth, (req, res, next) => {
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

            res.render('ejecutar-regla', {resultadosClientes:resultadosClientes, resultadosReglas:resultadosReglas});
        }
    });
});

// Guarda los socket clientes
var usuariosConectados = {}

io.on('connection', function(socket){
    console.log('Un usuario se ha conectado');
    socket.on('net', function(direccionIP){

        // Este diccionario guarda las IP que estan conectadas con su respectivo objeto socket.
        usuariosConectados[direccionIP] = {socket}
       // console.log(usuariosConectados);
        // usuariosConectados.push({
        //     direccionIP:socket
        // })
        console.log(usuariosConectados)
        // Recibe los datos del socket cliente que se conecto.    
        datos = {
            direccionIP: direccionIP,
            socketID: socket.id
        }

        console.log('\n\n');
        console.log('direccionIP = ' + datos.direccionIP);
        console.log('socketID = ' + datos.socketID);
        //console.log('\n\n');

        con.query("INSERT INTO clientes SET ?", datos, function (error, res, fields) {
            if (error) {
                console.log(error);
                console.log('No se ha insertado el cliente porque ya se encuentra en la base de datos.');
                //console.log("\n\nERROR:\n\n", error.code, "\n\n");
            } else {
                console.log("Cliente " + direccionIP + " insertado exitosamente.");
            }
        }); 

        socket.on('disconnect', function () {
            console.log('El cliente ' + direccionIP + ' se ha desconectado.');

            con.query("DELETE FROM clientes WHERE direccionIP=?", datos.direccionIP, function (error, res, fields) {
                if (error) {
                    console.log("\n\nERROR:\n\n", error.code, "\n\n");
                } else {
                    console.log("Cliente " + direccionIP + " eliminado exitosamente.");
                    delete usuariosConectados[direccionIP];
                }
                console.log(usuariosConectados);
        }); 
            //delete usuariosConectados[socket.id]; // Remover al cliente del arreglo
    });
});
});

router.get('/private', auth, function(req, res){
    res.status(200).send({mensaje: 'autorizado'});
});
  

router.post('/login', urlencodedParser, function(req,res){

    var email = req.body.email;
    var password = req.body.password;
  
    console.log("\n\nDATOS OBTENIDOS LOGIN:\n");
    console.log("Email: " + email + "\n" + "Password: " + password + "\n");
  
    con.query('SELECT * FROM usuarios WHERE email = ?',[email], function (error, results, fields) {
    if (error) {
      res.send({
        code: 400,
        error: error
      });
    }else{
      if(results.length > 0){
        if(results[0].password == password){
            var token = crearToken(email);
            //var token = jwt.sign({user:email}, 'SecretKey');
            res.cookie('access_token', token, {httpOnly: true}).status(301).redirect('/clientes');
            //return res.status(200).send({mensaje: 'logeado correctamente', token:token, url:'clientes'})
        } else {
           return res.status(401).send({mensaje: 'Usuario y/o password incorrectos.'})
        }
      }
      else{
        return res.status(401).send({mensaje: 'Usuario y/o password incorrectos.'})
      }
    }
    });
  });



// Obtener clientes activos

router.get('/clientes', auth, function(req, res) {

    con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
        if (error) {
          console.log("\n\nERROR:\n\n", error, "\n\n");
          res.send({
            mensaje: error.code
          })
        } else {

            var resultados = [];
            
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

// Ejecutar regla en socket cliente - primer ejemplo 

router.post('/send', urlencodedParser, (req, res) => {

    var direccionIP = req.body.direccionIP;
    var saludo = req.body.saludo;
    console.log(saludo);
    if (usuariosConectados[direccionIP])
    console.log('usuariosConectados[direccionIP]:' + usuariosConectados[datos.clientes]);
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

// Ejecutar regla 
function setValue(valor) {
    idInsercion = valor;
    console.log(idInsercion);
}

var idInsercion = '';   

router.post('/pruebaejecutar',urlencodedParser, (req, res) => {

     
    var datos = {
        clientes: [req.body.clientes],
        regla: req.body.regla,
        ruta: req.body.ruta,
    }
    
    var escaneadoConExito = [];
    var escaneadoConError = [];

    console.log(datos);

    var str = (datos.clientes).toString();

    var clientesArray = str.split(',');

    if ((clientesArray).includes("todas")){
            console.log("incluye todas");
            con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields,) {
                if (error) {
                  console.log("\n\nERROR:\n\n", error, "\n\n");
                  res.send({
                    mensaje: error.code
                  })
                } else {                    
                    for(i = 0; i<results.length; i++){
                            
                        console.log(results[i].direccionIP);   

                            if (usuariosConectados[results[i].direccionIP])
                            {   
                                var direccionIP = results[i].direccionIP;

                                con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, hora, datos.ruta, datos.regla], function (error, results, fields) {
                                    if (error) {
                                      console.log("\n\nERROR:\n\n", error, "\n\n");
                                    } else {
                                        console.log(JSON.stringify(results));
                                        setValue(results.insertId);
                                    }
                                });

                                usuariosConectados[results[i].direccionIP].socket.emit('ejecutar-regla', datos, function(data){

                                    console.log('El cliente ' + direccionIP + 'termino con el código: ' + data);

                                    var codigo = data;

                                    var horaTermino = moment().format('HH:mm:ss')

                                    con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
                                        if (error) {
                                          console.log("\n\nERROR:\n\n", error, "\n\n");
                                        } else {
                                            console.log(JSON.stringify(results));
                                        }
                                    });
                                });
                            }
                            else {

                                var direccionIP = results[i].direccionIP;
                                // si el cliente no se encontraba conectado insertar el fin del escan en scansrealizados
                                var codigo = 'El cliente no se encontraba conectado.';

                                con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, horaTermino=?, ruta=?, regla=?, codigo=? ', [direccionIP, fecha, hora, hora, datos.ruta, datos.regla, codigo], function (error, results, fields) {
                                    if (error) {
                                      console.log("\n\nERROR:\n\n", error, "\n\n");
                                    } else {
                                        console.log(JSON.stringify(results));
                                    }
                                });
                            } 
                    }
                } 
            });
            
            res.send('OK');

        } else if (!(clientesArray.includes("todas")) && clientesArray.length > 1) {
                for(var i in clientesArray){
                    if (usuariosConectados[clientesArray[i]])
                    {   
                        console.log(usuariosConectados[clientesArray[i]]);

                        var direccionIP = clientesArray[i];

                        con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, hora, datos.ruta, datos.regla], function (error, results, fields) {
                            if (error) {
                              console.log("\n\nERROR:\n\n", error, "\n\n");
                            } else {
                                console.log(JSON.stringify(results));
                                setValue(results.insertId);
                            }
                        });

                        usuariosConectados[clientesArray[i]].socket.emit('ejecutar-regla', datos, function(data){

                            console.log('El cliente ' + direccionIP + 'termino con el código: ' + data);

                            var codigo = data;

                            var horaTermino = moment().format('HH:mm:ss')

                            con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
                                if (error) {
                                  console.log("\n\nERROR:\n\n", error, "\n\n");
                                } else {
                                    console.log(JSON.stringify(results));
                                }
                            });
                        });
                        
                    } 
                }
            res.send('OK');
         
    } else if (!(clientesArray.includes("todas")) && clientesArray.length == 1){
        if (usuariosConectados[datos.clientes])
        {   
            var direccionIP = datos.clientes;

            con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, hora, datos.ruta, datos.regla], function (error, results, fields) {
                if (error) {
                  console.log("\n\nERROR:\n\n", error, "\n\n");
                } else {
                    console.log(JSON.stringify(results));
                    setValue(results.insertId);
                }
            });

            usuariosConectados[datos.clientes].socket.emit('ejecutar-regla', datos, function(data){

                console.log('El cliente ' + direccionIP + 'termino con el código: ' + data);

                var codigo = data;

                var horaTermino = moment().format('HH:mm:ss')

                con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
                    if (error) {
                      console.log("\n\nERROR:\n\n", error, "\n\n");
                    } else {
                        console.log(JSON.stringify(results));
                    }
                });
            });

            res.send('OK');
           
        } else {
            console.log("El cliente no se encuentra conectado.");
            res.send("El cliente no se encuentra conectado.");
        }
    }    
});


router.get('/recolectar-resultados', auth, urlencodedParser, (req, res) => {

    con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
        if (error) {
          console.log("\n\nERROR:\n\n", error, "\n\n");
          res.send({
            mensaje: error.code
          })
        } else {

            var resultados = [];
            
            for(i = 0; i<results.length; i++){
        
                resultados.push({
                    direccionIP : results[i].direccionIP,
                });
            }
            res.render('recolectar-resultados', {resultados:resultados});
        }
        });
    
});

router.get('/reg-reglas', auth, urlencodedParser, (req, res) => {

    con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
        if (error) {
          console.log("\n\nERROR:\n\n", error, "\n\n");
          res.send({
            mensaje: error.code
          })
        } else {

            var resultados = [];
            
            for(i = 0; i<results.length; i++){
        
                resultados.push({
                    direccionIP : results[i].direccionIP,
                });
            }
            res.render('reg-reglas', {resultados:resultados});
        }
        });
    
});

router.get('/reg-escaneos', auth, urlencodedParser, (req, res) => {

    //var direccionIP = req.query.direccionIP;
    //console.log(req.query);

    async.series({
        escaneosExitosos: function(cb) {
            con.query("SELECT * FROM escaneosRealizados WHERE codigo=?", '0', function (error, result, client){
                cb(error, result);
            })
        },
        escaneosErroneos: function(cb){
            con.query("SELECT * FROM escaneosRealizados WHERE codigo<>?", '0', function (error, result, client){
                cb(error, result)
            })


        }
    }, function(error, results) {
        if (!error) {

            var escaneosExitosos = [];

            for(i = 0; i<results.escaneosExitosos.length; i++){
                console.log(results.escaneosExitosos[i])
                escaneosExitosos.push({
                    id: results.escaneosExitosos[i].id,
                    direccionIP: results.escaneosExitosos[i].direccionIP,
                    fecha: results.escaneosExitosos[i].fecha,
                    horaInicio: results.escaneosExitosos[i].horaInicio,
                    horaTermino: results.escaneosExitosos[i].horaTermino,
                    ruta: results.escaneosExitosos[i].ruta,
                    regla: results.escaneosExitosos[i].regla,
                    codigo: results.escaneosExitosos[i].codigo,

                });
                escaneosExitosos[i].fecha = escaneosExitosos[i].fecha.toISOString().substr(0,10);
            }

            var escaneosErroneos = [];

            for(i = 0; i<results.escaneosErroneos.length; i++){
                console.log(results.escaneosErroneos[i])
                escaneosErroneos.push({
                    id: results.escaneosErroneos[i].id,
                    direccionIP: results.escaneosErroneos[i].direccionIP,
                    fecha: results.escaneosErroneos[i].fecha,
                    horaInicio: results.escaneosErroneos[i].horaInicio,
                    horaTermino: results.escaneosErroneos[i].horaTermino,
                    ruta: results.escaneosErroneos[i].ruta,
                    regla: results.escaneosErroneos[i].regla,
                    codigo: results.escaneosErroneos[i].codigo,
                });
                escaneosErroneos[i].fecha = escaneosErroneos[i].fecha.toISOString().substr(0,10);
                if (escaneosErroneos[i].horaTermino == '00:00:00') {
                    escaneosErroneos[i].codigo = 'El cliente se desconectó abruptamente.'
                }
            }
            res.render('reg-escaneos', {escaneosExitosos:escaneosExitosos, escaneosErroneos:escaneosErroneos});
        }
    });
});

router.get('/reg-eliminados', auth, urlencodedParser, (req, res) => {

    con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
        if (error) {
          console.log("\n\nERROR:\n\n", error, "\n\n");
          res.send({
            mensaje: error.code
          })
        } else {

            var resultados = [];
            
            for(i = 0; i<results.length; i++){
        
                resultados.push({
                    direccionIP : results[i].direccionIP,
                    //socketID: results[i].socketID
                });
            }
            res.render('reg-eliminados', {resultados:resultados});
        }
        }); 
});

router.post('/eliminar-archivos', urlencodedParser, (req, res) => {

var datos = {
    direccionIP: req.body.direccionIP,
    rutas: req.body.cboxes,
}

// cuando se eliminan despues borrar los archivos maliciosos que se hayan borrado de la tabla de archivos maliciosos

if (usuariosConectados[datos.direccionIP])
        {   
            usuariosConectados[datos.direccionIP].socket.emit('eliminar-archivos', datos, function(data) {

                var noEliminados = [];

                for (var i=0; i<(data.eliminadosError).length; i++){
                    noEliminados.push(data.eliminadosError[i][0]);
                }

                var registrosExito = [];
                var registrosError = [];


                for(var i=0; i<(data.eliminadosExito).length; i++) {
                    var fila = [];
                    var ruta = data.eliminadosExito[i];
                    var fechaActual = fecha;
                    var horaActual = hora;
                    var direccionIP = datos.direccionIP;
                    fila.push(ruta, fechaActual, horaActual, direccionIP);
                    registrosExito.push(fila);
                }

                for(var i=0; i<(data.eliminadosError).length; i++) {
                    var fila = [];
                    var ruta = data.eliminadosError[i][0];
                    var motivo = data.eliminadosError[i][1];
                    var fechaActual = fecha;
                    var horaActual = hora;
                    var direccionIP = datos.direccionIP;
                    fila.push(ruta, motivo, fechaActual, horaActual, direccionIP);
                    registrosError.push(fila);
                }

                for (i = 0; i < registrosExito.length; i++)
                {
                    console.log("registrosExito[" + i + "]=" + registrosExito[i]);
                }

                for (i = 0; i < registrosError.length; i++)
                {
                    console.log("registrosError[" + i + "]=" + registrosError[i]);
                }

                if (registrosExito.length > 0) {
                    con.query('INSERT ignore INTO archivosEliminados (ruta, fecha, hora, direccionIP) VALUES ?', [registrosExito], function (error, results, fields) {
                        if (error) {
                          console.log("\n\nERROR:\n\n", error, "\n\n");
                        } else {
                            console.log(JSON.stringify(results));
                        }
                    });
                }

                if (registrosError.length > 0) {
                    con.query('INSERT ignore INTO elimErrorLog (ruta, motivo, fecha, hora, direccionIP) VALUES ?', [registrosError], function (error, results, fields) {
                        if (error) {
                          console.log("\n\nERROR:\n\n", error, "\n\n");
                        } else {
                            console.log(JSON.stringify(results));
                        }
                    });
                }
        
                res.send({data, noEliminados});
            });

        } else {
            console.log("El cliente no se encuentra conectado.");
            res.send({
                data: "El cliente no se encuentra conectado."
            });
        }
});

router.get('/obtener-resultados-IP', function(req, res) {

    var direccionIP = req.query.direccionIP;

        if (usuariosConectados[direccionIP])
        {   
            usuariosConectados[direccionIP].socket.emit('obtener-resultados', function(data) {

                var array = data.split("\n");
                
                array.splice(-1,1)

                var registros = [];


                for (var i in array){

                    var fila = [];

                    var temp = array[i].split(","); // se separa el primer array por fila a un array temp.

                    temp2 = temp.toString(); // se convierte el array a string.
                    
                    var clasificacion = temp2.substr(0, temp2.indexOf(' ')); // se obtiene la clasificacion.
                    var ruta = temp2.substr(temp2.indexOf(' ')+1); // se obtiene la ruta.

                    fila.push(direccionIP, clasificacion, ruta); // se pushea todo a una fila nueva

                    registros.push(fila);
                }

                for (i = 0; i < registros.length; i++)
                {
                    console.log("registros[" + i + "]=" + registros[i]);
                }

                con.query('INSERT ignore INTO archivosMaliciosos (direccionIP, clasificacion, nombre) VALUES ?', [registros], function (error, results, fields) {
                    if (error) {
                      console.log("\n\nERROR:\n\n", error, "\n\n");
                    } else {
                        console.log(JSON.stringify(results));
                    }
                    });
            });

        } else {
            console.log("El cliente no se encuentra conectado.");
            // res.send({
            //     data: "El cliente no se encuentra conectado."
            // });
        }

        con.query('SELECT * FROM archivosMaliciosos WHERE direccionIP=?', direccionIP, function (error, results, fields) {
            if (error) {
            console.log("\n\nERROR:\n\n", error, "\n\n");
            res.send({
                mensaje: error.code
            })
            } else {
                console.log(JSON.stringify(results));
                res.json(results);
            }
        });
});

router.get('/obtener-logs-eliminados', function(req, res) {

    var direccionIP = req.query.direccionIP;
    console.log(req.query);

    async.series({
        archivosEliminados: function(cb) {
            con.query("SELECT ruta, fecha, hora FROM archivosEliminados WHERE direccionIP=?", direccionIP, function (error, result, client){
                cb(error, result);
            })
        },
        eliminadosError: function(cb){
            con.query("SELECT ruta, motivo, fecha, hora FROM elimErrorLog WHERE direccionIP=?", direccionIP, function (error, result, client){
                cb(error, result)
            })


        }
    }, function(error, results) {
        if (!error) {

            var archivosEliminados = [];

            for(i = 0; i<results.archivosEliminados.length; i++){
                console.log(results.archivosEliminados[i])
                archivosEliminados.push({
                    ruta : results.archivosEliminados[i].ruta,
                    fecha: results.archivosEliminados[i].fecha,
                    hora: results.archivosEliminados[i].hora
                });
                archivosEliminados[i].fecha = archivosEliminados[i].fecha.toISOString().substr(0,10);
            }

            var eliminadosError = [];

            for(i = 0; i<results.eliminadosError.length; i++){
                console.log(results.eliminadosError[i])
                eliminadosError.push({
                    ruta : results.eliminadosError[i].ruta,
                    motivo: results.eliminadosError[i].motivo,
                    fecha: results.eliminadosError[i].fecha,
                    hora: results.eliminadosError[i].hora
                });
                console.log((eliminadosError[i].fecha).toISOString().substr(0,10));
                eliminadosError[i].fecha = eliminadosError[i].fecha.toISOString().substr(0,10);
            }

            //res.render('ejecutar-regla', {resultadosClientes:resultadosClientes, resultadosReglas:resultadosReglas});
            res.send({archivosEliminados, eliminadosError});
        }
    });
});

return router;
}