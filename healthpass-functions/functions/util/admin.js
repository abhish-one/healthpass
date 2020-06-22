const admin = require('firebase-admin');
//const config = require('./config')

admin.initializeApp();

const db = admin.firestore();

module.exports = { admin, db };
