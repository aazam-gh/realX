// One-time script to set the first admin
// Run: node setAdmin.js

const admin = require('firebase-admin');

// Download your service account key from Firebase Console
// Project settings -> Service accounts -> Generate new private key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace with your GitHub user's UID from Firebase Auth
const uid = 'iDjFHX5FGqUJJkmW3r8ICSH8yJ83';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Admin claim set successfully!');
    console.log('Sign out and sign back in for changes to take effect.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  });
