const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
const FBAuth = require('./util/fbAuth');

const cors = require('cors');
app.use(cors());

const { db } = require('./util/admin');


const { signup, login,  getPatientReport , uploadLabReport} = require('./handlers/patients');
app.post('/signup', signup);
app.post('/login', login);
app.get('/getPatientReport',FBAuth, getPatientReport);
app.post('/uploadLabReport',FBAuth, uploadLabReport);

exports.api = functions.https.onRequest(app);


