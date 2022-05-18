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

        // check caller is not registered
        let resCallerIsRegistered = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline, {
            from: config.owner
        })
        assert.equal(resCallerIsRegistered, false, "Caller is registered")

        // check caller is not funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineFunded.call(config.firstAirline, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, false, "Caller is funded")

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

    it('(airline) can register an Airline using registerAirline() if it is registered but not funded', async () => {
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
        assert.equal(resCallerIsRegistered, true, "Caller is not registered")

        // check caller is not funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineFunded.call(newAirlineCaller, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, false, "Caller is funded")

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, {
                from: newAirlineCaller
            });
        } catch (e) {
            console.log(e);
        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

        // ASSERT
        assert.equal(result, true, "Airline should be able to register another airline if it is registered but hasn't provided funding");
    });

    it('(airline) can register an Airline using registerAirline() if it is registered and funded', async () => {
        // ARRANGE
        let newAirline = accounts[5];

        // check caller is registered
        let resCallerIsRegistered = await config.flightSuretyData.isAirlineRegistered.call(config.owner, {
            from: config.owner
        })
        assert.equal(resCallerIsRegistered, true, "Caller is not registered")

        // check caller is funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineFunded.call(config.owner, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, true, "Caller is not funded")

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

    it('(airline) can register an Airline using registerAirline() if it is registered and funded using multisig once there are more than 4 airlines', async () => {
        // CHECK
        // check caller is registered
        let resCallerIsRegistered = await config.flightSuretyData.isAirlineRegistered.call(config.owner, {
            from: config.owner
        })
        assert.equal(resCallerIsRegistered, true, "Caller is not registered")

        // check caller is funded
        let resCallerIsFunded = await config.flightSuretyData.isAirlineFunded.call(config.owner, {
            from: config.owner
        })
        assert.equal(resCallerIsFunded, true, "Caller is not funded")

        // ARRANGE
        // register and fund airline6
        async function registerAndFundNewAirline(newAirline, from, doRegister, testRegister, doFund, testFund) {
            if (doRegister) {
                await config.flightSuretyApp.registerAirline(newAirline, {
                    from: from
                });
            }

            if (testRegister) {
                let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
                assert.equal(result, true, "newAirline is not registered");
            }

            if (doFund) {
                await config.flightSuretyApp.fund({
                    from: newAirline,
                    value: 10e+18
                });
            }

            if (testFund) {
                let fund = await config.flightSuretyData.getAirlineFunds.call(newAirline);
                assert.equal(fund, 10e+18, "Funds do not match");
            }
        }

        let counter = await config.flightSuretyData.getCountAirlines.call();
        console.log("getCountAirlines 1: ", counter.toNumber());
        let counterMultiSig = await config.flightSuretyData.countMultiSig.call();
        console.log("countMultiSig 1: ", counterMultiSig.toNumber());

        let newAirline3 = accounts[3];

        // ACT
        let newAirline6 = accounts[6];
        await registerAndFundNewAirline(newAirline6, config.owner, true, false, false, false);
        counter = await config.flightSuretyData.getCountAirlines.call();
        console.log("getCountAirlines 2: ", counter.toNumber());
        counterMultiSig = await config.flightSuretyData.countMultiSig.call();
        console.log("countMultiSig 2: ", counterMultiSig.toNumber());

        await registerAndFundNewAirline(newAirline6, newAirline3, true, true, false, false);
        counter = await config.flightSuretyData.getCountAirlines.call();
        console.log("getCountAirlines 3: ", counter.toNumber());
        counterMultiSig = await config.flightSuretyData.countMultiSig.call();
        console.log("countMultiSig 3: ", counterMultiSig.toNumber());
    })

    it('(airline) can fund an Airline using fund() so that it can participate in the contract', async () => {
        // ARRANGE
        let newAirline = accounts[3];

        // check newAirline is registered
        let isRegistered = await config.flightSuretyData.isAirlineRegistered.call(newAirline, {
            from: config.owner
        })
        assert.equal(isRegistered, true, "newAirline is not registered")

        // check newAirline is not funded
        let isFunded = await config.flightSuretyData.isAirlineFunded.call(newAirline, {
            from: config.owner
        })
        assert.equal(isFunded, false, "newAirline is funded")

        // ACT
        await config.flightSuretyApp.fund({
            from: newAirline,
            value: 10e+18
        });

        // ASSERT
        // assert newAirline is now funded
        isFunded = await config.flightSuretyData.isAirlineFunded.call(newAirline, {
            from: config.owner
        })
        assert.equal(isFunded, true, "Caller is not funded")

        let funds = await config.flightSuretyData.getAirlineFunds.call(newAirline, {
            from: config.owner
        })
        assert.equal(funds, 10e+18, "Funds do not match");
    });

    it('(passenger) can buy an insurance for a flight', async () => {
        let flight = 'FLG1';
        let airline = accounts[3];

        // ARRANGE
        // check that the airline is registered and funded
        let isRegistered = await config.flightSuretyData.isAirlineRegistered.call(airline, {
            from: config.owner
        })
        assert.equal(isRegistered, true, "newAirline is not registered")

        let isFunded = await config.flightSuretyData.isAirlineFunded.call(airline, {
            from: config.owner
        })
        assert.equal(isFunded, true, "newAirline is not funded")

        let insuranceFund;
        insuranceFund = await config.flightSuretyData.getInsuranceFund.call(airline);
        assert(insuranceFund, 0, "The airline has already received funds from one customer")

        // ACT
        // buy insurance for the 1st customer
        await config.flightSuretyApp.buy(airline, flight, {
            from: config.firstCustomer,
            value: 1000
        })

        insuranceFund = await config.flightSuretyData.getInsuranceFund.call(airline);
        assert(insuranceFund, 1000, "Insurance fund does not match.")

        let insuranceContract = await config.flightSuretyData.getInsuranceContract.call(flight, config.firstCustomer)
        assert(insuranceContract, 1000, "insuranceContract amount does not match")
    })
});