'use strict';

const jwt = require('jwt-simple');
const moment = require('moment');
const config = require('../config');

function crearToken(usuario) {
    const payload = {
        sub: usuario,
        iat: moment().unix(),
        exp: moment().add(1, 'days').unix()
    }
    return jwt.encode(payload, config.SECRET_TOKEN);
}

module.exports = crearToken;
