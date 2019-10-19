const express = require('express');
const app = express();
const WebSocket = require('ws');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const coinCapWs = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin');

wss.on('connection', ws => {
    coinCapWs.on('message', message => {
        console.log(message);
        ws.send(message);
    });
});

server.listen(8300);
