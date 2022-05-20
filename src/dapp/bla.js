// import fetch from 'node-fetch';

// var url = new URL('http://localhost:3000/flights');

// fetch(url).then(response => response.json()).then(data => console.log(data)).catch(err => console.log(err));


const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/flights',
    method: 'GET',
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();