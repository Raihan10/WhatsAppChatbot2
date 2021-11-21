const fs = require('fs');
const { Client } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const { phoneNumberFormatter } = require('./formatter');
const port = process.env.port || 8000

const app = express();
const server = http.createServer(app);
const io = socketIO(server)

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

//var userSession;
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

var client;
let isAcknowledged = false;
let chatbotAnswer = "";

io.on('connection', function (socket) {
    socket.emit('message', 'Connecting');

    client = new Client({
        restartOnAuthFail: true,
        puppeteer: {
            headless: true
        },
        session: sessionCfg,
        // takeoverOnConflict: true,
        // authTimeoutMs: 100000,
        // qrRefreshIntervalMs: 10000
        // qrTimeoutMs: 100000
    });

    console.log("test")

    // client.initialize();

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
        // const msgBody = msg.body.toString();
        // const phoneNumberFormated = phoneNumberFormatter(msg.from);

        // socket.emit('message', phoneNumberFormated + "#" + msgBody);
        socket.emit('messageBody', msg.from, msg.body.toString());
        // socket.on('replyMessage', (arg) => {
        //     console.log(arg)
        // })
        //client.sendMessage(msg.from, `${msg.body.toString()}`);
        // let receiver, bodyMessage
        // socket.on('replyMessage', (msgFrom, msgBody) => {
        //     console.log(msgFrom)
        //     console.log(msgBody)
        //     receiver = msgFrom.toString()
        //     bodyMessage = msgBody.toString()
        //     msg.reply(msgBody)
        //     //client.sendMessage(msgFrom.toString(), `${msgBody.toString()}`);
        // })
        //client.sendMessage(receiver, `${bodyMessage}`);
        // while(chatbotAnswer == "") {

        // }
        // async function replyingMessage() {
        //     let myPromise = new Promise(function(resolve, reject) {
        //         // if(chatbotAnswer != "") {
        //             resolve(chatbotAnswer)
        //         // }
        //     })
        //     // chatbotAnswer = await myPromise;
        //     // return chatbotAnswer
        //     msg.reply(await myPromise)
        // }
        // replyingMessage()
        // async function replyingMessage() {
        //     let myPromise = new Promise(function(resolve) {
        //         setTimeout(function () {resolve("message has been received")}, 1000)
        //     })
        //     msg.reply(chatbotAnswer);
        //     console.log(await myPromise);
        //     // client.sendMessage(msgFrom.toString(), `${msgBody.toString()}`);
        // }
        async function replyingMessage() {
            let myPromise = new Promise(function(resolve) {
                socket.on('replyMessage', (msgBody) => {
                    console.log(msgBody)
                    //client.sendMessage(msgFrom.toString(), `${msgBody.toString()}`);
                    chatbotAnswer = msgBody
                    isAcknowledged = true
                    //msg.reply(chatbotAnswer)
                    // replyingMessage(msgBody)
                    resolve(msgBody)
                })
            })
            msg.reply(await myPromise)
        }
        replyingMessage()
        // socket.on('replyMessage', (msgFrom, msgBody) => {
        //     console.log(msgFrom)
        //     console.log(msgBody)
        //     //client.sendMessage(msgFrom.toString(), `${msgBody.toString()}`);
        //     chatbotAnswer = msgBody
        //     isAcknowledged = true
        //     msg.reply(chatbotAnswer)
        //     // replyingMessage(msgBody)
        // })
        //msg.reply(chatbotAnswer)
        // replyingMessage()
        // isAcknowledged = false
        // if (isAcknowledged) {
        //     msg.reply(chatbotAnswer)
        //     isAcknowledged = false
        // }
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

    // socket.on('disconnect', () => {
    //     console.log('user disconnected')
    // })

    // socket.on('replyMessage', (msgFrom, msgBody) => {
    //     console.log(msgFrom)
    //     console.log(msgBody)
    //     //client.sendMessage(msgFrom.toString(), `${msgBody.toString()}`);
    //     chatbotAnswer = msgBody
    //     isAcknowledged = true
    //     // replyingMessage(msgBody)
    // })

    // async function replyingMessage(msgBody) {
    //     let myPromise = new Promise(function(resolve) {
    //         setTimeout(function () {resolve(msgBody)}, 3000)
    //     })
    //     msg.reply(await myPromise);
    //     // client.sendMessage(msgFrom.toString(), `${msgBody.toString()}`);
    // }

    // client.initialize();
})

server.listen(port, () => {
    console.log("Listen Port " + port)
})
