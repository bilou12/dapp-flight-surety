import express from 'express';
import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';

const http = require('http');

var cors = require('cors');

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let flightCounter = 0;
let flights = [];
let oracles = [];
let eventIndex = null;

function initOracles() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts()
      .then((accounts) => {
        let tx = [];
        let counter = 24;

        accounts.slice(11, 35).forEach(account => {
          flightSuretyApp.methods.registerOracle()
            .send({
              from: account,
              value: 1e+18,
              gas: 999999
            })
            .then(() => {
              flightSuretyApp.methods.getMyIndexes().call({
                  from: account
                })
                .then(res => {
                  tx.push(res);
                  oracles.push(account);
                  console.log(`Oracle Registered: ${res[0]}, ${res[1]}, ${res[2]} at ${account}`);
                  counter -= 1;
                  if (!counter) {
                    resolve(oracles);
                  }
                })
                .catch(err => {
                  reject(err);
                })
            })
            .catch(err => {
              reject(err);
            })
        })
      })
      .catch(err => {
        reject(err);
      })
  });
}

function initREST() {
  app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
  })

  app.get('/flights', (req, res) => {
    console.log('Endpoint /flights')
    res.json({
      result: flights
    })
  })

  app.get('/eventIndex', (req, res) => {
    res.json({
      result: eventIndex
    })
  })

  console.log("app endpoints are up & running");
}

function getFlight(airline) {
  var http = require('http');
  var options = {
    host: 'localhost',
    port: 3000,
    path: '/flights'
  };

  let flight = null;

  return new Promise((resolve, reject) => {
    var req = http.get(options, function (res) {

      console.log('status: ' + res.statusCode);

      // Buffer the body entirely for processing as a whole.
      var bodyChunks = [];
      res.on('data', function (chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
      }).on('end', function () {
        var data = Buffer.concat(bodyChunks);
        data = JSON.parse(data);
        data = data.result;
        for (let i = 0; i < data.length; i++) {
          if (data[i].airline != airline) {
            continue
          }
          flight = data[i].flight;
        }
        resolve(flight);
      }).on('error', function (e) {
        reject(e);
      })
    });
  })
}

initOracles().then(oracles => {
  console.log("Oracles registered");

  initREST();

  flightSuretyApp.events.RegisterAirline({
    fromBlock: 0
  }, (err, event) => {
    console.log("Event RegisterAirline:")

    if (err) console.log(err)

    let airlineAddress = event.returnValues._address;
    flightCounter += 1;
    let flight = 'FLG' + flightCounter;
    flights.push({
      "airline": airlineAddress,
      "flight": flight
    })
    console.log(flights);
  });

  flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, (err, event) => {
    console.log('Event OracleRequest')

    if (err) console.log(err)

    eventIndex = event.returnValues.index;
    // console.log(event)
  });

  flightSuretyApp.events.SubmitOracleResponse({
    fromBlock: 'latest'
  }, (err, event) => {
    if (err) console.log(err);

    console.log("Event SubmitOracleResponse");
    console.log(event);

    let airline = event.returnValues.airline;
    let timestamp = event.returnValues.timestamp;
    let index = event.returnValues.index;
    let statusCode = event.returnValues.statusCode;

    getFlight(airline)
      .then((flight) => {
        // todo - loop on oracles and submitOracleResponse
        oracles.forEach(oracle => {
          console.log('oracle: ' + oracle + ': submitOracleResponse: ' + index + ', ' + airline + ', ' + flight + ', ' + timestamp + ', ' + statusCode);

          flightSuretyApp.methods.submitOracleResponse(parseInt(index), airline, flight, parseInt(timestamp), parseInt(statusCode))
            .send({
              from: oracle,
              gas: 999999
            }).then(res => {
              // console.log(res)
            }).catch(err => {
              // console.log("Issue with the tx submitOracleResponse. It's expected some oracles fail because they dont have the same eventIndex.")
            })
        })
      })
      .catch((err) => {
        console.log(err);
      })
  })

  flightSuretyApp.events.OracleReport({
    fromBlock: 'latest'
  }, (err, event) => {
    if (err) console.log(err);

    console.log("Event OracleReport");
    // console.log(event);
  })

  flightSuretyApp.events.FlightStatusInfo({
    fromBlock: 'latest'
  }, (err, event) => {
    if (err) {
      console.log('err: ' + err)
    } else {
      console.log("Event FlightStatusInfo");
      console.log(event);
    }
  })

  flightSuretyApp.events.CreditInsurees({
    fromBlock: 'latest'
  }, (err, event) => {
    if (err) {
      console.log('err: ' + err)
    } else {
      console.log("Event CreditInsurees");
      console.log(event);
    }
  })

}).catch(err => {
  console.log(err)
})

const app = express();

app.use(cors());

export default app;