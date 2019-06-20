router.post('/pruebaejecutar',urlencodedParser, (req, res) => {

    var datos = {
        clientes: [req.body.clientes],
        regla: req.body.regla,
        ruta: req.body.ruta,
    }
    
    console.log(datos);

    var str = (datos.clientes).toString();

    var clientesArray = str.split(',');

    if ((clientesArray).includes("todas")){

        let escaneadoConExito = [];
        let escaneadoConError = [];

            console.log("incluye todas");
            con.query('SELECT direccionIP FROM clientes', function (error, results, fields,) {
                if (error) {
                  console.log("\n\nERROR:\n\n", error, "\n\n");
                  res.send({
                    mensaje: error.code
                  })
                } else {   
                    console.log('RESULTS= ' + results);                 
                    // for(i = 0; i<results.length; i++){
                    async.forEachOfSeries(results, function(value, key, callback) {
                        
                        console.log(results);
                        callback()
                    }, function(err){
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('todo bien');
                        }
                    });  
                }
            });
        }
    //                     console.log(results[i].direccionIP);   

    //                         if (usuariosConectados[results[i].direccionIP])
    //                         {   
    //                             var direccionIP = results[i].direccionIP;
    //                             var horaInicio = moment().format('HH:mm:ss');

    //                             escaneadoConExito.push(direccionIP);

    //                             con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, horaInicio, datos.ruta, datos.regla], function (error, results, fields) {
    //                                 if (error) {
    //                                   console.log("\n\nERROR:\n\n", error, "\n\n");
    //                                 } else {
    //                                     console.log(JSON.stringify(results));
    //                                     setValue(results.insertId);
    //                                 }
    //                             });

    //                             usuariosConectados[results[i].direccionIP].socket.emit('ejecutar-regla', datos, function(data){

    //                                 console.log('El cliente ' + direccionIP + 'termino con el código: ' + data);

    //                                 var codigo = data;

    //                                 var horaTermino = moment().format('HH:mm:ss');

    //                                 con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
    //                                     if (error) {
    //                                       console.log("\n\nERROR:\n\n", error, "\n\n");
    //                                     } else {
    //                                         console.log(JSON.stringify(results));
    //                                     }
    //                                 });
    //                             });
    //                         }
    //                         else {

    //                             var direccionIP = results[i].direccionIP;
    //                             // si el cliente no se encontraba conectado insertar el fin del escan en scansrealizados
    //                             var codigo = 'El cliente no se encontraba conectado.';

    //                             escaneadoConError.push(direccionIP);

    //                             con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, horaTermino=?, ruta=?, regla=?, codigo=? ', [direccionIP, fecha, hora, hora, datos.ruta, datos.regla, codigo], function (error, results, fields) {
    //                                 if (error) {
    //                                   console.log("\n\nERROR:\n\n", error, "\n\n");
    //                                 } else {
    //                                     console.log(JSON.stringify(results));
    //                                 }
    //                             });
    //                         } 
    //                 }
    //             // } 
    //         });
    //         //console.log('escaneados: ' + escaneadoConError + escaneadoConExito)      
    //         res.send('Enviado');

    //     } else if (!(clientesArray.includes("todas")) && clientesArray.length > 1) {
    //             for(var i in clientesArray){
    //                 if (usuariosConectados[clientesArray[i]])
    //                 {   
    //                     console.log(usuariosConectados[clientesArray[i]]);

    //                     var direccionIP = clientesArray[i];
    //                     var horaInicio = moment().format('HH:mm:ss')

    //                     escaneadoConExito.push(direccionIP);

    //                     con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, horaInicio, datos.ruta, datos.regla], function (error, results, fields) {
    //                         if (error) {
    //                           console.log("\n\nERROR:\n\n", error, "\n\n");
    //                         } else {
    //                             console.log(JSON.stringify(results));
    //                             setValue(results.insertId);
    //                         }
    //                     });

    //                     usuariosConectados[clientesArray[i]].socket.emit('ejecutar-regla', datos, function(data){

    //                         console.log('El cliente ' + direccionIP + 'termino con el código: ' + data);

    //                         var codigo = data;

    //                         var horaTermino = moment().format('HH:mm:ss');

    //                         con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
    //                             if (error) {
    //                               console.log("\n\nERROR:\n\n", error, "\n\n");
    //                             } else {
    //                                 console.log(JSON.stringify(results));
    //                             }
    //                         });
    //                     });
                        
    //                 } 
    //             }
    //         res.send('Enviado');
         
    // } else if (!(clientesArray.includes("todas")) && clientesArray.length == 1){
    //     if (usuariosConectados[datos.clientes])
    //     {   
    //         var direccionIP = datos.clientes;
    //         var horaInicio = moment().format('HH:mm:ss');

    //         con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, horaInicio, datos.ruta, datos.regla], function (error, results, fields) {
    //             if (error) {
    //               console.log("\n\nERROR:\n\n", error, "\n\n");
    //             } else {
    //                 console.log(JSON.stringify(results));
    //                 setValue(results.insertId);
    //             }
    //         });

    //         usuariosConectados[datos.clientes].socket.emit('ejecutar-regla', datos, function(data){

    //             console.log('El cliente ' + direccionIP + ' termino con el código: ' + data);

    //             var codigo = data;

    //             if (codigo == '1') {
    //                 codigo = 'El proceso terminó de forma erronea.';
    //             }

    //             var fechaActual = moment().format('YYYY-MM-DD');
    //             var horaTermino = moment().format('HH:mm:ss');

    //             con.query('UPDATE escaneosRealizados SET horaTermino=?, codigo=? WHERE id=?', [horaTermino, codigo, idInsercion], function (error, results, fields) {
    //                 if (error) {
    //                   console.log("\n\nERROR:\n\n", error, "\n\n");
    //                 } else {
    //                     console.log(JSON.stringify(results));
    //                 }
    //             });
    //         });

    //         res.send('Enviado');
           
    //     } else {
            
    //         var direccionIP = datos.clientes;
    //         var ruta = datos.ruta;
    //         var regla = datos.regla;
    //         var fechaActual = moment().format('YYYY-MM-DD');
    //         var horaInicio = moment().format('HH:mm:ss');
    //         var codigo = 'No se pudo establecer conexión con el cliente.';

    //         con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=?, codigo=?', [direccionIP, fecha, horaInicio, ruta, regla, codigo], function (error, results, fields) {
    //             if (error) {
    //               console.log("\n\nERROR:\n\n", error, "\n\n");
    //             } else {
    //                 console.log(JSON.stringify(results));
    //                 //setValue(results.insertId);
    //             }
    //         });

    //         console.log("El cliente no se encuentra conectado.");
    //         res.send("El cliente no se encuentra conectado.");
    //     }
    // }  