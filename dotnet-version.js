#! /usr/bin/env node
'use strict'

const async = require('async')
const os = require('os')
const Registry = require('winreg')
const ROOT_KEY_PATH = '\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\'

const handlers = {}  

const regKey = new Registry({                                     
        hive: Registry.HKLM,        // HKEY_LOCAL_MACHINE
        key: ROOT_KEY_PATH          // location of the .NET installation info
    })

async.waterfall(
    [
        validateOS,
        obtainExistingVersions,
        registerHandlers,
        processVersions
    ],
    (err, dotnetVersion) => {
        if (isInternalError(err))
            return displayInternalError(err)

        if (err){
            if (err.message == 'N/A')
                return console.info('No installed version of .NET Framework found on this machine')
            else 
                throw(err)
        }

        console.info(dotnetVersion)
    }
)

function excludeRootPath(keyPath){
    return keyPath && keyPath.replace(ROOT_KEY_PATH, '')
}

function processVersions(versions, cb){
    var arrayOfHandlers = versions
                            .map(version => handlers[version])
                            .filter(h => typeof(h) === 'function')
    async.tryEach(
        arrayOfHandlers,
        (error, description) => cb(error, description)
    )
}

function obtainExistingVersions(cb){
    regKey.keys((err, keys) => {
        if (err) return cb(err)
    
        let versions = keys
            .map(registryKey => excludeRootPath(registryKey.key))
            .filter(k => k.startsWith('v'))
            .reverse()
    
        cb(null, versions)
    });
}

function registerHandlers(versions, callback) {

    versions.forEach((version) => {
        if (version === 'v4') {
            // versions 4.5+ are incremental so they have a unified mechanism to determine the current version
            handlers['v4'] =  require('./check-45-plus')
            return
        }  

        handlers[version] = require('./check-10-to-40')(version)
    })

    callback(null, versions)
}

function validateOS(cb){
    if (!isWin()){
        return cb(new Error(`internal:The module is available only on Windows-platforms`))
    }

    cb();
}

function isWin(){
    return os.platform() === 'win32'
}

function isInternalError(err){
    return err && err.message.startsWith('internal')
}

function displayInternalError(err){
    if (!err) return

    let message = (err.message || '').replace('internal:', '')

    console.error(message)
}

function tryCallHandler(name, cb){
    let handler = handlers[name]
    if (typeof(handler) !== 'function') return cb(null, undefined)

    handler(cb);
}