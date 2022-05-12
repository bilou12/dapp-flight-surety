import express from 'express';
import Web3 from 'web3';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';

var cors = require('cors');

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

const flights = []

flightSuretyApp.events.RegisterAirline({
  fromBlock: 0
}, (err, event) => {
  console.log("Event RegisterAirline:")
  if (err) {
    console.log(err)
  } else {
    let airlineAddress = event.returnValues._address;
    let shortAirlineName = airlineAddress.substring(airlineAddress.length - 5);
    flights.push({
      "name": shortAirlineName
    })
    console.log(flights);
  }
});

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  console.log(event)
});

const app = express();

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

app.use(cors());

initREST();

export default app;