var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);

        await config.flightSuretyApp.fund({
            from: config.owner,
            value: 10e+18
        })
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, {
                from: config.testAddresses[2]
            });
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsFunded when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        } catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsFunded");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) cannot register an Airline using registerAirline() if it is not registered', async () => {
        // ARRANGE
        let newAirline = accounts[2];

        // check caller is registered
        let resCallerIsRegistered = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline, {
            from: config.owner
        })
        assert.equal(resCallerIsRegistered, false, "Caller is not registered")

        // check caller is not funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, false, "Caller is not funded")

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, {
                from: config.firstAirline
            });
        } catch (e) {
            // console.log(e);
        }
        let result2 = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

        // ASSERT
        assert.equal(result2, false, "Airline should not be able to register another airline if it isn't registered and then funded");

    });

    it('(airline) cannot register an Airline using registerAirline() if it is registered but not funded', async () => {
        // ARRANGE
        let newAirlineCaller = accounts[3];
        let newAirline = accounts[4];

        try {
            await config.flightSuretyApp.registerAirline(newAirlineCaller, {
                from: config.owner
            });
        } catch (e) {
            console.log(e);
        }

        // check caller is registered
        resCallerIsRegistered = await config.flightSuretyData.isAirlineRegistered.call(newAirlineCaller, {
            from: config.owner
        })
        assert.equal(resCallerIsRegistered, true, "Caller is registered")

        // check caller is not funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineFunded.call(newAirlineCaller, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, false, "Caller is not funded")

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, {
                from: newAirlineCaller
            });
        } catch (e) {
            // console.log(e);
        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it is registered but hasn't provided funding");

    });

    it('(airline) can register an Airline using registerAirline() if it is registered and funded', async () => {
        // ARRANGE
        let newAirline = accounts[5];

        // check caller is registered
        let resCallerIsRegistered = await config.flightSuretyData.isAirlineRegistered.call(config.owner, {
            from: config.owner
        })
        assert.equal(resCallerIsRegistered, true, "Caller is registered")

        // check caller is funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineRegistered.call(config.owner, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, true, "Caller is funded")

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, {
                from: config.owner
            });
        } catch (e) {
            console.log(e);
        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

        // ASSERT
        assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");
    });
});