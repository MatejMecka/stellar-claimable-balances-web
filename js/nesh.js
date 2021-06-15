var stellar = require('stellar-sdk').default
global.window.stellar = stellar

var albedo = require('@albedo-link/intent').default
global.window.albedo = albedo

var freighter = require('@stellar/freighter-api')
global.window.freighter = freighter
