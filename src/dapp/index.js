import Contract from './contract';
import DOM from './dom';
import './flightsurety.css';


(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
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
                            option.text = data[i].name;
                            option.value = data[i].name;
                            dropdown.add(option);
                        }
                    })
                    .catch(function (err) {
                        console.error('Fetch Error -', err);
                    });
            })
        })

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{
                    label: 'Fetch Flight Status',
                    error: error,
                    value: result.flight + ' ' + result.timestamp
                }]);
            });
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