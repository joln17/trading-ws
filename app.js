const express = require('express');
const app = express();
const WebSocket = require('ws');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const coinCapWs = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin');
const histData = [];
const logInterval = 5; // s
const logMaxTime = 3600; // s
let savedTimestamp = 0;


// Save historical data
coinCapWs.on('message', message => {
    message = JSON.parse(message);
    message.timestamp = Date.now();
    message.bitcoin = parseFloat(message.bitcoin).toFixed(2);
    if (message.timestamp - savedTimestamp >= logInterval * 1000) {
        histData.push(message);
        if (histData.length > logMaxTime / logInterval) {
            histData.shift();
        }
        savedTimestamp = message.timestamp;
        console.log(JSON.stringify(message));
    }
});

wss.on('connection', ws => {
    ws.send( JSON.stringify({ histData: histData }));
    coinCapWs.on('message', message => {
        message = JSON.parse(message);
        message.timestamp = Date.now();
        message.bitcoin = parseFloat(message.bitcoin).toFixed(2);
        ws.send(JSON.stringify({ rtData: message }));
    });
});

server.listen(8300);
