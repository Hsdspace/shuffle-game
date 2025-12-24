// config.js
// 1. Paste the code you got from Firebase Console below:
const firebaseConfig = {
    apiKey: "AIzaSyCXcE-UaLqaE8m6p4Etbv0-ZGbV1dx5biU",
    authDomain: "secretsantagame-f6988.firebaseapp.com",
    projectId: "secretsantagame-f6988",
    storageBucket: "secretsantagame-f6988.firebasestorage.app",
    messagingSenderId: "46052432256",
    appId: "1:46052432256:web:7e7f775461b2586fdf4965"
};

// 2. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();