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

async function escanear(ip, regla, ruta, callback) {

    var datos = {
        regla: regla,
        ruta: ruta,
    }

    var horaInicio = moment().format('HH:mm:ss');

    con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [ip, fecha, horaInicio, datos.ruta, datos.regla], function (error, results, fields) {
        if (error) {
            console.log("\n\nERROR:\n\n", error, "\n\n");
        } else {
            console.log(JSON.stringify(results));
            var idInsercion = results.insertId;
            if(usuariosConectados[ip]) {
                usuariosConectados[ip].socket.emit('ejecutar-regla', datos, function(data){

                    console.log('El cliente ' + ip + ' termino con el código: ' + data);
    
                    var codigo = data;

                    if (codigo == '1') {
                        codigo = 'El proceso terminó de forma erronea.';
                    }

                    var horaTermino = moment().format('HH:mm:ss');
    
                    con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
                        if (error) {
                            console.log("\n\nERROR:\n\n", error, "\n\n");
                        } else {
                            console.log(JSON.stringify(results));
                        }
                    });
                    callback(data);  
                });
            } 
        }
    });
}



router.post('/pruebaejecutar',urlencodedParser, (req, res) => {

    var datos = {
        clientes: [req.body.clientes],
        regla: req.body.regla,
        ruta: req.body.ruta,
    }
    
    var str = (datos.clientes).toString();
    var clientesArray = str.split(',');

    var escaneadoConExito = [];
    var escaneadoConError = [];

    if ((clientesArray).includes("todas")){
        con.query('SELECT direccionIP FROM clientes', function (error, results, fields) {
                if (error) {
                  console.log("\n\nERROR:\n\n", error, "\n\n");
                  res.send({
                    mensaje: error.code
                  })
                } else {   
                    var direccionesIP = [];
                    for(i = 0; i<results.length; i++){
                        console.log('RESULTS[' + i + ']= ' + results[i].direccionIP);                 
                        direccionesIP.push(results[i].direccionIP);
                    }
                    async.forEachOfSeries(direccionesIP, function(value, key, callback) {
                        if (!usuariosConectados[value]){
                            var hora = moment().format('HH:mm:ss');
                            var codigo = 'No se pudo establecer conexión con el cliente.';
                            con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, horaTermino=?, ruta=?, regla=?, codigo=? ', [value, fecha, hora, hora, datos.ruta, datos.regla, codigo], function (error, results, fields) {
                                if (error) {
                                    console.log("\n\nERROR:\n\n", error, "\n\n");
                                } else {
                                    console.log(JSON.stringify(results));
                                }
                            });
                            //escaneadoConError.push(value);
                        } else {
                            escanear(value, datos.regla, datos.ruta, function(err) {
                                if(err) {
                                    callback(err);
                                    return;
                                } 
                            });
                            callback();
                            //escaneadoConExito.push(value);
                        }
                    }, function(err){
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('todo bien');
                        }
                    });  
                }
            });
            //res.send({escaneadoConExito, escaneadoConError});
            res.send('Enviado');

        } else if (!(clientesArray.includes("todas")) && clientesArray.length > 1) {

            async.forEachOfSeries(clientesArray, function(value, key, callback) {
                if (!usuariosConectados[value]){
                    var hora = moment().format('HH:mm:ss');
                    var codigo = 'No se pudo establecer conexión con el cliente.';
                    con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, horaTermino=?, ruta=?, regla=?, codigo=? ', [value, fecha, hora, hora, datos.ruta, datos.regla, codigo], function (error, results, fields) {
                        if (error) {
                            console.log("\n\nERROR:\n\n", error, "\n\n");
                        } else {
                            console.log(JSON.stringify(results));
                        }
                    });
                    //escaneadoConError.push(value);
                } else {
                    escanear(value, datos.regla, datos.ruta, function(err) {
                        if(err) {
                            callback(err);
                            return;
                        } 
                    });
                    callback();
                    //escaneadoConExito.push(value);
                }
            }, function(err){
                if (err) {
                    console.log(err);
                } else {
                    console.log('todo bien');
                }
            });
            //res.send({escaneadoConExito, escaneadoConError});
            res.send('Enviado');

        } else if (!(clientesArray.includes("todas")) && clientesArray.length == 1) {

            var direccionIP = datos.clientes;
            var ruta = datos.ruta;
            var regla = datos.regla;
            var horaInicio = moment().format('HH:mm:ss');
            var codigo = 'No se pudo establecer conexión con el cliente.';
            
            if (usuariosConectados[direccionIP])
            {   
                escanear(direccionIP, datos.regla, datos.ruta, function(err) {
                    if(err) {
                        console.log(err);
                        return;
                    } 
                });
                res.send('Enviado');
            
            } else {
                con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=?, codigo=?', [direccionIP, fecha, horaInicio, ruta, regla, codigo], function (error, results, fields) {
                    if (error) {
                    console.log("\n\nERROR:\n\n", error, "\n\n");
                    } else {
                        console.log(JSON.stringify(results));
                    }
                });
                console.log("El cliente no se encuentra conectado.");
                res.send("El cliente no se encuentra conectado.");
            }
        }    
});


router.post('/reescanear',urlencodedParser, (req, res) => {

    var datos = req.body;
    datos = datos['datos'];

    var reescanConExito = [];
    var reescanConError = [];
   // var direccionP = [];

    console.log(datos.length);

    async.forEachOfSeries(datos, function(value, key, callback) {

        let direccionIP = value[0];
        let regla = value[1];
        let ruta = value[2];

        if (!usuariosConectados[direccionIP]){
                var hora = moment().format('HH:mm:ss');
                var codigo = 'No se pudo establecer conexión con el cliente.';
                con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, horaTermino=?, ruta=?, regla=?, codigo=? ', [direccionIP, fecha, hora, hora, ruta, regla, codigo], function (error, results, fields) {
                    if (error) {
                        console.log("\n\nERROR:\n\n", error, "\n\n");
                    } else {
                        console.log(JSON.stringify(results));
                    }
                });
                //reescanConError.push(direccionIP);
            } else {
                escanear(direccionIP, regla, ruta, function(err) {
                    if(err) {
                        callback(err);
                        return;
                    } 
                });
                //reeescanConExito.push(direccionIP);
            }
        }, function(err){
            if (err) {
                console.log(err);
            } else {
                console.log('todo bien');
            }
    });
    res.send('ok');
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
                //console.log(results.escaneosExitosos[i])
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
                //console.log(results.escaneosErroneos[i])
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
                if (escaneosErroneos[i].codigo == 'No se pudo establecer conexión con el cliente.') {
                    escaneosErroneos[i].horaTermino = '--:--:--'
                    //escaneosErroneos[i].codigo = 'El cliente se desconectó abruptamente.'
                }
            }
            res.render('reg-escaneos', {escaneosExitosos:escaneosExitosos, escaneosErroneos:escaneosErroneos});
        }
    });
});

router.get('/reg-eliminados', auth, urlencodedParser, (req, res) => {

    con.query('SELECT direccionIP FROM archivosMaliciosos GROUP BY direccionIP', function (error, results, fields) {
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

// var datos = {
//     direccionIP: req.body.direccionIP,
//     rutas: req.body.cboxes,
// }

var datos = req.body.datos;

//console.log(datos);

var usuariosNoConectados = [];
var usuariosConectadosAct = [];

var respuesta = {};

// cuando se eliminan despues borrar los archivos maliciosos que se hayan borrado de la tabla de archivos maliciosos

for (var i in req.body.datos){

    let direccionIP = i;
    //console.log('i = ' + i);
    //console.log('datos[i] = ' + datos[i]);

    if (usuariosConectados[i])
        {
            usuariosConectadosAct.push(direccionIP);
            usuariosConectados[i].socket.emit('eliminar-archivos', datos[i], function(data) {

                var noEliminados = [];

                for (var i=0; i<(data.eliminadosError).length; i++){
                    noEliminados.push(data.eliminadosError[i][0]);
                }

                var registrosExito = [];
                var registrosError = [];
                var eliminar = [];

                for(var i=0; i<(data.eliminadosExito).length; i++) {
                    var fila = [];
                    var subarrayEliminar = [];
                    var ruta = data.eliminadosExito[i];
                    var fechaActual = moment().format('YYYY-MM-DD');
                    var horaActual = moment().format('HH:mm:ss');
                    //var direccionIP = dirIP;
                    fila.push(ruta, fechaActual, horaActual, direccionIP);
                    registrosExito.push(fila);
                    subarrayEliminar.push(direccionIP, ruta)
                    eliminar.push(subarrayEliminar);
                }

                for(var i=0; i<(data.eliminadosError).length; i++) {
                    var fila = [];
                    var ruta = data.eliminadosError[i][0];
                    var motivo = data.eliminadosError[i][1];
                    var fechaActual = moment().format('YYYY-MM-DD');
                    var horaActual = moment().format('HH:mm:ss');
                    //var direccionIP = dirIP;
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

                // for (i = 0; i < eliminar.length; i++)
                // {
                //     console.log("eliminar[" + i + "]=" +  eliminar[i]);
                // }

                if (registrosExito.length > 0) {

                    con.query('INSERT INTO archivosEliminados (ruta, fecha, hora, direccionIP) VALUES ?', [registrosExito], function (error, results, fields) {
                        if (error) {
                          console.log("\n\nERROR:\n\n", error, "\n\n");
                        } else {
                            console.log(JSON.stringify(results));
                        }
                    });

                    // for (var i=0; i<eliminar.length; i++) {
                    //     con.query("DELETE FROM archivosMaliciosos WHERE direccionIP=? AND nombre=?", [eliminar[i]], function (error, results, fields) {
                    //         if (error) {
                    //             console.log("\n\nERROR:\n\n", error.code, "\n\n");
                    //         } else {
                    //             console.log('Borrando de archivos maliciosos: ' + JSON.stringify(results));
                    //         }
                    //     }); 
                    // }
                }

                if (registrosError.length > 0) {
                    con.query('INSERT INTO elimErrorLog (ruta, motivo, fecha, hora, direccionIP) VALUES ?', [registrosError], function (error, results, fields) {
                        if (error) {
                          console.log("\n\nERROR:\n\n", error, "\n\n");
                        } else {
                            console.log(JSON.stringify(results));
                        }
                    });
                }
        
            });

        } else {
            usuariosNoConectados.push(direccionIP)
            console.log("El cliente no se encuentra conectado.");
        }
    }
    //console.log(usuariosNoConectados + ' ' + respuesta['10.0.2.4']);
    res.send({usuariosConectadosAct, usuariosNoConectados});
});


router.get('/recolectar-resultados', function(req, res) {

    con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields,) {
        if (error) {
          console.log("\n\nERROR:\n\n", error, "\n\n");
          res.send({
            mensaje: error.code
          })
        } else {  

                for(i = 0; i<results.length; i++){

                    let direccionIP = results[i].direccionIP;

                    if (usuariosConectados[direccionIP]) {   
                        
                        console.log('results[' + i + '].direccionIP=' + direccionIP);
                        
                        usuariosConectados[direccionIP].socket.emit('obtener-resultados', function(data) {
                                
                            console.log('ejecutando en results[' + i + '].direccionIP=' + direccionIP);
                                var array = data.split("\n");
                    
                                //array.splice(-1,1)
                
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

                                con.query("DELETE FROM archivosMaliciosos WHERE direccionIP=?", direccionIP, function (error, res, fields) {
                                    if (error) {
                                        console.log("\n\nERROR:\n\n", error.code, "\n\n");
                                    } else {
                                        console.log('Actualizando tabla archivosMaliciosos:\n' + JSON.stringify(results));
                                        con.query('INSERT INTO archivosMaliciosos (direccionIP, clasificacion, nombre) VALUES ?', [registros], function (error, results, fields) {
                                            if (error) {
                                              console.log("\n\nERROR:\n\n", error, "\n\n");
                                            } else {
                                                console.log(JSON.stringify(results));
                                            }
                                        });
                                    }
                                });     
                            });
                        }
                        
                        // else {
                        //     res.send('el usuario no estaba conectado');
                        // } 
         
                }      
    } 
});

        setTimeout(function() {
                    con.query('SELECT * FROM archivosMaliciosos', function (error, results, fields) {
                        if (error) {
                        console.log("\n\nERROR:\n\n", error, "\n\n");
                        res.send({
                            mensaje: error.code
                        })
                        } else {
                            console.log(JSON.stringify(results));
                            res.render('recolectar-resultados', {results:results});
                        }
                    });
        }, 2000)
        });

    // var direccionIP = req.query.direccionIP;

    //     if (usuariosConectados[direccionIP])
    //     {   
    //         usuariosConectados[direccionIP].socket.emit('obtener-resultados', function(data) {


    //         });

    //     } else {
    //         console.log("El cliente no se encuentra conectado.");
    //         // res.send({
    //         //     data: "El cliente no se encuentra conectado."
    //         // });
    //     }



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

function percentage(partialValue, totalValue) {
    return (100 * partialValue) / totalValue;
 } 

 router.get('/global', function(req, res) {
    res.render('global');
 });

router.get('/graficos', function(req, res) {

    async.series({
        cantClientes: function(cb) {
            con.query("SELECT COUNT(direccionIP) as cantidad FROM clientes", function (error, result, client){
                cb(error, result);
            })
        },
        malwareMasFrecuente: function(cb) {
            con.query("SELECT clasificacion, COUNT(*) maximo FROM archivosMaliciosos GROUP BY clasificacion ORDER BY maximo DESC LIMIT 1", function (error, result, client){
                cb(error, result);
            })
        },
        tipoMalwarePorCliente: function(cb) {
            con.query("SELECT direccionIP, GROUP_CONCAT(DISTINCT(clasificacion)) clasificacion FROM archivosMaliciosos GROUP BY direccionIP", function (error, result, client){
                cb(error, result);
            })
        },
        cantTipoMalware: function(cb) {
            con.query("SELECT clasificacion FROM archivosMaliciosos GROUP BY clasificacion", function (error, result, client){
                cb(error, result);
            })
        },
        cantMalwarePorcentaje: function(cb) {
            con.query("SELECT clasificacion, COUNT(*) as Total FROM archivosMaliciosos GROUP BY clasificacion", function (error, result, client){
                cb(error, result);
            })
        },
        cantClientesInfectados: function(cb){
            con.query("SELECT direccionIP FROM archivosMaliciosos GROUP BY direccionIP", function (error, result, client){
                cb(error, result)
            })


        }
    }, function(error, results) {
        if (!error) {

            var cantClientes = results.cantClientes;
            var malwareMasFrecuente = results.malwareMasFrecuente;
            var tipoMalwarePorCliente = results.tipoMalwarePorCliente;
            var tipoMalware = results.cantTipoMalware.length;
            var cantTipoMalware = results.cantTipoMalware.length;
            var cantMalwarePorcentaje = results.cantMalwarePorcentaje;
            var clientesInfectados = results.cantClientesInfectados;
            var cantClientesInfectados = results.cantClientesInfectados.length;
            var cantMalwarePorcentaje = results.cantMalwarePorcentaje;
            //console.log(results.cantClientes);
            console.log(clientesInfectados);
            console.log(tipoMalwarePorCliente);
            console.log(malwareMasFrecuente);


            res.send({
                cantClientes:cantClientes,
                malwareMasFrecuente: malwareMasFrecuente,
                tipoMalwarePorCliente:tipoMalwarePorCliente,
                cantTipoMalware:cantTipoMalware, 
                cantMalwarePorcentaje:cantMalwarePorcentaje,
                clientesInfectados:clientesInfectados,
                cantClientesInfectados:cantClientesInfectados});
        }
    });

    //res.render('global');
});

return router;
}