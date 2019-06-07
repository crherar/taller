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

router.post('/pruebaejecutar',urlencodedParser, (req, res) => {
    
    var datos = {
        clientes: [req.body.clientes],
        regla: req.body.regla,
        ruta: req.body.ruta,
    }
    
    var escaneadoConExito = [];
    var escaneadoConError = [];

    // for (var k in datos){
    //     if (datos.hasOwnProperty(k)) {
    //          console.log("Key is " + k + ", value is " + typeof(datos[k]));
    //     }
    // }
    // var keys = Object.keys(myObject);

    // console.log(typeof(datos.clientes).toString());
    var str = (datos.clientes).toString();
    // console.log('str =' + str);
    // console.log('typeof str =' + typeof(str));
    var clientesArray = str.split(',');
    // console.log(clientesArray);
    // console.log(clientesArray.length);
    // console.log(typeof(clientesArray));

    if ((clientesArray).includes("todas")){
            console.log("incluye todas");
            //clientesArray.splice(clientesArray.indexOf('todas'), 1);
            // console.log('Escaneando todas las IP...');
            // console.log('Lista de IPs = ' + clientesArray);
            con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
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
                                usuariosConectados[results[i].direccionIP].socket.emit('ejecutar-regla', datos);
                                escaneadoConExito.push({
                                    key:   results[i].direccionIP,
                                    value: "Recibido."
                                });
                            } 
                                else {
                                    escaneadoConError.push({
                                        key:   results[i].direccionIP,
                                        value: "Cliente no se encuentra conectado."
                                    });
                                }
                            }
                    } 
                });
                res.send('OK');

        } else if (!(clientesArray.includes("todas")) && clientesArray.length > 1) {
            console.log('clientesArray=' + clientesArray);
            console.log(clientesArray.length);
                for(var i in clientesArray){
                    console.log('i= ' + i)
                    if (usuariosConectados[clientesArray[i]])
                    {   
                        console.log(usuariosConectados[clientesArray[i]]);
                        usuariosConectados[clientesArray[i]].socket.emit('ejecutar-regla', datos);
                        escaneadoConExito.push({
                            key:   clientesArray[i],
                            value: "Recibido."
                        });
                    } 
                    else {
                        escaneadoConError.push({
                            key:   clientesArray[i],
                            value: "Cliente no se encuentra conectado."
                        });
                    }
            }
            res.send('OK');
         
    } else if (!(clientesArray.includes("todas")) && clientesArray.length == 1){
        if (usuariosConectados[datos.clientes])
        {   
            usuariosConectados[datos.clientes].socket.emit('ejecutar-regla', datos);
            res.send({
                data: "recibido"
            });
        } else {
            console.log("El cliente no se encuentra conectado.");
            res.send({
                data: "El cliente no se encuentra conectado."
            });
        }
    }    
});

// Ejecutar regla 

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
                    //socketID: results[i].socketID
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
                    //socketID: results[i].socketID
                });
            }
            res.render('reg-reglas', {resultados:resultados});
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

// console.log(req.body.cboxes);
// console.log(req.body.direccionIP);

var datos = {
    direccionIP: req.body.direccionIP,
    rutas: req.body.cboxes,
}

console.log('datos.direccionIP= ' + datos.direccionIP);
console.log('datos.cboxes= ' + datos.cboxes);
console.log('datos.cboxes typeof= ' + typeof(datos.cboxes));
// cuando se eliminan despues borrar los archivos maliciosos que se hayan borrado de la tabla de archivos maliciosos
// 


if (usuariosConectados[datos.direccionIP])
        {   
            usuariosConectados[datos.direccionIP].socket.emit('eliminar-archivos', datos, function(data) {
                
                console.log((data));
                console.log(typeof(data));

                var registros = [];

                for(var i=0; i<data.length; i++) {
                    console.log('i=' + i)
                    var fila = [];
                    var ruta = data[i][0];
                    var motivo = data[i][1];
                    var fecha = 'test';
                    var direccionIP = datos.direccionIP;
                    fila.push(ruta, motivo, fecha, direccionIP);
                    registros.push(fila);
                }

                for (i = 0; i < registros.length; i++)
                {
                    console.log("registros[" + i + "]=" + registros[i]);
                }



                // var registros = [];

                // for (var i in array) {
                //     //console.log(temp)
                //     var fila = [];

                //     var temp = array[i].split(","); // se separa el primer array por fila a un array temp.

                //     temp2 = temp.toString(); // se convierte el array a string.
                    
                //     var clasificacion = temp2.substr(0, temp2.indexOf(' ')); // se obtiene la clasificacion.
                //     var ruta = temp2.substr(temp2.indexOf(' ')+1); // se obtiene la ruta.

                //     fila.push(direccionIP, clasificacion, ruta); // se pushea todo a una fila nueva

                //     registros.push(fila);
                // }
                // console.log(registros);

                // con.query('INSERT ignore INTO elimErrorLog (rutas, motivo, fecha, direccionIP) VALUES ?', [registros], function (error, results, fields) {
                //     if (error) {
                //       console.log("\n\nERROR:\n\n", error, "\n\n");
                //     } else {
                //         console.log(JSON.stringify(results));
                //     }
                //     });
                res.send(data);
            });

        } else {
            console.log("El cliente no se encuentra conectado.");
            res.send({
                data: "El cliente no se encuentra conectado."
            });
        }
});

router.get('/api/books/', function(req, res) {

    //console.log(req.query.direccionIP);
    var direccionIP = req.query.direccionIP;

        if (usuariosConectados[direccionIP])
        {   
            usuariosConectados[direccionIP].socket.emit('obtener-resultados', function(data) {
                
                //var archivosMaliciosos = data;

                var array = data.split("\n");
                
                array.splice(-1,1)

                var registros = [];

                //console.log(array);

                for (var i in array){
                    //console.log(temp)
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

    // if (usuariosConectados[direccionIP])
    // {   
    //     usuariosConectados[direccionIP].socket.emit('obtener-resultados', datos);
    //     res.send({
    //         data: "recibido"
    //     });
    // } else {
    //     console.log("El cliente no se encuentra conectado.");
    //     res.send({
    //         data: "El cliente no se encuentra conectado."
    //     });
    // }

    
    

    // res.json({
    //   message: 'Your database information', pico:'holi'
    // });


    //res.render('recolectar-resultados', {resultados:'holi'});
});

// router.get('/api/books2', urlencodedParser, function(req, res) {
//     console.log(req.body)
//     res.json({
//       message: '<table><th>header</th><tr><td>hola</td></tr></table>'
//     });
// });
return router;
}