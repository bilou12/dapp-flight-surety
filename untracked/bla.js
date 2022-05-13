function getFlight(airline) {
    var http = require('http');
    var options = {
        host: 'localhost',
        port: 3000,
        path: '/flights'
    };


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

getFlight("0xf17f52151EbEF6C7334FAD080c5704D77216b732").then(res => {
    console.log(res);
}).catch(err => {
    console.log(err)
})