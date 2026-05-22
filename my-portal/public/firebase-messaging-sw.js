

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// now firebase is available globally
firebase.initializeApp({
  apiKey: "AIzaSyBaPD_d_-zFPjt-p2nXro4fERZrcdnHEI0",
  authDomain: "nodejs-training-1eb0f.firebaseapp.com",
  projectId: "nodejs-training-1eb0f",
  storageBucket: "nodejs-training-1eb0f.firebasestorage.app",
  messagingSenderId: "191409817787",
  appId: "1:191409817787:web:1090fef67ed7fefbb8419e"
});

const messaging = firebase.messaging();