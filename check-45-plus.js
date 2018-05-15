'use strict'

const Registry = require('winreg')
const KEY_PATH = '\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full'

module.exports = function(cb) {
    const regKey = new Registry({                                     
        hive: Registry.HKLM,        // HKEY_LOCAL_MACHINE
        key: KEY_PATH          // location of the .NET installation info
    })

    regKey.keyExists((error, exists) => {
        if (error) return cb(error)
        if (!exists) return cb(null, undefined)

        regKey.valueExists('Release', (error, exists) => {
            if (error) return cb(error)
            if (!exists) return cb(null, undefined)

            regKey.get('Release', (error, item) => {
                let release = parseInt(item.value)
                let version = checkVersion(release)

                cb(null, version);
            })
        })
    })
    
}

function checkVersion(release){
    if (!release)
        return undefined;

    if (release >= 461808)
        return "4.7.2 or later"
    if (release >= 461308)
        return "4.7.1"
    if (release >= 460798)
        return "4.7"
    if (release >= 394802)
        return "4.6.2"
    if (release >= 394254)
        return "4.6.1"    
    if (release >= 393295)
        return "4.6"     
    if (release >= 379893)
        return "4.5.2"     
    if (release >= 378675)
        return "4.5.1"      
    if (release >= 378389)
        return "4.5"
          
    return undefined
}