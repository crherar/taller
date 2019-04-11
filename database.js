const mysql = require('mysql');

var pool = mysql.createPool({
    //connectionLimit : 60,
    host    : 'localhost',
    user    : 'root',
    password: 'root',
    database: 'taller',
    socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
    multipleStatements: true
});

exports.insertarClientes = function(datos, callback) {

    var sql = "INSERT INTO clientes SET ?";

    pool.getConnection(function(err, connection) {
        if (err) {
            console.log(err);
            //callback(true);
        } else {
            connection.query(sql, datos, function (err, res, fields) {
                if (err) {
                    console.log("\n\nERROR:\n\n", err.code, "\n\n");
                    res.send({
                        mensaje: err.code
                      });
                } else {
                    connection.release();
                    res.send({
                        mensaje: "Cliente insertado exitosamente."
                    });
                }
                });
                
            }
        });
}


var obtenerClientes = function() {
    
}
/* el servidor que escucha los sockets clientes puede ir en app.js */

/*
Funciones que debo programar:

insertar clientes socket
obtener clientes socket
insertar reglas de yara

*/

/* Aca se definiran todas las funciones y se utilizaran en los routes */