"use strict";
/*
 * The following is my documentation of the available API requests that have
 * been discovered. I pulled these from
 *  - https://github.com/technicalpickles/sleepyq,
 *  - https://github.com/erichelgeson/sleepiq, and
 *  - https://github.com/natecj/sleepiq-php,
 * removing the request links that no longer work.
 *
 * As of December 2018, I have discovered the additional API requests
 * needed to control the pressure of the bed
 *
 * If anybody discovers other features of the API, let me know!
 *
 * To use, launch node in the same directory as this file, then create an
 * object with
 *| > API = require('./API.js')
 *| > api = new API('username','password')
 *
 * List of class methods:
 * - api.login()           : required first
 * - api.genURL()          : allows for passing any url extension in
 * - api.registration()    :
 * - api.familyStatus()    : where the useful homekit information is
 * - api.sleeper()         :
 * - api.bed()             :
 *
 * The next five require familyStatus() or bed() to be called first to get a bedID
 * - api.bedStatus()       :
 * - api.bedPauseMode()    : Reads the privacy mode setting of the bed
 * - api.setBedPauseMode() : Sets the privacy mode setting of the bed
 * - api.sleepNumber()     : Used to set the sleep number for a side
 * - api.forceIdle()       : Stops the pump
 * - api.pumpStatus()      :
 *
 * The last two provide bulk sleep data. Could be fun to import into a spreadsheet
 * - api.sleeperData()     :
 * - api.sleepSliceData()  :
 */
var request = require("request-promise-native");
var request = request.defaults({ jar: true });
const noop = (...args) => { };
class API {
    constructor(username, password) {
        // fill these with your SleepIQ account details
        this.username = username;
        this.password = password;
        this.userID = ""; // also the sleeperID I think
        this.bedID = "";
        this.key = "";
        this.json = "";
        this.defaultBed = 0; // change if you want the class methods to default to a different bed in your datasets.
        this.testing = false;
    }
    login(callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/login",
            body: JSON.stringify({ login: this.username, password: this.password }),
        }, (err, resp, data) => {
            if (err) {
                return callback("Error: login PUT request returned undefined. Error:", err);
            }
            this.json = JSON.parse(data);
            this.userID = this.json.userID;
            this.key = this.json.key;
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {"userId":"",
          "key":"",
          "registrationState":13, // not sure what registrationState is used for
          "edpLoginStatus":200,
          "edpLoginMessage":"not used"}
        */
    }
    genURL(url) {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/" + url,
            qs: { _k: this.key },
        }, (err, resp, data) => {
            console.log(data);
        });
    }
    registration() {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/registration",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
          {"accountId":"", // different from userID/sleeperID
          "registrationState":"13"}
        */
    }
    familyStatus(callback = noop) {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/familyStatus",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            if (err) {
                return callback("Error: familyStatus GET request returned undefined. Error:", err);
            }
            if (data) {
                this.json = JSON.parse(data);
                if (this.json.beds) {
                    this.bedID = this.json.beds[this.defaultBed].bedId;
                }
                if (callback) {
                    callback(data);
                }
                // console.log(JSON.stringify(this.json, null, 3))
            }
        });
        /*
          {"beds":[ // array of beds
          {"status":1,
          "bedId":"", // used to identify each bed
          "leftSide":{"isInBed":false, // used in homebridge plugin
          "alertDetailedMessage":"No Alert",
          "sleepNumber":30, // used in homebridge plugin
          "alertId":0,
          "lastLink":"00:00:00",
          "pressure":1088},
          "rightSide":{"isInBed":false,
          "alertDetailedMessage":"No Alert",
          "sleepNumber":40,
          "alertId":0,
          "lastLink":"00:00:00",
          "pressure":1298}}]}
        */
    }
    sleeper() {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/sleeper",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
          {"sleepers":[
          {"firstName":"",
          "active":true,
          "emailValidated":true,
          "isChild":false,
          "bedId":"",
          "birthYear":"",
          "zipCode":"",
          "timezone":"",
          "isMale":true, // Lol
          "weight":###, // in lbs
          "duration":null,
          "sleeperId":"",
          "height":##, // in inches
          "licenseVersion":7,
          "username":"",
          "birthMonth":#,
          "sleepGoal":###, // in minutes
          "isAccountOwner":true,
          "accountId":"",
          "email":"",
          "avatar":"", // already blank, unlike the other blank ones :)
          "lastLogin":"2018-08-04 22:36:14 CDT",
          "side":0},
          {"firstName":"",
          "active":true,
          "emailValidated":false,
          "isChild":false,
          "bedId":"",
          "birthYear":"",
          "zipCode":"",
          "timezone":"",
          "isMale":false,
          "weight":###,
          "duration":null,
          "sleeperId":"",
          "height":##,
          "licenseVersion":0,
          "username":null,
          "birthMonth":#,
          "sleepGoal":###,
          "isAccountOwner":false,
          "accountId":"",
          "email":"null",
          "avatar":"",
          "lastLogin":null,
          "side":1}]}
        */
    }
    bed() {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            if (this.json.beds) {
                this.bedID = this.json.beds[this.defaultBed].bedId;
            }
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
          {"beds":[{"registrationDate":"2018-07-18T22:28:42Z",
          "sleeperRightId":"",
          "base":null,
          "returnRequestStatus":0,
          "size":"QUEEN",
          "name":"Bed",
          "serial":"",
          "isKidsBed":false,
          "dualSleep":true,
          "bedId":"",
          "status":1,
          "sleeperLeftId":"",
          "version":"",
          "accountId":"",
          "timezone":"",
          "generation":"360",
          "model":"C4",
          "purchaseDate":"2018-07-05T03:40:30Z",
          "macAddress":"",
          "sku":"QZC4",
          "zipcode":"",
          "reference":""}]} // not sure what reference is representing
        */
    }
    bedStatus() {
        // same information as familyStatus, but only for specified bed
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/status",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
          {"status":1,
          "leftSide":{
            "isInBed":false,
            "alertDetailedMessage":"No Alert",
            "sleepNumber":30,
            "alertId":0,
            "lastLink":"00:00:00",
            "pressure":1056
          },
          "rightSide":{
            "isInBed":false,
            "alertDetailedMessage":"No Alert",
            "sleepNumber":40,
            "alertId":0,
            "lastLink":"00:00:00",
            "pressure":1266
          }}
        */
    }
    bedPauseMode(callback = noop) {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/pauseMode",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            if (err) {
                return callback("Error: pauseMode GET request returned undefined. Error:", err);
            }
            if (data) {
                this.json = JSON.parse(data);
                if (callback) {
                    callback(data);
                }
                // console.log(JSON.stringify(this.json, null, 3))
            }
        });
        /*
          {"accountId":"",
          "bedId":"",
          "pauseMode":"off"} // pauseMode is privacy mode in the app
        */
    }
    // Mode is either 'on' or 'off'
    setBedPauseMode(mode, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/pauseMode",
            qs: { _k: this.key, mode: mode },
        }, (err, resp, data) => {
            if (err) {
                return callback("Error: pauseMode PUT request returned undefined. Error:", err);
            }
            if (data) {
                this.json = JSON.parse(data);
                if (callback) {
                    callback(data);
                }
                // console.log(JSON.stringify(this.json, null, 3))
            }
        });
        /*
          {"accountId":"",
          "bedId":"",
          "pauseMode":"off"} // pauseMode is privacy mode in the app
        */
    }
    forceIdle(callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/pump/forceIdle",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {} // Used to stop the pump if it is in the middle of an action (tapping the screen to stop)
        */
    }
    pumpStatus() {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/pump/status",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
          {"activeTask":0,
          "chamberType":1,
          "leftSideSleepNumber":40,
          "rightSideSleepNumber":40}
        */
    }
    // Side is either 'L' or 'R'. Num is any number in [1-6, 128]
    preset(side, num, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/preset",
            qs: { _k: this.key },
            body: JSON.stringify({ speed: 0, side: side, preset: num }),
        }, (err, resp, data) => {
            if (err) {
                return callback("preset PUT failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {}
        */
    }
    // Side is either 'L' or 'R'. Num is any number in the range [0-100]. Actuator is either 'F' or 'H' (foot or head).
    adjust(side, actuator, num, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/adjustment/micro",
            qs: { _k: this.key },
            body: JSON.stringify({
                speed: 0,
                side: side,
                position: num,
                actuator: actuator,
            }),
        }, (err, resp, data) => {
            if (err) {
                return callback("adjust PUT failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {}
        */
    }
    foundationStatus(callback = noop) {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/status",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            if (err) {
                return callback("foundationStatus GET failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (this.testing) {
                this.json = {
                    fsCurrentPositionPresetRight: "Not at preset",
                    fsNeedsHoming: false,
                    fsRightFootPosition: "00",
                    fsLeftPositionTimerLSB: "00",
                    fsTimerPositionPresetLeft: "No timer running, thus no preset to active",
                    fsCurrentPositionPresetLeft: "Not at preset",
                    fsLeftPositionTimerMSB: "00",
                    fsRightFootActuatorMotorStatus: "00",
                    fsCurrentPositionPreset: "00",
                    fsTimerPositionPresetRight: "No timer running, thus no preset to active",
                    fsType: "Split Head",
                    fsOutletsOn: false,
                    fsLeftHeadPosition: "09",
                    fsIsMoving: false,
                    fsRightHeadActuatorMotorStatus: "00",
                    fsStatusSummary: "42",
                    fsTimerPositionPreset: "00",
                    fsLeftFootPosition: "00",
                    fsRightPositionTimerLSB: "00",
                    fsTimedOutletsOn: false,
                    fsRightHeadPosition: "0c",
                    fsConfigured: true,
                    fsRightPositionTimerMSB: "00",
                    fsLeftHeadActuatorMotorStatus: "00",
                    fsLeftFootActuatorMotorStatus: "00",
                };
                if (callback) {
                    callback(JSON.stringify(this.json));
                    return;
                }
            }
            if (callback) {
                callback(data);
            }
        });
        // console.log(JSON.stringify(this.json, null, 3))}.bind(this))
        /*
          {
            "Error": {
              "Code": 404,
              "Message": " No Foundation Device"
            }
          }
          {
          "fsCurrentPositionPresetRight": "Flat",
          "fsNeedsHoming": false,
          "fsRightFootPosition": "00",
          "fsLeftPositionTimerLSB": "00",
          "fsTimerPositionPresetLeft": "No timer running, thus no preset to active",
          "fsCurrentPositionPresetLeft": "Zero G",
          "fsLeftPositionTimerMSB": "00",
          "fsRightFootActuatorMotorStatus": "00",
          "fsCurrentPositionPreset": "54",
          "fsTimerPositionPresetRight": "No timer running, thus no preset to active",
          "fsType": "Split King",
          "fsOutletsOn": false,
          "fsLeftHeadPosition": "00",
          "fsIsMoving": true,
          "fsRightHeadActuatorMotorStatus": "00",
          "fsStatusSummary": "45",
          "fsTimerPositionPreset": "00",
          "fsLeftFootPosition": "00",
          "fsRightPositionTimerLSB": "00",
          "fsTimedOutletsOn": false,
          "fsRightHeadPosition": "00",
          "fsConfigured": true,
          "fsRightPositionTimerMSB": "00",
          "fsLeftHeadActuatorMotorStatus": "01",
          "fsLeftFootActuatorMotorStatus": "00"
          }
        */
    }
    // num must be between 1 and 4 (1 and 2 are plugs, 3 and 4 control the light-strips)
    outletStatus(num, callback = noop) {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/outlet",
            qs: { _k: this.key, outletId: num },
        }, (err, resp, data) => {
            if (err) {
                return callback("outletStatus GET failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (this.testing) {
                this.json = {
                    bedId: this.bedID,
                    outlet: num,
                    setting: 0,
                    timer: null,
                };
                if (callback) {
                    callback(JSON.stringify(this.json));
                    return;
                }
            }
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
                "Error": {
                    "Code": 404,
                    "Message": "Foundation is not connected or not working properly"
                }
            */
    }
    // num must be between 1 and 4, setting is 0 or 1
    outlet(num, setting, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/outlet",
            qs: { _k: this.key },
            body: JSON.stringify({ outletId: num, setting: setting }),
        }, (err, resp, data) => {
            if (err) {
                return callback("outlet PUT failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (this.testing) {
                this.json = {
                    bedId: this.bedID,
                    outlet: num,
                    setting: setting,
                    timer: null,
                };
                if (callback) {
                    callback(JSON.stringify(this.json));
                    return;
                }
            }
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
              "Error": {
                  "Code": 404,
                  "Message": "Foundation is not connected or not working properly"
              }
            */
    }
    footWarmingStatus(callback = noop) {
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/footwarming",
            qs: { _k: this.key },
        }, (err, resp, data) => {
            if (err) {
                return callback("footWarmingStatus GET failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (this.testing) {
                this.json = {
                    footWarmingStatusLeft: 31,
                    footWarmingStatusRight: 0,
                    footWarmingTimerLeft: 292,
                    footWarmingTimerRight: 0,
                };
                if (callback) {
                    callback(JSON.stringify(this.json));
                    return;
                }
            }
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
                "Error": {
                    "Code": 404,
                    "Message": "Foundation is not connected or not working properly"
                }
            */
    }
    // temp is 0, 31, 57, 72
    // timer is 30m, 1h, 2h, 3h, 4h, 5h, 6h
    footWarming(side, temp, timer, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/footwarming",
            qs: side === "RIGHT"
                ? {
                    _k: this.key,
                    footWarmingTempRight: temp,
                    footWarmingTimerRight: timer,
                }
                : {
                    _k: this.key,
                    footWarmingTempLeft: temp,
                    footWarmingTimerLeft: timer,
                },
        }, (err, resp, data) => {
            if (err) {
                return callback("outlet PUT failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (this.testing) {
                this.json =
                    side === "RIGHT"
                        ? {
                            footWarmingStatusLeft: 31,
                            footWarmingStatusRight: temp,
                            footWarmingTimerLeft: 292,
                            footWarmingTimerRight: timer,
                        }
                        : {
                            footWarmingStatusLeft: temp,
                            footWarmingStatusRight: 0,
                            footWarmingTimerLeft: timer,
                            footWarmingTimerRight: 0,
                        };
                if (callback) {
                    callback(JSON.stringify(this.json));
                    return;
                }
            }
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
              "Error": {
                  "Code": 404,
                  "Message": "Foundation is not connected or not working properly"
              }
            */
    }
    // Side is 'L' or 'R',   head, massage, and foot are all 0 or 1
    motion(side, head, massage, foot, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/motion",
            qs: { _k: this.key },
            body: JSON.stringify({
                side: side,
                headMotion: head,
                massageMotion: massage,
                footMotion: foot,
            }),
        }, (err, resp, data) => {
            if (err) {
                return callback("motion PUT failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {}
        */
    }
    // Side is 'L' or 'R',   head, waveMode, and foot are all 0 or 1
    adjustment(side, head, waveMode, foot, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/foundation/adjustment",
            qs: { _k: this.key },
            body: JSON.stringify({
                side: side,
                headMassageMotor: head,
                massageWaveMode: waveMode,
                footMassageMotor: foot,
                massageTimer: 15,
            }),
        }, (err, resp, data) => {
            if (err) {
                return callback("adjustment PUT failed. Error:", err);
            }
            this.json = JSON.parse(data);
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {}
        */
    }
    // Side is either 'L' or 'R'. Num is any number in the range [0-100]
    sleepNumber(side, num, callback = noop) {
        return request({
            method: "PUT",
            uri: "https://api.sleepiq.sleepnumber.com/rest/bed/" +
                this.bedID +
                "/sleepNumber",
            qs: { _k: this.key },
            body: JSON.stringify({ side: side, sleepNumber: num }),
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            if (callback) {
                callback(data);
            }
            // console.log(JSON.stringify(this.json, null, 3))
        });
        /*
          {} // feel the power
        */
    }
    sleeperData(date, interval) {
        // date format: 'YYYY-MM-DD'
        // interval format: 'D1' (1 day), 'M1' (1 month), etc.
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/sleepData",
            qs: {
                _k: this.key,
                date: date,
                interval: interval,
                sleeper: this.userID,
            },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
          {"sleeperId":"",
          "message":"",
          "tip":"Exercise generally promotes better sleep.  It reduces stress and improves circulation.",
          "avgHeartRate":51,
          "avgRespirationRate":16,
          "totalSleepSessionTime":41343,
          "inBed":38496,
          "outOfBed":2847,
          "restful":29791,
          "restless":8705,
          "avgSleepIQ":73,
          "sleepData":[{"tip":"What you do during the day affects how well you sleep at night. Some small adjustments to your daily routine can dramatically affect how soundly you sleep at night.",
          "message":"You had a GOOD nights sleep",
          "date":"2018-08-01",
          "sessions":[{"startDate":"2018-07-31T21:19:59",
          "longest":true,
          "sleepIQCalculating":false,
          "originalStartDate":"2018-07-31T21:19:59",
          "restful":29791,
          "originalEndDate":"2018-08-01T08:49:02",
          "sleepNumber":30,
          "totalSleepSessionTime":41343,
          "avgHeartRate":51,
          "restless":8705,
          "avgRespirationRate":16,
          "isFinalized":true,
          "sleepQuotient":73,
          "endDate":"2018-08-01T08:49:02",
          "outOfBed":2847,
          "inBed":38496}],
          "goalEntry":null,
          "tags":[]}]}
        */
    }
    sleepSliceData(date) {
        // date format: 'YYYY-MM-DD'
        // can optionally add a format:'csv' argument to get back a csv version of the data
        return request({
            method: "GET",
            uri: "https://api.sleepiq.sleepnumber.com/rest/sleepSliceData",
            qs: { _k: this.key, date: date, sleeper: this.userID },
        }, (err, resp, data) => {
            this.json = JSON.parse(data);
            console.log(JSON.stringify(this.json, null, 3));
        });
        /*
        {"sleepers":[
          {"days":[
            {"date":"2018-08-01",
        "sliceList":[
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":599,
          "restfulTime":0,
          "restlessTime":1,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":270,
          "restlessTime":330,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":600,
          "type":2},
          {"outOfBedTime":587,
          "restfulTime":7,
          "restlessTime":6,
          "type":1},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":600,
          "type":2},
          {"outOfBedTime":89,
          "restfulTime":10,
          "restlessTime":501,
          "type":1},
          {"outOfBedTime":600,
          "restfulTime":0,
          "restlessTime":0,
          "type":1},
          {"outOfBedTime":600,
          "restfulTime":0,
          "restlessTime":0,
          "type":1},
          {"outOfBedTime":515,
          "restfulTime":0,
          "restlessTime":85,
          "type":2},
          {"outOfBedTime":231,
          "restfulTime":117,
          "restlessTime":252,
          "type":1},
          {"outOfBedTime":26,
          "restfulTime":39,
          "restlessTime":535,
          "type":1},
          {"outOfBedTime":0,
          "restfulTime":220,
          "restlessTime":380,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":270,
          "restlessTime":330,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":330,
          "restlessTime":270,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":600,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":280,
          "restlessTime":320,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":600,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":600,
          "type":2},
          {"outOfBedTime":199,
          "restfulTime":144,
          "restlessTime":257,
          "type":1},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":600,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":50,
          "restlessTime":550,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":570,
          "restlessTime":30,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":560,
          "restlessTime":40,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":570,
          "restlessTime":30,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":460,
          "restlessTime":140,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":420,
          "restlessTime":180,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":570,
          "restlessTime":30,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":600,
          "restlessTime":0,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":590,
          "restlessTime":10,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":580,
          "restlessTime":20,
          "type":3},
          {"outOfBedTime":0,
          "restfulTime":570,
          "restlessTime":30,
          "type":3},
          {"outOfBedTime":58,
          "restfulTime":10,
          "restlessTime":532,
          "type":2},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0},
          {"outOfBedTime":0,
          "restfulTime":0,
          "restlessTime":0,
          "type":0}]}],
          "sleeperId":"",
          "sliceSize":600}]}
        */
    }
}
module.exports = API;
var Accessory, Service, Characteristic, UUIDGen;
var snapi = require('./API.js');
module.exports = function (homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    homebridge.registerPlatform("homebridge-sleepiq", "SleepIQ", SleepIQPlatform, true);
};
class SleepIQPlatform {
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
                this.log.debug('SleepIQ Authenticating...');
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
                if (typeof err === 'string' || err instanceof String)
                    err = JSON.parse(err);
                if (!(err.statusCode === 401) && !(err.statusCode === 50002)) {
                    this.log("Failed to retrieve family status:", JSON.stringify(err));
                }
            }
            // Loop through each bed
            this.snapi.json.beds.forEach(async (bed, index) => {
                let bedName = "bed" + index;
                let bedID = bed.bedId;
                let sides = JSON.parse(JSON.stringify(bed));
                delete sides.status;
                delete sides.bedId;
                // Check if there is a foundation attached
                try {
                    await this.snapi.foundationStatus(((data, err = null) => {
                        if (err) {
                            this.log.debug(data, err);
                        }
                        else {
                            this.log.debug("foundationStatus result:", data);
                            let foundationStatus = JSON.parse(data);
                            if (foundationStatus.hasOwnProperty('Error')) {
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
                    }));
                }
                catch (err) {
                    if (typeof err === 'string' || err instanceof String)
                        err = JSON.parse(err);
                    if (!(err.statusCode === 404)) {
                        this.log("Failed to retrieve foundation status:", JSON.stringify(err));
                    }
                }
                // loop through each bed side
                Object.keys(sides).forEach((bedside, index) => {
                    try {
                        let sideName = bedName + bedside;
                        let sideID = bedID + bedside;
                        // register side number control
                        if (!this.accessories.has(sideID + 'number')) {
                            this.log("Found BedSide Number Control: ", sideName);
                            let uuid = UUIDGen.generate(sideID + 'number');
                            let bedSideNum = new Accessory(sideName + 'number', uuid);
                            bedSideNum.context.side = bedside[0].toUpperCase();
                            bedSideNum.context.sideID = sideID + 'number';
                            bedSideNum.context.sideName = sideName;
                            bedSideNum.context.type = 'number';
                            bedSideNum.addService(Service.Lightbulb, sideName + 'Number');
                            let numberService = bedSideNum.getService(Service.Lightbulb, sideName + 'Number');
                            numberService.addCharacteristic(Characteristic.Brightness);
                            let bedSideNumAccessory = new snNumber(this.log, bedSideNum, this.snapi);
                            bedSideNumAccessory.getServices();
                            this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideNum]);
                            this.accessories.set(sideID + 'number', bedSideNumAccessory);
                        }
                        else {
                            this.log(sideName + " number control already added from cache");
                        }
                        // check for foundation
                        if (this.hasFoundation) {
                            // register side foundation head and foot control units
                            if (!this.accessories.has(sideID + 'flex')) {
                                this.log("Found BedSide Flex Foundation: ", sideName);
                                let uuid = UUIDGen.generate(sideID + 'flex');
                                let bedSideFlex = new Accessory(sideName + 'flex', uuid);
                                bedSideFlex.context.side = bedside[0].toUpperCase();
                                bedSideFlex.context.sideID = sideID + 'flex';
                                bedSideFlex.context.sideName = sideName;
                                bedSideFlex.context.type = 'flex';
                                bedSideFlex.addService(Service.Lightbulb, sideName + 'FlexHead', 'head')
                                    .addCharacteristic(Characteristic.Brightness);
                                bedSideFlex.addService(Service.Lightbulb, sideName + 'FlexFoot', 'foot')
                                    .addCharacteristic(Characteristic.Brightness);
                                let bedSideFlexAccessory = new snFlex(this.log, bedSideFlex, this.snapi);
                                bedSideFlexAccessory.getServices();
                                this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideFlex]);
                                this.accessories.set(sideID + 'flex', bedSideFlexAccessory);
                            }
                            else {
                                this.log(sideName + " flex foundation already added from cache");
                            }
                        }
                    }
                    catch (err) {
                        this.log('Error when setting up bedsides:', err);
                    }
                });
            });
        };
        this.removeAccessory = (side) => {
            this.log('Remove Accessory: ', side.accessory.displayName);
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
            if (accessory.displayName.slice(-7) === 'privacy') {
                if (!accessory.context.bedName) {
                    this.log("Stale accessory. Marking for removal");
                    accessory.context.type = 'remove';
                }
            }
            if (accessory.displayName.slice(-4) === 'Side') {
                this.log("Stale accessory. Marking for removal");
                accessory.context.type = 'remove';
            }
            if (Array.from(this.accessories.values()).map((a) => a.accessory.displayName).includes(accessory.displayName)) {
                this.log("Duplicate accessory detected in cache: ", accessory.displayName, "If this appears incorrect, file a ticket on github. Removing duplicate accessory from cache.");
                this.log("You might need to restart homebridge to clear out the old data, especially if the accessory UUID got duplicated.");
                this.log("If the issue persists, try clearing your accessory cache.");
                accessory.context.type = 'remove';
            }
            switch (accessory.context.type) {
                case 'occupancy':
                    accessory.reachable = true;
                    let bedSideOccAccessory = new snOccupancy(this.log, accessory);
                    bedSideOccAccessory.getServices();
                    this.accessories.set(accessory.context.sideID, bedSideOccAccessory);
                    break;
                case 'number':
                    accessory.reachable = true;
                    let bedSideNumAccessory = new snNumber(this.log, accessory, this.snapi, this.sendDelay);
                    bedSideNumAccessory.getServices();
                    this.accessories.set(accessory.context.sideID, bedSideNumAccessory);
                    break;
                case 'flex':
                    accessory.reachable = true;
                    let bedSideFlexAccessory = new snFlex(this.log, accessory, this.snapi);
                    bedSideFlexAccessory.getServices();
                    this.accessories.set(accessory.context.sideID, bedSideFlexAccessory);
                    break;
                default:
                    this.log("Unknown accessory type. Removing from accessory cache.");
                case 'remove':
                    accessory.context.remove = true;
                    accessory.UUID = UUIDGen.generate(accessory.sideID + 'remove');
                    accessory._associatedHAPAccessory.UUID = accessory.UUID;
                    this.staleAccessories.push(accessory);
                    return false;
            }
            return true;
        };
        this.fetchData = async () => {
            this.log.debug('Getting SleepIQ JSON Data...');
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
                if (typeof err === 'string' || err instanceof String) {
                    err = JSON.parse(err);
                }
                const statusCode = err.statusCode;
                if (statusCode !== 401 && statusCode !== 50002) {
                    this.log("Unknown promise error. If it persists, please report it at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new:", JSON.stringify(err));
                }
            }
            // Check if sign-out occurred and re-authentication is needed
            if (this.snapi.json.hasOwnProperty('Error')) {
                if (this.snapi.json.Error.Code == 50002 || this.snapi.json.Error.Code == 401) {
                    this.log.debug('SleepIQ authentication failed, stand by for automatic re-authentication');
                    await this.authenticate();
                    //this.fetchData();
                }
                else {
                    this.log('SleepIQ authentication failed with an unknown error code. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new');
                }
            }
            else {
                this.log.debug('SleepIQ JSON data successfully retrieved');
                bedData = JSON.parse(JSON.stringify(this.snapi.json));
                this.parseData(bedData);
            }
        };
        this.parseData = (bedData) => {
            if (!bedData.beds) {
                this.log('Failed to find a bed, I think. I am not sure why, but if you have a bed attached to your account, you should probably file a bug.');
                return;
            }
            bedData.beds.forEach(async (bed, index) => {
                let bedID = bed.bedId;
                let sides = JSON.parse(JSON.stringify(bed));
                delete sides.status;
                delete sides.bedId;
                // check if new privacy switch detected
                if (!this.accessories.has(bedID + 'privacy')) {
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
                        this.log('Failed to retrieve bed pause mode:', err);
                    }
                    // update privacy status
                    let privacyData = JSON.parse(JSON.stringify(this.snapi.json));
                    this.log.debug('SleepIQ Privacy Mode: ' + privacyData.pauseMode);
                    let bedPrivacyAccessory = this.accessories.get(bedID + 'privacy');
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
                        if (!this.accessories.has(sideID + 'occupancy') || !this.accessories.has(sideID + 'number')) {
                            this.log("New bedside detected.");
                            this.addAccessories();
                            return;
                        }
                        else {
                            // update side occupancy
                            let thisSideOccupied = sides[bedside] && sides[bedside].isInBed;
                            this.log.debug('SleepIQ Occupancy Data: {' + bedside + ':' + thisSideOccupied + '}');
                            let bedSideOccAccessory = this.accessories.get(sideID + 'occupancy');
                            bedSideOccAccessory.setOccupancyDetected(thisSideOccupied);
                            anySideOccupied = anySideOccupied || thisSideOccupied;
                            bothSidesOccupied = bothSidesOccupied && thisSideOccupied;
                            // update side number
                            this.log.debug('SleepIQ Sleep Number: {' + bedside + ':' + sides[bedside].sleepNumber + '}');
                            let bedSideNumAccessory = this.accessories.get(sideID + 'number');
                            bedSideNumAccessory.updateSleepNumber(sides[bedside].sleepNumber);
                            // update foundation data
                            if (this.hasFoundation) {
                                this.log({ flexData });
                                if (flexData) {
                                    if (bedside == 'leftSide') {
                                        this.log.debug('SleepIQ Flex Data: {' + bedside + ': Head: ' + flexData.fsLeftHeadPosition + ", Foot:" + flexData.fsLeftFootPosition + '}');
                                        let bedSideFlexLeftAccessory = this.accessories.get(sideID + 'flex');
                                        bedSideFlexLeftAccessory.updateFoundation(flexData.fsLeftHeadPosition, flexData.fsLeftFootPosition);
                                    }
                                    else {
                                        this.log.debug('SleepIQ Flex Data: {' + bedside + ': Head: ' + flexData.fsRightHeadPosition + ", Foot:" + flexData.fsRightFootPosition + '}');
                                        let bedSideFlexRightAccessory = this.accessories.get(sideID + 'flex');
                                        bedSideFlexRightAccessory.updateFoundation(flexData.fsRightHeadPosition, flexData.fsRightFootPosition);
                                    }
                                }
                            } // if(this.hasFoundation)
                        }
                    });
                }
                else {
                    this.log('Failed to detect a bed side. I am not sure why, so you might want to file a ticket.');
                }
                let anySideOccAccessory = this.accessories.get(bedID + 'anySide' + 'occupancy');
                anySideOccAccessory.setOccupancyDetected(anySideOccupied);
                let bothSidesOccAccessory = this.accessories.get(bedID + 'bothSides' + 'occupancy');
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
            this.api.on('didFinishLaunching', () => {
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
}
class snOccupancy {
    constructor(log, accessory) {
        this.setOccupancyDetected = (value) => {
            if (value == true) {
                this.occupancyDetected = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
            }
            else {
                this.occupancyDetected = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
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
                .on('get', this.getOccupancyDetected.bind(this));
            return [informationService, this.occupancyService];
        };
        this.log = log;
        this.accessory = accessory;
        this.occupancyService = this.accessory.getService(Service.OccupancySensor);
        this.occupancyDetected = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
    }
    getOccupancyDetected(callback) {
        return callback(null, this.occupancyDetected);
    }
}
class snNumber {
    constructor(log, accessory, snapi, sendDelay = 2) {
        // Send a new sleep number to the bed
        this.setSleepNumber = (value) => {
            let side = this.accessory.context.side;
            this.log.debug('Setting sleep number=' + value + ' on side=' + side);
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
                this.log('Failed to set sleep number=' + value + ' on side=' + side + ' :', err);
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
                .on('set', (value, callback) => {
                this.log.debug("Sleep Number -> " + value);
                this.debounce(this.setSleepNumber, value, this.sendDelay);
                callback();
            })
                .on('get', this.getSleepNumber)
                .setProps({
                minValue: 5,
                maxValue: 100,
                minStep: 5
            });
            this.numberService
                .getCharacteristic(Characteristic.On)
                .on('change', (oldValue, newValue) => {
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
        this.numberService = this.accessory.getService(this.sideName + 'Number');
        this.numberService.setCharacteristic(Characteristic.On, true);
        this.debounce = this.debounce.bind(this);
        this.getSleepNumber = this.getSleepNumber.bind(this);
        this.setSleepNumber = this.setSleepNumber.bind(this);
        this.updateSleepNumber = this.updateSleepNumber.bind(this);
    }
    debounce(fn, value, delay) {
        let timeOutId;
        return function () {
            if (timeOutId) {
                clearTimeout(timeOutId);
            }
            timeOutId = setTimeout(() => {
                fn(value);
            }, delay);
        }();
    }
    // Keep sleep number updated with external changes through sleepIQ app
    updateSleepNumber(value) {
        this.sleepNumber = value;
    }
}
class snFlex {
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
                            if (foundationStatus.hasOwnProperty('Error')) {
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
                    if (typeof err === 'string' || err instanceof String)
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
            this.log.debug('Setting foundation position=' + value + ' on side=' + side + ' for position=' + actuator);
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
                this.log('Failed to set foundation position=' + value + ' on side=' + side + ' for position=' + actuator + ' :', err);
            }
        };
        // Keep foundation position updated with external changes through sleepIQ app
        this.updateFoundation = (head, foot) => {
            this.headPosition = head;
            this.footPosition = foot;
        };
        this.getFoundation = (actuator, callback) => {
            if (actuator == 'H') {
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
                .on('set', (value, callback) => {
                this.log.debug("Foundation Head -> " + value);
                this.setFoundation('H', value);
                callback();
            })
                .on('get', (callback) => this.getFoundation('H', callback));
            this.foundationHeadService
                .getCharacteristic(Characteristic.On)
                .on('change', (oldValue, newValue) => {
                this.log.debug("Foundation Head -> " + newValue);
                this.setFoundation('H', newValue);
            });
            this.foundationFootService
                .getCharacteristic(Characteristic.Brightness)
                .on('set', (value, callback) => {
                this.log.debug("Foundation Foot -> " + value);
                this.setFoundation('F', value);
                callback();
            })
                .on('get', (callback) => this.getFoundation('F', callback));
            this.foundationFootService
                .getCharacteristic(Characteristic.On)
                .on('change', (oldValue, newValue) => {
                this.log.debug("Foundation Foot -> " + newValue);
                this.setFoundation('F', newValue);
            });
            return [informationService, this.foundationHeadService, this.foundationFootService];
        };
        this.log = log;
        this.accessory = accessory;
        this.snapi = snapi;
        this.headPosition = 0;
        this.footPosition = 0;
        this.sideName = this.accessory.context.sideName;
        this.foundationIsMoving = false;
        this.foundationHeadService = this.accessory.getService(this.sideName + 'FlexHead');
        this.foundationFootService = this.accessory.getService(this.sideName + 'FlexFoot');
    }
    __delay__(timer) {
        return new Promise(resolve => {
            timer = timer || 2000;
            setTimeout(function () {
                resolve(undefined);
            }, timer);
        });
    }
    ;
}
