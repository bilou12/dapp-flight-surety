import Contract from './contract';
import DOM from './dom';
import './flightsurety.css';


(async () => {

    let flight = null;
    let departureDate = null;
    let timestamp = null;
    let airline = null;
    let eventIndex = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [{
                label: 'Operational Status',
                error: error,
                value: result
            }]);
        });

        // Register airlines
        DOM.elid('register-airlines').addEventListener('click', () => {
            contract.registerAirlines((err, res) => {
                display('Airlines', 'Register airlines', [{
                    label: 'Register airline',
                    error: err,
                    value: res
                }])


                // Fetch available flights from REST API and display in dropdown
                let dropdown = document.getElementById('flight-number');
                dropdown.length = 0;

                const url = 'http://localhost:3000/flights';
                fetch(url)
                    .then((response) => response.json())
                    .then((data) => {
                        console.log(data)
                        let option;
                        data = data.result
                        for (let i = 0; i < data.length; i++) {
                            option = document.createElement('option');
                            option.text = data[i].flight;
                            option.value = data[i].flight;
                            dropdown.add(option);
                        }
                    })
                    .catch(function (err) {
                        console.error('Fetch Error -', err);
                    });
            })
        })

        DOM.elid('get-count-airlines').addEventListener('click', () => {
            contract.getCountAirlines((err, res) => {
                display('Airlines', 'Register airlines', [{
                    label: 'Count airline',
                    error: err,
                    value: res
                }])
            })
        })

        DOM.elid('get-count-multisig').addEventListener('click', () => {
            contract.getCountMultisig((err, res) => {
                display('Airlines', 'Register airlines', [{
                    label: 'Count multisig',
                    error: err,
                    value: res
                }])
            })
        })

        DOM.elid('is-registered-airline').addEventListener('click', () => {
            let airline = '';
            contract.isRegisteredAirline(airline, (err, res) => {
                display('Airlines', 'Is registered airline', [{
                    label: 'Is registered airline',
                    error: err,
                    value: res
                }])
            })
        })

        DOM.elid('register-airlines-mutisig').addEventListener('click', () => {
            contract.registerAirlinesMultisig((err, res) => {
                if (err) {
                    console.log('err:' + err);
                }
                display('Airlines', 'Register airlines multisig', [{
                    label: 'Register airline multisig',
                    error: err,
                    value: res
                }])

                console.log('checkpoint');

                // Fetch available flights from REST API and display in dropdown
                let dropdown = document.getElementById('flight-number');
                dropdown.length = 0;

                const url = 'http://localhost:3000/flights';
                fetch(url)
                    .then((response) => response.json())
                    .then((data) => {
                        let option;
                        console.log('data: ' + JSON.stringify(data))
                        data = data.result
                        for (let i = 0; i < data.length; i++) {
                            option = document.createElement('option');
                            option.text = data[i].flight;
                            option.value = data[i].flight;
                            dropdown.add(option);
                        }
                    })
                    .catch(function (err) {
                        console.error('Fetch Error -', err);
                    });
            })
        })

        DOM.elid('submit-oracle').addEventListener('click', () => {
            flight = DOM.elid('flight-number').value; // Get fight number
            departureDate = DOM.elid('departure-date').value; // Get departure date

            // fetch airline associated to the flight
            const url = 'http://localhost:3000/flights';
            fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    console.log('data: ' + JSON.stringify(data))
                    data = data.result
                    for (let i = 0; i < data.length; i++) {
                        if (data[i].flight != flight) {
                            continue
                        }
                        airline = data[i].airline;

                        // Write transaction
                        contract.fetchFlightStatus(flight, departureDate, airline, (err, payload) => {
                            console.log('payload: ' + JSON.stringify(payload));

                            flight = payload.flight;
                            timestamp = payload.timestamp;
                            airline = payload.airline;

                            display('Oracles', 'Trigger oracles', [{
                                label: 'Fetch Flight Status',
                                error: err,
                                value: 'flight: ' + payload.flight + ' | departureDate: ' + departureDate + ' | timestamp: ' + payload.timestamp + ' | airline: ' + payload.airline
                            }]);
                        });
                    }
                })
        })

        function getEventIndex() {
            const url = 'http://localhost:3000/eventIndex';

            fetch(url)
                .then((res) => res.json())
                .then((data) => {
                    console.log('data: ' + JSON.stringify(data));
                    eventIndex = data.result;
                    console.log('eventIndex: ' + eventIndex);
                })
        }

        DOM.elid('request-oracle').addEventListener('click', () => {
            getEventIndex();

            sleep(1000).then(() => {
                console.log('eventIndex: ' + parseInt(eventIndex));
                console.log('flight: ' + flight);
                console.log('airline: ' + airline);
                console.log('timestamp: ' + timestamp);

                contract.triggerOracleReponse(parseInt(eventIndex), flight, airline, timestamp, (err, res) => {
                    console.log('oracle-response: ' + JSON.stringify(res));
                })
            })
        })
    });
})();

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({
            className: 'row'
        }));
        row.appendChild(DOM.div({
            className: 'col-sm-4 field'
        }, result.label));
        row.appendChild(DOM.div({
            className: 'col-sm-8 field-value'
        }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}