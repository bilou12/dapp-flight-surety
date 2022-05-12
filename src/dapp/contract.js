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
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < this.NB_AIRLINES) {
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

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        console.log('payload: ', payload);
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({
                from: self.owner
            }, (error, result) => {
                callback(error, payload);
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

    registerAirlinesMultisig(callback) {
        let self = this;

        // the 4th airlines are also registered by the first 3 airlines because of multisig requirement
        let airline = this.airlines[3];
        let registrantAirline = this.airlines[0];

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