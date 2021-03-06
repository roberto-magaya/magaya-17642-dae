const path = require('path');
const packageJson = require('../package.json');
const fs = require('fs');
const program = require('commander');
const util = require('util');
// require the config helper
const fsHelper = require('@magaya/extension-fs-helper');
let configFolder = "";
// setup the extension with required data, notice this occurs at the application startup, not thru a web request
program.version(packageJson.version)
    .option('-p, --port <n>', 'running port', parseInt)
    .option('-r, --root <value>', 'startup root for api')
    .option('-s, --service-name <value>', 'name for service')
    .option('-g, --gateway', 'dictates if we should be through gateway')
    .option('-i, --network-id <n>', 'magaya network id', parseInt)
    .option('--connection-string <value>', 'connection endpoint for database')
    .parse(process.argv);
const fsReadFile = util.promisify(fs.readFile);

async function getConfiguration() {
    try {
        await checkFolderConfiguration();
        const configFile = path.join(configFolder, 'config.json');
        console.log(configFile);
        let configJson = "";
        if (!fs.existsSync(configFile)) {
            rawData = [{
                "dae": "",
                "shipperName": "",
                "destinationCountry": "",
                "expDate": ""
            }];
            configJson = JSON.parse(rawData);
        } else {
            return content = await fsReadFile(configFile);
        }
    
        return configJson;
    } catch (error) {
        console.log("Error Getting the config.json : "+ error+"\r\n");
    }
 
}

async function checkFolderConfiguration() {
    // retrieve the config folder for this instance of the extension
    //console.log(program);
    configFolder = fsHelper.GetExtensionDataFolder({
        "company": "magaya",
        "name": "17642-dae"
    }, program.networkId);
}

module.exports = {
    getConfig: async function () {
        return await getConfiguration();
    },

    saveConfig: async function (json) {
        try {
            await checkFolderConfiguration();
            console.log(configFolder);
            fs.writeFileSync(path.join(configFolder, 'config.json'), json)
            return true;
        } catch (error) {
            console.log("Error saving the Config.Json:" + error + "\r\n");
            return false;
        }

    }
}