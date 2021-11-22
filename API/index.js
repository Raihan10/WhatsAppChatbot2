const fs = require('fs');
const { Client } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const port = process.env.port || 8000

const app = express();
const server = http.createServer(app);
const io = socketIO(server)

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

var client;

io.on('connection', function (socket) {
    socket.emit('message', 'Connecting');

    client = new Client({
        restartOnAuthFail: true,
        puppeteer: {
            headless: true
        },
        session: sessionCfg,
    });

    console.log("test")

    client.on('qr', (qr) => {
        console.log('QR code', qr)
        socket.emit('qr', qr);
        socket.emit('message', 'Please scan QR Code to login');
    });

    client.on('ready', () => {
        socket.emit('ready');
        socket.emit('message', 'WA ready');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', session);
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
        socket.emit('message', 'WA authenticated');
    })

    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessfull
        console.error('AUTHENTICATION FAILURE', msg);
    });

    client.on('message', msg => {
        socket.emit('messageBody', msg.from, msg.body.toString());
        async function replyingMessage() {
            let myPromise = new Promise(function(resolve) {
                socket.on('replyMessage', (msgBody) => {
                    console.log(msgBody)
                    resolve(msgBody)
                })
            })
            msg.reply(await myPromise)
        }
        replyingMessage()
    })

    client.on('disconnected', (reason) => {
        console.log('Client was logged out', reason);
        socket.emit('loggedOut', reason)
    });

    client.initialize();

    socket.on('loggedOut', () => {
        console.log('user logged out')
        client.logOut()
    })
})

server.listen(port, () => {
    console.log("Listen Port " + port)
})
