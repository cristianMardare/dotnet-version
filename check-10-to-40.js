'use strict'

const async = require('async')
const Registry = require('winreg')
const KEY_PATH = '\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\'

module.exports = function(version){
    return function(cb){
        let keyPath = `${KEY_PATH}${version}`
        const regKey = new Registry({                                     
            hive: Registry.HKLM,  // HKEY_LOCAL_MACHINE
            key: keyPath          // location of the .NET installation info
        })
    
        regKey.keyExists((error, exists) => {
            if (error) return cb(error)
            if (!exists) return cb(null, undefined)
    
            async.parallel([
                async.apply(tryGetValue, regKey, "Version"),
                async.apply(tryGetValue, regKey, "SP"),
                async.apply(tryGetValue, regKey, "Install")
            ], (error, info) => {
                let name = info[0]
                let sp = parseInt(info[1])
                let install = parseInt(info[2])

                if (name){
                    if (sp && install === 1)
                        return cb(null, `${name} SP${sp}`)      // installed version found

                    // version found, but no installation info - mush search for more details
                    regKey.keys((err, subkeys) =>{
                        if (err) return cb(err)

                        let handlers =  subkeys
                                        .reverse()      // try to obtain the value for Full installation before Client
                                        .map(k => async.apply(tryGetVersionDetails, k))

                        async.tryEach(handlers, cb)
                    })
                }
                else {
                    cb(new Error('N/A'))
                }
                
            })
        })
    }
}

function tryGetVersionDetails(registryKey, cb){
    async.parallel([
        async.apply(tryGetValue, registryKey, "Version"),
        async.apply(tryGetValue, registryKey, "SP"),
        async.apply(tryGetValue, registryKey, "Install")
    ], (error, info) => {
        let name = info[0]
        let sp = info[1]
        let install = info[2]

        if (name && sp && install === 1) return cb(null, `${name} SP${sp}`)

        cb(new Error('N/A'))
    })
}

function tryGetValue(registryKey, valueName, cb) {
    if (!registryKey) return cb(new Error("No registry key!"))

    registryKey.valueExists(valueName, (error, exists) => {
        if (error) return cb(error)
        if (!exists) return cb(new Error(`Missing value: ${valueName} `));

        registryKey.get(valueName, (error, obj) => {
            if (error) return cb(error)

            cb(null, obj.value);
        })
    })
}