import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';


export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.NB_AIRLINES = 4;

        const STATUS_CODE_UNKNOWN = 0;
        const STATUS_CODE_ON_TIME = 10;
        const STATUS_CODE_LATE_AIRLINE = 20;
        const STATUS_CODE_LATE_WEATHER = 30;
        const STATUS_CODE_LATE_TECHNICAL = 40;
        const STATUS_CODE_LATE_OTHER = 50;
        this.STATUS_CODES = Array(STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER);
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            this.airlines.push(this.owner);
            let counter = 1;

            while (this.airlines.length <= this.NB_AIRLINES) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            console.log("this.airlines:" + this.airlines)

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({
                from: self.owner
            }, callback);
    }

    fetchFlightStatus(flight, departureDate, airline, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            departureDate: departureDate,
            timestamp: Date.parse(departureDate.toString()) / 1000
        }
        console.log('payload: ', payload);
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({
                from: self.owner
            }, (err, res) => {
                callback(err, payload);
            });
    }

    registerAirlines(callback) {
        let self = this;

        console.log("this.airlines: " + this.airlines);

        // each airline is registered by self.owner
        for (const airline of this.airlines.slice(0, 4)) {
            console.log('registerAirlines: ' + airline + " with:" + self.owner);
            self.flightSuretyApp.methods
                .registerAirline(airline)
                .send({
                    from: self.owner
                }, (err, res) => {
                    callback(err, res)
                })
        }
    }

    getCountAirlines(callback) {
        let self = this;

        self.flightSuretyData.methods.getCountAirlines().call({
            from: self.owner
        }, (err, res) => {
            callback(err, res);
        })
    }

    getCountMultisig(callback) {
        let self = this;

        self.flightSuretyData.methods.countMultiSig().call({
            from: self.owner
        }, (err, res) => {
            callback(err, res);
        })
    }

    isRegisteredAirline(airline, callback) {
        let self = this;

        if (airline === '') {
            airline = this.airlines[0];
        }
        console.log('isRegisteredAirline: ' + airline);

        self.flightSuretyData.methods.isAirlineRegistered(airline).call({
            from: self.owner
        }, (err, res) => {
            callback(err, res)
        })
    }

    isFundedAirline(airline, callback) {
        let self = this;

        if (airline === '') {
            airline = this.airlines[0];
        }
        console.log('isRegisteredAirline: ' + airline);

        self.flightSuretyData.methods.isAirlineFunded(airline).call({
            from: self.owner
        }, (err, res) => {
            callback(err, res)
        })

    }

    registerAirlinesMultisig(callback) {
        let self = this;

        console.log('this.airlines:' + this.airlines);

        // the 5th airlines needs to be registered by 2 airlines because multisig started after the 4th airline
        let airline = this.airlines[4];

        console.log('airline: ' + airline);

        for (let i = 0; i < 2; i++) {
            let registrantAirline = this.airlines[i]; // need to be different than this.owner which has already registered the airline in registerAirline

            console.log('registerAirlines: ' + airline + " with:" + registrantAirline);
            self.flightSuretyApp.methods
                .registerAirline(airline)
                .send({
                    from: registrantAirline,
                    gas: "999999" // for some reasons, it needs more gas
                }, (err, res) => {
                    callback(err, res)
                })
        }
    }

    fundAirlines(callback) {
        let self = this;

        console.log('this.airlines:' + this.airlines);

        for (const airline of this.airlines) {
            self.flightSuretyApp.methods
                .fund()
                .send({
                    from: airline,
                    value: 10e+18
                }, (err, res) => {
                    callback(err, res)
                })
        }
    }

    triggerOracleReponse(eventIndex, flight, airline, timestamp, callback) {
        let self = this;

        const payload = {
            index: eventIndex,
            flight: String(flight),
            airline: airline,
            timestamp: timestamp,
            statusCode: self.STATUS_CODES[Math.floor(Math.random() * self.STATUS_CODES.length)]
        }

        self.flightSuretyApp.methods
            .triggerOracleEvent(payload.index, payload.airline, payload.flight, payload.timestamp, payload.statusCode)
            .send({
                from: self.owner
            }, (err, res) => {
                callback(err, payload)
            })
    }

    buyInsurance(fee, airline, flight, callback) {
        let self = this;

        console.log('buyInsurance - airline:' + airline + ', flight: ' + flight, 'fee: ' + fee);

        let value = Web3.utils.toWei(fee.toString(), "ether");
        console.log('value: ' + value);

        const payload = {
            airline: airline,
            flight: flight,
            passenger: this.passengers[0],
            value: value
        }

        self.flightSuretyApp.methods
            .buy(payload.airline, payload.flight)
            .send({
                from: payload.passenger,
                value: payload.value,
                gas: "999999" // for some reasons, it needs more gas
            }, (err, res) => {
                callback(err, payload);
            })
    }

    getFundsAirline(airline, callback) {
        let self = this;

        self.flightSuretyData.methods
            .getInsuranceFund(airline)
            .call({
                    from: self.owner
                },
                (err, res) => {
                    callback(err, res);
                })
    }
}