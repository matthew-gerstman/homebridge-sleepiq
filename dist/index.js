System.register([], function (exports_1, context_1) {
    "use strict";
    var Accessory, Service, Characteristic, UUIDGen, snapi, SleepIQPlatform, snOccupancy, snNumber, snFlex;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            snapi = require("./API.js");
            module.exports = function (homebridge) {
                Accessory = homebridge.platformAccessory;
                Service = homebridge.hap.Service;
                Characteristic = homebridge.hap.Characteristic;
                UUIDGen = homebridge.hap.uuid;
                homebridge.registerPlatform("homebridge-sleepiq", "SleepIQ", SleepIQPlatform);
            };
            SleepIQPlatform = class SleepIQPlatform {
                constructor(log, config, api) {
                    this.disabled = false;
                    this.didFinishLaunching = async () => {
                        this.removeMarkedAccessories();
                        await this.authenticate();
                        if (!this.snapi.key) {
                            return;
                        }
                        await this.addAccessories();
                        setInterval(this.fetchData, this.refreshTime); // continue to grab data every few seconds
                    };
                    this.authenticate = async () => {
                        try {
                            this.log.debug("SleepIQ Authenticating...");
                            await this.snapi.login((data, err = null) => {
                                if (err) {
                                    this.log.debug(data, err);
                                }
                                else {
                                    this.log.debug("Login result:", data);
                                }
                            });
                        }
                        catch (err) {
                            this.log("Failed to authenticate with SleepIQ. Please double-check your username and password. Disabling SleepIQ plugin. Error:", err.error);
                            this.disabled = true;
                        }
                    };
                    this.addAccessories = async () => {
                        // Attempt to retrieve main dataset
                        try {
                            await this.snapi.familyStatus((data, err = null) => {
                                if (err) {
                                    this.log.debug(data, err);
                                }
                                else {
                                    this.log.debug("Family Status GET results:", data);
                                }
                            });
                        }
                        catch (err) {
                            if (typeof err === "string" || err instanceof String)
                                err = JSON.parse(err);
                            if (!(err.statusCode === 401) && !(err.statusCode === 50002)) {
                                this.log("Failed to retrieve family status:", JSON.stringify(err));
                            }
                        }
                        // Get first bed, we only have one.
                        const [bed] = this.snapi.json.beds;
                        let bedName = "Bed";
                        let bedID = bed.bedId;
                        let sides = JSON.parse(JSON.stringify(bed));
                        delete sides.status;
                        delete sides.bedId;
                        // Check if there is a foundation attached
                        try {
                            await this.snapi.foundationStatus((data, err = null) => {
                                if (err) {
                                    this.log.debug(data, err);
                                }
                                else {
                                    this.log.debug("foundationStatus result:", data);
                                    let foundationStatus = JSON.parse(data);
                                    if (foundationStatus.hasOwnProperty("Error")) {
                                        if (foundationStatus.Error.Code === 404) {
                                            this.log("No foundation detected");
                                        }
                                        else {
                                            this.log("Unknown error occurred when checking the foundation status. See previous output for more details. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new");
                                        }
                                    }
                                    else {
                                        this.hasFoundation = true;
                                    }
                                }
                            });
                        }
                        catch (err) {
                            if (typeof err === "string" || err instanceof String)
                                err = JSON.parse(err);
                            if (!(err.statusCode === 404)) {
                                this.log("Failed to retrieve foundation status:", JSON.stringify(err));
                            }
                        }
                        const [leftSide, rightSide] = Object.keys(sides);
                        try {
                            const accessoryName = "SleepNumber";
                            // register side number control
                            if (!this.accessories.has(accessoryName)) {
                                this.log("Found BedSide Number Control: ", accessoryName);
                                let uuid = UUIDGen.generate("SleepNumber");
                                let bedSideNum = new Accessory("SleepNumber", uuid);
                                bedSideNum
                                    .addService(Service.Lightbulb, leftSide)
                                    .addCharacteristic(Characteristic.Brightness);
                                bedSideNum
                                    .addService(Service.Lightbulb, rightSide)
                                    .addCharacteristic(Characteristic.Brightness);
                                let bedSideNumAccessory = new snNumber(this.log, bedSideNum, this.snapi);
                                bedSideNumAccessory.getServices();
                                this.api.registerPlatformAccessories("homebridge-sleepiq", "SleepIQ", [
                                    bedSideNum,
                                ]);
                                this.accessories.set(accessoryName, bedSideNumAccessory);
                            }
                            else {
                                this.log(accessoryName + " number control already added from cache");
                            }
                        }
                        catch (err) {
                            this.log("Error when setting up bedsides:", err);
                        }
                        // check for foundation
                        if (this.hasFoundation) {
                            // register side foundation head and foot control units
                            if (!this.accessories.has("Flex")) {
                                this.log("Found BedSide Flex Foundation: ");
                                let uuid = UUIDGen.generate("Flex");
                                let bedSideFlex = new Accessory("Flex", uuid);
                                bedSideFlex
                                    .addService(Service.Lightbulb, "FlexHead", "head")
                                    .addCharacteristic(Characteristic.Brightness);
                                bedSideFlex
                                    .addService(Service.Lightbulb, "FlexFoot", "foot")
                                    .addCharacteristic(Characteristic.Brightness);
                                let bedSideFlexAccessory = new snFlex(this.log, bedSideFlex, this.snapi);
                                bedSideFlexAccessory.getServices();
                                this.api.registerPlatformAccessories("homebridge-sleepiq", "SleepIQ", [
                                    bedSideFlex,
                                ]);
                                this.accessories.set("flex", bedSideFlexAccessory);
                            }
                            else {
                                this.log(" Flex foundation already added from cache");
                            }
                        }
                    };
                    this.removeAccessory = (side) => {
                        this.log("Remove Accessory: ", side.accessory.displayName);
                        this.api.unregisterPlatformAccessories("homebridge-sleepiq", "SleepNumber", [side.accessory]);
                        this.accessories.delete(side.accessory.context.sideID);
                    };
                    // called during setup, restores from cache (reconfigure instead of create new)
                    this.configureAccessory = (accessory) => {
                        if (this.disabled) {
                            return false;
                        }
                        this.log("Configuring Cached Accessory: ", accessory.displayName, "UUID: ", accessory.UUID);
                        // remove old privacy accessory
                        if (accessory.displayName.slice(-7) === "privacy") {
                            if (!accessory.context.bedName) {
                                this.log("Stale accessory. Marking for removal");
                                accessory.context.type = "remove";
                            }
                        }
                        if (accessory.displayName.slice(-4) === "Side") {
                            this.log("Stale accessory. Marking for removal");
                            accessory.context.type = "remove";
                        }
                        if (Array.from(this.accessories.values())
                            .map((a) => a.accessory.displayName)
                            .includes(accessory.displayName)) {
                            this.log("Duplicate accessory detected in cache: ", accessory.displayName, "If this appears incorrect, file a ticket on github. Removing duplicate accessory from cache.");
                            this.log("You might need to restart homebridge to clear out the old data, especially if the accessory UUID got duplicated.");
                            this.log("If the issue persists, try clearing your accessory cache.");
                            accessory.context.type = "remove";
                        }
                        switch (accessory.context.type) {
                            case "occupancy":
                                accessory.reachable = true;
                                let bedSideOccAccessory = new snOccupancy(this.log, accessory);
                                bedSideOccAccessory.getServices();
                                this.accessories.set(accessory.context.sideID, bedSideOccAccessory);
                                break;
                            case "number":
                                accessory.reachable = true;
                                let bedSideNumAccessory = new snNumber(this.log, accessory, this.snapi, this.sendDelay);
                                bedSideNumAccessory.getServices();
                                this.accessories.set(accessory.context.sideID, bedSideNumAccessory);
                                break;
                            case "flex":
                                accessory.reachable = true;
                                let bedSideFlexAccessory = new snFlex(this.log, accessory, this.snapi);
                                bedSideFlexAccessory.getServices();
                                this.accessories.set(accessory.context.sideID, bedSideFlexAccessory);
                                break;
                            default:
                                this.log("Unknown accessory type. Removing from accessory cache.");
                            case "remove":
                                accessory.context.remove = true;
                                accessory.UUID = UUIDGen.generate(accessory.sideID + "remove");
                                accessory._associatedHAPAccessory.UUID = accessory.UUID;
                                this.staleAccessories.push(accessory);
                                return false;
                        }
                        return true;
                    };
                    this.fetchData = async () => {
                        this.log.debug("Getting SleepIQ JSON Data...");
                        var bedData;
                        // Fetch main data set
                        try {
                            await this.snapi.familyStatus((data, err = null) => {
                                if (err) {
                                    this.log.debug(data, err);
                                }
                                else {
                                    this.log.debug("Family Status GET results:", data);
                                }
                            });
                        }
                        catch (err) {
                            if (typeof err === "string" || err instanceof String) {
                                err = JSON.parse(err);
                            }
                            const statusCode = err.statusCode;
                            if (statusCode !== 401 && statusCode !== 50002) {
                                this.log("Unknown promise error. If it persists, please report it at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new:", JSON.stringify(err));
                            }
                        }
                        // Check if sign-out occurred and re-authentication is needed
                        if (this.snapi.json.hasOwnProperty("Error")) {
                            if (this.snapi.json.Error.Code == 50002 ||
                                this.snapi.json.Error.Code == 401) {
                                this.log.debug("SleepIQ authentication failed, stand by for automatic re-authentication");
                                await this.authenticate();
                                //this.fetchData();
                            }
                            else {
                                this.log("SleepIQ authentication failed with an unknown error code. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new");
                            }
                        }
                        else {
                            this.log.debug("SleepIQ JSON data successfully retrieved");
                            bedData = JSON.parse(JSON.stringify(this.snapi.json));
                            this.parseData(bedData);
                        }
                    };
                    this.parseData = (bedData) => {
                        if (!bedData.beds) {
                            this.log("Failed to find a bed, I think. I am not sure why, but if you have a bed attached to your account, you should probably file a bug.");
                            return;
                        }
                        bedData.beds.forEach(async (bed, index) => {
                            let bedID = bed.bedId;
                            let sides = JSON.parse(JSON.stringify(bed));
                            delete sides.status;
                            delete sides.bedId;
                            // check if new privacy switch detected
                            if (!this.accessories.has(bedID + "privacy")) {
                                this.log("New privacy switch detected.");
                                this.addAccessories();
                                return;
                            }
                            else {
                                this.snapi.bedID = bedID;
                                // check privacy status
                                try {
                                    await this.snapi.bedPauseMode((data, err = null) => {
                                        if (err) {
                                            this.log.debug(data, err);
                                        }
                                        else {
                                            this.log.debug("Privacy mode GET results:", data);
                                        }
                                    });
                                }
                                catch (err) {
                                    this.log("Failed to retrieve bed pause mode:", err);
                                }
                                // update privacy status
                                let privacyData = JSON.parse(JSON.stringify(this.snapi.json));
                                this.log.debug("SleepIQ Privacy Mode: " + privacyData.pauseMode);
                                let bedPrivacyAccessory = this.accessories.get(bedID + "privacy");
                                bedPrivacyAccessory.updatePrivacy(privacyData.pauseMode);
                            }
                            // Fetch foundation data
                            let flexData;
                            if (this.hasFoundation) {
                                try {
                                    await this.snapi.foundationStatus((data, err = null) => {
                                        if (err) {
                                            this.log.debug(data, err);
                                        }
                                        else {
                                            this.log.debug("Foundation Status GET results:", data);
                                            flexData = JSON.parse(data);
                                        }
                                    });
                                }
                                catch (err) {
                                    this.log("Failed to fetch foundation status:", err.error);
                                }
                            }
                            let anySideOccupied = false;
                            let bothSidesOccupied = true;
                            if (sides) {
                                // check data on each bed side
                                Object.keys(sides).forEach(async (bedside, index) => {
                                    let sideID = bedID + bedside;
                                    // check if new side detected
                                    if (!this.accessories.has(sideID + "occupancy") ||
                                        !this.accessories.has(sideID + "number")) {
                                        this.log("New bedside detected.");
                                        this.addAccessories();
                                        return;
                                    }
                                    else {
                                        // update side occupancy
                                        let thisSideOccupied = sides[bedside] && sides[bedside].isInBed;
                                        this.log.debug("SleepIQ Occupancy Data: {" +
                                            bedside +
                                            ":" +
                                            thisSideOccupied +
                                            "}");
                                        let bedSideOccAccessory = this.accessories.get(sideID + "occupancy");
                                        bedSideOccAccessory.setOccupancyDetected(thisSideOccupied);
                                        anySideOccupied = anySideOccupied || thisSideOccupied;
                                        bothSidesOccupied = bothSidesOccupied && thisSideOccupied;
                                        // update side number
                                        this.log.debug("SleepIQ Sleep Number: {" +
                                            bedside +
                                            ":" +
                                            sides[bedside].sleepNumber +
                                            "}");
                                        let bedSideNumAccessory = this.accessories.get(sideID + "number");
                                        bedSideNumAccessory.updateSleepNumber(sides[bedside].sleepNumber);
                                        // update foundation data
                                        if (this.hasFoundation) {
                                            this.log({ flexData });
                                            if (flexData) {
                                                this.log.debug("SleepIQ Flex Data: {" +
                                                    bedside +
                                                    ": Head: " +
                                                    flexData.fsLeftHeadPosition +
                                                    ", Foot:" +
                                                    flexData.fsLeftFootPosition +
                                                    "}");
                                                let bedSideFlexLccessory = this.accessories.get(sideID + "flex");
                                                bedSideFlexLccessory.updateFoundation(flexData.fsLeftHeadPosition, flexData.fsLeftFootPosition);
                                            }
                                        } // if(this.hasFoundation)
                                    }
                                });
                            }
                            else {
                                this.log("Failed to detect a bed side. I am not sure why, so you might want to file a ticket.");
                            }
                            let anySideOccAccessory = this.accessories.get(bedID + "anySide" + "occupancy");
                            anySideOccAccessory.setOccupancyDetected(anySideOccupied);
                            let bothSidesOccAccessory = this.accessories.get(bedID + "bothSides" + "occupancy");
                            bothSidesOccAccessory.setOccupancyDetected(bothSidesOccupied);
                        });
                    };
                    this.log = log;
                    if (!config) {
                        log.warn("Ignoring SleepIQ setup because it is not configured.");
                        this.disabled = true;
                        return;
                    }
                    // Retrieve config settings
                    this.config = config;
                    this.username = config["email"];
                    this.password = config["password"];
                    this.refreshTime = (config["refreshTime"] || 5) * 1000; // update values from SleepIQ every 5 seconds
                    this.sendDelay = (config["sendDelay"] || 2) * 1000; // delay updating bed numbers by 2 seconds
                    if (!this.username || !this.password) {
                        log.warn("Ignoring SleepIQ setup because username or password was not provided.");
                        this.disabled = true;
                        return;
                    }
                    this.accessories = new Map();
                    this.staleAccessories = [];
                    this.snapi = new snapi(this.username, this.password);
                    // Set default available components
                    this.hasFoundation = false;
                    if (api) {
                        this.api = api;
                        this.api.on("didFinishLaunching", () => {
                            this.log.debug("API Finished Launching");
                            this.didFinishLaunching();
                        });
                    }
                }
                removeMarkedAccessories() {
                    this.log.debug("Checking accessories for any marked for removal");
                    for (const index in this.staleAccessories) {
                        const accessory = this.staleAccessories[index];
                        if (accessory.context && accessory.context.remove === true) {
                            this.log.debug("Removing accessory:", accessory.displayName);
                            this.api.unregisterPlatformAccessories("homebridge-sleepiq", accessory._associatedPlatform, [accessory]);
                            this.staleAccessories.splice(this.staleAccessories.indexOf(index));
                        }
                    }
                }
            };
            snOccupancy = class snOccupancy {
                constructor(log, accessory) {
                    this.setOccupancyDetected = (value) => {
                        if (value == true) {
                            this.occupancyDetected =
                                Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
                        }
                        else {
                            this.occupancyDetected =
                                Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
                        }
                        return this.occupancyService.setCharacteristic(Characteristic.OccupancyDetected, value);
                    };
                    this.getServices = () => {
                        let informationService = this.accessory.getService(Service.AccessoryInformation);
                        informationService
                            .setCharacteristic(Characteristic.Manufacturer, "Sleep Number")
                            .setCharacteristic(Characteristic.Model, "SleepIQ")
                            .setCharacteristic(Characteristic.SerialNumber, "360");
                        this.occupancyService
                            .getCharacteristic(Characteristic.OccupancyDetected)
                            .on("get", this.getOccupancyDetected.bind(this));
                        return [informationService, this.occupancyService];
                    };
                    this.log = log;
                    this.accessory = accessory;
                    this.occupancyService = this.accessory.getService(Service.OccupancySensor);
                    this.occupancyDetected =
                        Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
                }
                getOccupancyDetected(callback) {
                    return callback(null, this.occupancyDetected);
                }
            };
            snNumber = class snNumber {
                constructor(log, accessory, snapi, sendDelay = 2) {
                    // Send a new sleep number to the bed
                    this.setSleepNumber = (value) => {
                        let side = this.accessory.context.side;
                        this.log.debug("Setting sleep number=" + value + " on side=" + side);
                        try {
                            this.snapi.sleepNumber(side, value, (data, err = null) => {
                                if (err) {
                                    this.log.debug(data, err);
                                }
                                else {
                                    this.log.debug("Sleep Number PUT result:", data);
                                }
                            });
                        }
                        catch (err) {
                            this.log("Failed to set sleep number=" + value + " on side=" + side + " :", err);
                        }
                    };
                    this.getSleepNumber = (callback) => {
                        return callback(null, this.sleepNumber);
                    };
                    this.getServices = () => {
                        let informationService = this.accessory.getService(Service.AccessoryInformation);
                        informationService
                            .setCharacteristic(Characteristic.Manufacturer, "Sleep Number")
                            .setCharacteristic(Characteristic.Model, "SleepIQ")
                            .setCharacteristic(Characteristic.SerialNumber, "360");
                        this.numberService
                            .getCharacteristic(Characteristic.Brightness)
                            .on("set", (value, callback) => {
                            this.log.debug("Sleep Number -> " + value);
                            this.debounce(this.setSleepNumber, value, this.sendDelay);
                            callback();
                        })
                            .on("get", this.getSleepNumber)
                            .setProps({
                            minValue: 5,
                            maxValue: 100,
                            minStep: 5,
                        });
                        this.numberService
                            .getCharacteristic(Characteristic.On)
                            .on("change", (oldValue, newValue) => {
                            if (!newValue) {
                                setTimeout(() => this.numberService.setCharacteristic(Characteristic.On, true), 250); // if "light" turned off, turn back on after 250ms
                            }
                        });
                        return [informationService, this.numberService];
                    };
                    this.log = log;
                    this.accessory = accessory;
                    this.snapi = snapi;
                    this.sendDelay = sendDelay;
                    this.sleepNumber = 50;
                    this.sideName = this.accessory.context.sideName;
                    this.numberService = this.accessory.getService(this.sideName + "Number");
                    this.numberService.setCharacteristic(Characteristic.On, true);
                    this.debounce = this.debounce.bind(this);
                    this.getSleepNumber = this.getSleepNumber.bind(this);
                    this.setSleepNumber = this.setSleepNumber.bind(this);
                    this.updateSleepNumber = this.updateSleepNumber.bind(this);
                }
                debounce(fn, value, delay) {
                    let timeOutId;
                    return (function () {
                        if (timeOutId) {
                            clearTimeout(timeOutId);
                        }
                        timeOutId = setTimeout(() => {
                            fn(value);
                        }, delay);
                    })();
                }
                // Keep sleep number updated with external changes through sleepIQ app
                updateSleepNumber(value) {
                    this.sleepNumber = value;
                }
            };
            snFlex = class snFlex {
                constructor(log, accessory, snapi) {
                    this.waitForBedToStopMoving = async () => {
                        while (this.foundationIsMoving) {
                            try {
                                await this.snapi.foundationStatus(((data, err = null) => {
                                    if (err) {
                                        this.log.debug(data, err);
                                    }
                                    else {
                                        this.log.debug("foundationStatus result:", data);
                                        let foundationStatus = JSON.parse(data);
                                        if (foundationStatus.hasOwnProperty("Error")) {
                                            if (foundationStatus.Error.Code === 404) {
                                                this.log("No foundation detected");
                                            }
                                            else {
                                                this.log("Unknown error occurred when checking the foundation status. See previous output for more details. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new");
                                            }
                                        }
                                        else {
                                            this.foundationIsMoving = foundationStatus.fsIsMoving;
                                        }
                                    }
                                }).bind(this));
                            }
                            catch (err) {
                                if (typeof err === "string" || err instanceof String)
                                    err = JSON.parse(err);
                                if (!(err.statusCode === 404)) {
                                    this.log("Failed to retrieve foundation status:", JSON.stringify(err));
                                }
                            }
                            if (!this.foundationIsMoving) {
                                return;
                            }
                            await this.__delay__(500); // wait 0.5s before trying again
                        }
                    };
                    // Send a new foundation position to the bed
                    this.setFoundation = async (actuator, value) => {
                        let side = this.accessory.context.side;
                        await this.waitForBedToStopMoving(); // wait for bed to stop moving
                        this.log.debug("Setting foundation position=" +
                            value +
                            " on side=" +
                            side +
                            " for position=" +
                            actuator);
                        try {
                            this.snapi.adjust(side, actuator, value, (data, err = null) => {
                                if (err) {
                                    this.log.debug(data, err);
                                }
                                else {
                                    this.log.debug("adjust PUT result:", data);
                                }
                            });
                        }
                        catch (err) {
                            this.log("Failed to set foundation position=" +
                                value +
                                " on side=" +
                                side +
                                " for position=" +
                                actuator +
                                " :", err);
                        }
                    };
                    // Keep foundation position updated with external changes through sleepIQ app
                    this.updateFoundation = (head, foot) => {
                        this.headPosition = head;
                        this.footPosition = foot;
                    };
                    this.getFoundation = (actuator, callback) => {
                        if (actuator == "H") {
                            return callback(null, this.headPosition);
                        }
                        else {
                            return callback(null, this.footPosition);
                        }
                    };
                    this.getServices = () => {
                        let informationService = this.accessory.getService(Service.AccessoryInformation);
                        informationService
                            .setCharacteristic(Characteristic.Manufacturer, "Sleep Number")
                            .setCharacteristic(Characteristic.Model, "SleepIQ")
                            .setCharacteristic(Characteristic.SerialNumber, "360");
                        this.foundationHeadService
                            .getCharacteristic(Characteristic.Brightness)
                            .on("set", (value, callback) => {
                            this.log.debug("Foundation Head -> " + value);
                            this.setFoundation("H", value);
                            callback();
                        })
                            .on("get", (callback) => this.getFoundation("H", callback));
                        this.foundationHeadService
                            .getCharacteristic(Characteristic.On)
                            .on("change", (oldValue, newValue) => {
                            this.log.debug("Foundation Head -> " + newValue);
                            this.setFoundation("H", newValue);
                        });
                        this.foundationFootService
                            .getCharacteristic(Characteristic.Brightness)
                            .on("set", (value, callback) => {
                            this.log.debug("Foundation Foot -> " + value);
                            this.setFoundation("F", value);
                            callback();
                        })
                            .on("get", (callback) => this.getFoundation("F", callback));
                        this.foundationFootService
                            .getCharacteristic(Characteristic.On)
                            .on("change", (oldValue, newValue) => {
                            this.log.debug("Foundation Foot -> " + newValue);
                            this.setFoundation("F", newValue);
                        });
                        return [
                            informationService,
                            this.foundationHeadService,
                            this.foundationFootService,
                        ];
                    };
                    this.log = log;
                    this.accessory = accessory;
                    this.snapi = snapi;
                    this.headPosition = 0;
                    this.footPosition = 0;
                    this.sideName = this.accessory.context.sideName;
                    this.foundationIsMoving = false;
                    this.foundationHeadService = this.accessory.getService(this.sideName + "FlexHead");
                    this.foundationFootService = this.accessory.getService(this.sideName + "FlexFoot");
                }
                __delay__(timer) {
                    return new Promise((resolve) => {
                        timer = timer || 2000;
                        setTimeout(function () {
                            resolve(undefined);
                        }, timer);
                    });
                }
            };
        }
    };
});
