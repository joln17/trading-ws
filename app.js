const express = require('express');
const app = express();
const WebSocket = require('ws');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const assets = 'bitcoin,ethereum,litecoin';
const coinCapWs = new WebSocket('wss://ws.coincap.io/prices?assets=' + assets);
const histData = {
    bitcoin: [],
    ethereum: [],
    litecoin: [],
    ripple: []
};
const interval = 10; // s
const maxTime = 3600; // s

// Save historical data
coinCapWs.on('message', message => {
    message = JSON.parse(message);
    const asset = Object.keys(message)[0];
    const newData = {
        value: parseFloat(message[asset]).toFixed(2),
        timestamp: Date.now()
    };
    const savedTimestamp = histData[asset].length > 0 ?
        histData[asset][histData[asset].length - 1].timestamp :
        0;

    if (newData.timestamp - savedTimestamp >= interval * 1000) {
        histData[asset].push(newData);
        if (message.timestamp - histData[asset][0] > maxTime * 1000) {
            histData[asset].shift();
        }
        console.log(asset, ': ', JSON.stringify(newData));
    }
});

wss.on('connection', ws => {
    ws.on('message', message => {
        if (message === 'getHistory') {
            const asset = 'bitcoin';
            const histDataAsset = {
                asset: asset,
                data: histData[asset]
            };

            ws.send(JSON.stringify({ histData: histDataAsset }));
        }
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

        ws.send(JSON.stringify({ rtData: rtDataAsset }));
    });
});

server.listen(8300);
