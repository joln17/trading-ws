const express = require('express');
const app = express();
const WebSocket = require('ws');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const assets = ['bitcoin', 'ethereum', 'litecoin'];
const coinCapWs = new WebSocket('wss://ws.coincap.io/prices?assets=' + assets.join());

const interval = 10; // s
const maxTime = 3600; // s

const histData = {};
const currentData = { timestamp: 0, price: {} };

for (const asset of assets) {
    histData[asset] = [];
}

// Save historical data
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
    const savedTimestamp = histData[asset].length > 0 ?
        histData[asset][histData[asset].length - 1].timestamp :
        0;

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ rtData: rtDataAsset }));
        }
    });

    currentData.price[asset] = newData.value;
    currentData.timestamp = newData.timestamp;

    if (newData.timestamp - savedTimestamp >= interval * 1000) {
        histData[asset].push(newData);
        if (message.timestamp - histData[asset][0] > maxTime * 1000) {
            histData[asset].shift();
        }
        console.log(asset, ': ', JSON.stringify(newData));
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

server.listen(8300);
