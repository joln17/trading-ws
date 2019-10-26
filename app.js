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
const coinCapWs = new WebSocket('wss://ws.coincap.io/prices?assets=' + assets.join());

const interval = 10; // s
const maxTime = 3600; // s

const histData = {};
const currentData = { timestamp: 0, price: {} };

for (const asset of assets) {
    histData[asset] = [];
}

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

    // Send real-time data
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

coinCapWs.onclose = () => {
    console.log('Disconnected.');
    // automatically try to reconnect on connection loss
};

wss.on('connection', ws => {
    ws.on('message', message => {
        if (message === 'getCurrentData') {
            ws.send(JSON.stringify({ currentData: currentData }));
        } else if (assets.includes(message)) {
            const histDataAsset = {
                asset: message,
                data: histData[message]
            };

            ws.send(JSON.stringify({ histData: histDataAsset }));
        }
    });
});

server.listen(8301);
