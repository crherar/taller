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


            else {
                var hora = moment().format('HH:mm:ss');
                var codigo = 'El cliente no se encontraba conectado.';
                con.query('INSERT INTO escaneosRealizados SET direccionIP=?, fecha=?, horaInicio=?, horaTermino=?, ruta=?, regla=?, codigo=? ', [ip, fecha, hora, hora, datos.ruta, datos.regla, codigo], function (error, results, fields) {
                    if (error) {
                        console.log("\n\nERROR:\n\n", error, "\n\n");
                    } else {
                        console.log(JSON.stringify(results));
                    }
                });
                callback('El cliente ' + ip + 'no se encontraba conectado.')
            } 


            // router.get('/recolectar-resultados', auth, urlencodedParser, (req, res) => {

//     con.query('SELECT direccionIP, socketID FROM clientes', function (error, results, fields) {
//         if (error) {
//           console.log("\n\nERROR:\n\n", error, "\n\n");
//           res.send({
//             mensaje: error.code
//           })
//         } else {

//             var resultados = [];
            
//             for(i = 0; i<results.length; i++){
        
//                 resultados.push({
//                     direccionIP : results[i].direccionIP,
//                 });
//             }
//             res.render('recolectar-resultados', {resultados:resultados});
//         }
//         });
    
// });