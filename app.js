const express = require('express');
const app = express();
const WebSocket = require('ws');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const coinCapWs = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin');
const histData = [];
let savedTimestamp = 0;

// Save historical data for 1 day, logged every minute
coinCapWs.on('message', message => {
    message = JSON.parse(message);
    message.timestamp = Date.now();
    if (message.timestamp - savedTimestamp >= 60000) {
        histData.push(message);
        if (histData.length > 1440) {
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
        ws.send(JSON.stringify({ rtData: message }));
    });
});

server.listen(8300);
