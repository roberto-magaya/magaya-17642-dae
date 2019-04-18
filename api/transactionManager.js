const util = require('util');
const fs = require('fs');
const path = require('path');
const fsReadFile = util.promisify(fs.readFile);
const configuration = require(path.join(__dirname, './configuration'));
const hyperion = require('@magaya/hyperion-express-middleware').hyperion(process.argv, '17642-dae');
const networkID = hyperion.dbx ? `${hyperion.dbx.Company.NetworkID}` : 0;
module.exports = {
    sendFileSFTP: async function (filePath, fileName) {
        const BASIC_URL = '/operaciones@gnseas.com';
        console.log('Starting SFTP');
        const ftpClient = require("ftp");
        const path = require('path');
        var file = path.join(filePath, fileName);

        console.log(file);
        try {
            const client = new ftpClient();
            client.on('ready', function () {
                console.log('ready');
                client.cwd(BASIC_URL, function (err) {
                    if (err) return "Error";

                });
                client.put(file, fileName, function (err) {
                    if (err) throw err;
                    client.end();
                    return "Success";
                });

            });

            client.on('connect', function () {
                console.log('connected');

            });
            // connect to localhost:21 as anonymous
            client.connect({
                host: "ftp.validacarga.com",
                user: "ricardo@weport.global",
                password: "123456",
                port: 21,
                secure: true,
                secureOptions: {
                    rejectUnauthorized: false
                }
            });
        } catch (error) {
            return error;
        }

        console.log('Finishing SFTP');
    },
    createFile: async function (dbx, algorithm, fs, filePath, fileName) {
        let content = '900||0000|0|000||\n' +
            '901||0000||ABC INDIA|000||||0||\n' +
            '950||09110000AA|KEE|TWN||H|AAAAAAA000000000|\n' +
            '952||09110000AA|KEE|TWN|2|ZLO|MEX|\n' +
            '953||09110000AA|KEE|TWN|1|||    |\n' +
            '953||09110000AA|KEE|TWN|2|DISTRIBUIDORA AAA, S.A.|DAA990909 AA4|CALLE 1 COL. COLONIA MEXICO, DISTRITO FEDERAL, 00000 5555 5555|\n' +
            '953||09110000AA|KEE|TWN|3|DISTRIBUIDORA AAA, S.A.|DAA990909 AA4|CALLE 1 COL. COLONIA MEXICO, DISTRITO FEDERAL, 00000 5555 5555|\n' +
            '976||09110000AA|KEE|TWN|1|0|1||1|20000.000|1|MERCANCIA |\n' +
            '978||09110000AA|KEE|TWN|1|AAAA0000000|2|FCL|20000.000|0000|\n' +
            '980||09110000AA|KEE|TWN|1|AAAA0000000|000000|\n' +
            '801|A0000167.322|1|10|\n';

        // write to a new file named 2pac.txt
        fs.writeFile(filePath + '/' + fileName, content, (err) => {
            // throws an error, you could also catch it here
            if (err) {
                console.log('ERROR!');
                return false;
            }

            // success case, the file was saved
            console.log('File saved!');
            return true;
        });
    },
    findShip: async function (GUID, dbx, algorithm) {
        const list = dbx.Shipping.Shipment.ListByGuid;

        // find the desired item asynchronously
        const found = await algorithm.find(dbx.using(list))
            .where(function (shipObj) {
                return shipObj.GUID === GUID;
            });
        return found;
    },
    saveCustomFields: async function (GUID, data, dbx, dbw, algorithm) {
        // find the Warehouse Receipt by GUID
        let shipObj = await this.findShip(GUID, dbx, algorithm);

        if (!shipObj) {
            return {
                error: 'Could not find the Shipment',
                success: false
            };
        }

        // mark the Warehouse Receipt for edition
        var cfTomodify = shipObj.CustomFields['dae_info'];
        let editshipObj = await dbw.edit(shipObj);
        // set the value of the Custom Field
        editshipObj.CustomFields['dae_info'] = data.customField;

        try {
            // save the modified Warehouse Receipt to the database
            await dbw.save(editshipObj);

            // if everything went OK, then return success
            return {
                success: true
            };
        } catch (error) {
            // if an unexpected error ocurred, return failure
            return {
                error,
                success: false
            };
        }
    },
    saveCustomFieldMRN: async function (GUID, data, dbx, dbw, algorithm) {
        // find the Warehouse Receipt by GUID
        let shipObj = await this.findShip(GUID, dbx, algorithm);

        if (!shipObj) {
            return {
                error: 'Could not find the Shipment',
                success: false
            };
        }

        // mark the Warehouse Receipt for edition
        var cfTomodify = shipObj.CustomFields['mrn_number'];
        let editshipObj = await dbw.edit(shipObj);
        // set the value of the Custom Field
        editshipObj.CustomFields['mrn_number'] = data;

        try {
            // save the modified Warehouse Receipt to the database
            await dbw.save(editshipObj);

            // if everything went OK, then return success
            return {
                success: true
            };
        } catch (error) {
            // if an unexpected error ocurred, return failure
            return {
                error,
                success: false
            };
        }
    },
    getShip: async function (shipGuid, dbx, algorithm) {
        let shipObj = await this.findShip(shipGuid, dbx, algorithm);

        // once the search is complete, return the proper result
        return transformShip(shipObj);
    },
    calculateMrn: async function (shipGuid, dbx, dbw, algorithm) {
        try {
            let shipObj = await this.findShip(shipGuid, dbx, algorithm);
            let manifest_number = shipObj.CustomFields.manifest_number;
            let contador = 1;
            var list = [];
            if (manifest_number != null != "Not Assigned" && shipObj.Houses.Count > 0) {
                await dbx.using(shipObj.Houses)
                    .iterate(async function (house) {
                        if (house.CustomFields.mrn_number == "Not Assigned" || house.CustomFields.mrn_number == "") {
                            var length = contador.toString();
                            
                                str = length.slice(-4);

                                if (length.length == 4)
                                    str = contador.toString();

                                if (length.length == 3)
                                    str = "0" + contador.toString();

                                if (length.length == 2)
                                    str = "00" + contador.toString();

                                if (length.length == 1)
                                    str = "000" + contador.toString();

                               
                                list.push({
                                    GUID: house.GUID,
                                    MRN: manifest_number + str + house.Name
                                });
                                contador++;
                            
                        }
                        else contador++;

                    });
                for (let index = 0; index < list.length; index++) {
                    const element = list[index];
                    this.saveCustomFieldMRN(element.GUID, element.MRN, dbx, dbw, algorithm);
                }

            }
        } catch (error) {

        }

        // once the search is complete, return the proper result
        //return transformShip(shipObj);
    },
    postConfig: async function (data, dbx, algorithm, filePath) {
        console.log(data);
        let rawdata = await configuration.getConfig();
        if (rawdata != null) {
            let config =rawdata;
            config.push(data)
            let dataToSave = JSON.stringify(config, null, 2);
            await configuration.saveConfig(dataToSave);
            // await fs.writeFile(filePath + '/config.json', dataToSave, async (err) => {
            //     // throws an error, you could also catch it here
            //     if (err) {
            //         console.log('ERROR!');
            //         return false;
            //     }
            //     // success case, the file was saved
            //     console.log('File saved!');
            //     return true;
            // });
        }
        else {
            let dataToSave = JSON.stringify(data, null, 2);
            await configuration.saveConfig(dataToSave);
            // await fs.writeFile(filePath + '/config.json', dataToSave, async (err) => {
            //     // throws an error, you could also catch it here
            //     if (err) {
            //         console.log('ERROR!');
            //         return false;
            //     }
            //     // success case, the file was saved
            //     console.log('File saved!');
            //     return true;
            // });
        }


    },

    getConfiguration: async function (shipper, destination, path) {

        //let rawdata = await fsReadFile(path + '/config.json');
        let rawdata = await configuration.getConfig();
        if (rawdata != null) {
            let config = JSON.parse(rawdata);
            var result = "";
            for (i in config) {
                var curObj = config[i];
                if (curObj.shipperName == shipper && destination == curObj.destinationCountry) {
                    var d = new Date();
                    var expdate = new Date(curObj.expDate)
                    if (d < expdate)
                        result = curObj;
                }

            }
            console.log(result);
            return result;
        }
        else {
            return {
                response: "error"
            }
        }
    },
};

function transformShip(shipObj) {
    if (!shipObj)
        return {};
    var list = [];


    return {
        GUID: shipObj.GUID,
        ShipperName: shipObj.ShipperName != null ? shipObj.ShipperName : "",
        DestinationPort: shipObj.DestinationPort != null ? {
            Name: shipObj.DestinationPort.Name,
            Code: shipObj.DestinationPort.Code,
            Country: shipObj.DestinationPort.Country.Name
        } : "",

    };
}


function getItems(listItems, list) {
    if (hasValue(listItems)) {
        dbx.using(listItems)
            .iterate(function (item) {
                if (!item.IsContainer) {
                    list.push({
                        tipoMercancia: item.Hazardous != null ? 12 : 0

                    })

                }
                else
                    pieces += getItems(item.ContainedItems, list);
            });

    }
    return list;
}

function getItemsList(obj) {
    var result = null;
    if (hasValue(obj)) {
        result = hasValue(obj.PackingList) && hasValue(obj.PackingList.Items) ? obj.PackingList.Items :
            (hasValue(obj.Items) ? obj.Items : null);
    }
    return result;
}

function hasValue(obj) {
    return (obj != undefined && obj != null);
}