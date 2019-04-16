// router.post('/sending', urlencodedParser, function(req, res) {

// var datos = {
//     direccionIP: req.body.direccionIP,
//     socketID: req.body.socketID
// }

// console.log(datos);

// exports.GET = function(req, res) {
//       db.insertarClientes(datos, function(err, results) {
//           if (err) {
//               res.send(500, "Server Error");
//               return;
//           } else {
//               res.send(results);
//           }
//       });
//     });

// });

// router.get('/', (req, res, next) => {
//     res.sendFile(path.join(__dirname, '../', 'views', 'index.html'));
// });


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


// Obtener clientes:


    // console.log('a user connected');
    // socket.on('net', function(msg){
    //   console.log('message: ' + msg);
    // });
    // string = "hola desde index.js";
    // socket.emit('test', string);