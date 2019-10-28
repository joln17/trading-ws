const express = require('express');
const app = express();
const WebSocket = require('ws');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({
    verifyClient(info) {
        if (info.origin !== 'https://trading.joln17.me') {
            return false;
        }
        return true;
    },
    server
});

const assets = ['bitcoin', 'ethereum', 'litecoin'];
const coinCapUrl = 'wss://ws.coincap.io/prices?assets=' + assets.join();
let coinCapWs = new WebSocket(coinCapUrl);
let timeout = 10000;

const interval = 10; // s
const maxTime = 3600; // s

const histData = {};
const currentData = { timestamp: 0, price: {} };

for (const asset of assets) {
    histData[asset] = [];
}

// Try to reconnect when coincap WS is closed
function reconnect() {
    if (coinCapWs.readyState === WebSocket.CLOSED) {
        coinCapWs = new WebSocket(coinCapUrl);
    }
}

coinCapWs.on('open', () => {
    console.log('Connected.');
    timeout = 10000;
});

coinCapWs.on('message', message => {
    message = JSON.parse(message);
    const asset = Object.keys(message)[0];
    const newData = {
        value: parseFloat(message[asset]).toFixed(2),
        timestamp: Date.now()
    };
    const rtDataAsset = {
        asset: asset,
        data: newData
    };

    // Send real-time data to clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ rtData: rtDataAsset }));
        }
    });

    // Save current data
    currentData.price[asset] = newData.value;
    currentData.timestamp = newData.timestamp;

    const lastTS = histData[asset].length > 0 ?
        histData[asset][histData[asset].length - 1].timestamp :
        0;

    // Save historical data
    if (newData.timestamp - lastTS >= interval * 1000) {
        const firstTS = histData[asset].length > 0 ?
            histData[asset][0].timestamp :
            0;
        const index = newData.timestamp - firstTS >= maxTime * 1000 ? 1 : 0;

        histData[asset] = [...histData[asset].slice(index), newData];
    }
});

// Close coincap WS on error
coinCapWs.on('error', () => {
    console.log('Error.');
    coinCapWs.close();
});

// Try to reconnect with an incremental time intervall
coinCapWs.on('close', () => {
    console.log('Disconnected.');
    setTimeout(reconnect, timeout);
    timeout += timeout;
});

// Client connections
wss.on('connection', ws => {
    ws.on('message', message => {
        if (message === 'getCurrentData') {
            // Send latest data for all currencies
            ws.send(JSON.stringify({ currentData: currentData }));
        } else if (assets.includes(message)) {
            // Send historical data for the specific currency
            const histDataAsset = {
                asset: message,
                data: histData[message]
            };

            ws.send(JSON.stringify({ histData: histDataAsset }));
        }
    });
});

server.listen(8301);
