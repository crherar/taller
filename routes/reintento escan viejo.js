


//  for (let i=0; i<datos.length; i++) {

//     console.log('i = ' + i);
//     let direccionIP = datos[i][0];
//     var regla = datos[i][1];
//     var ruta = datos[i][2];

//     let datos2 = {
//         regla: datos[i][1],
//         ruta:datos[i][2]
//     }
    
//     console.log('Ejecutando reescaneo en: ' + direccionIP);

//     if (usuariosConectados[direccionIP])
//         {   
//             var horaInicio = moment().format('HH:mm:ss');

//             //let idInsercion = '';
//             con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=? ', [direccionIP, fecha, horaInicio, ruta, regla], function (error, results, fields) {
//                 if (error) {
//                   console.log("\n\nERROR:\n\n", error, "\n\n");
//                 } else {
//                     console.log(JSON.stringify(results));
//                     //idInsercion = results.id;
//                     setValue(results.insertId);

//                     usuariosConectados[direccionIP].socket.emit('ejecutar-regla', datos2, function(data){

//                         console.log('El cliente ' + direccionIP + ' termino con el código: ' + data);
        
//                         var codigo = data;
        
//                         if (codigo == '1') {
//                             codigo = 'El proceso terminó de forma erronea.';
//                         }
        
//                         var fechaActual = moment().format('YYYY-MM-DD');
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
//             });

//             reescanConExito.push(direccionIP);
           
//         } else {
            
//             // var direccionIP = datos.clientes;
//             // var ruta = datos.ruta;
//             // var regla = datos.regla;
//             var fechaActual = moment().format('YYYY-MM-DD');
//             var horaInicio = moment().format('HH:mm:ss');
//             var codigo = 'No se pudo establecer conexión con el cliente.';

//             con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, ruta=?, regla=?, codigo=?', [direccionIP, fecha, horaInicio, ruta, regla, codigo], function (error, results, fields) {
//                 if (error) {
//                   console.log("\n\nERROR:\n\n", error, "\n\n");
//                 } else {
//                     console.log(JSON.stringify(results));
//                     //setValue(results.insertId);
//                 }
//             });

//             console.log("El cliente no se encuentra conectado.");
//             //res.send("El cliente no se encuentra conectado.");
//             reescanConError.push(direccionIP);
//         }
//     }
//     res.send({reescanConExito, reescanConError});