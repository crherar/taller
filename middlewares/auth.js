'use strict';

const jwt = require('jwt-simple');
const moment = require('moment');
const config = require('../config');

function getCookie ( src, name ) {
    var value = "; " + src;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

function isAuth(req, res, next) {
    console.log('req.headers.cookie: ' + req.headers.cookie + '\n');
    const token = getCookie(req.headers.cookie, 'access_token');
    console.log('token: ' + token + '\n');
    if(!token) {
        return res.status(403).send({mensaje:'No autorizado'});
    }
    const payload = jwt.decode(token, config.SECRET_TOKEN);
    console.log(payload);
    if(payload.exp <= moment().unix()) {
        return res.status(401).send({mensaje: 'Token expirado.'})
    }
    req.usuario = payload.sub;
    next();
}

module.exports = isAuth;