// ======================================================
// FIREBASE & GAME LOGIC
// ======================================================

// DOM Elements
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const shuffleBtn = document.getElementById('shuffleBtn'); 
const nameInput = document.getElementById('nameInput');   

// Modals & Inputs
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const loginBtn = document.getElementById('loginBtn');
const winnerModal = document.getElementById('winnerModal');
const winnerText = document.getElementById('winnerText');
const welcomeHeader = document.getElementById('welcomeHeader');

// Game State
let currentUser = "";
let wheelItems = []; 
const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
    '#9966FF', '#FF9F40', '#8AC926', '#1982C4', 
    '#6A4C93', '#F15BB5'
];

// Physics Variables
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 0;
let spinTime = 0;
let spinTimeTotal = 0;
let isSpinning = false;

// 1. INITIALIZATION
function init() {
    console.log("Initializing Game...");

    // A. Listen for Wheel Config from Firebase
    if (typeof db !== 'undefined') {
        db.collection("settings").doc("wheelConfig").onSnapshot((doc) => {
            if (doc.exists && doc.data().items && doc.data().items.length > 0) {
                 // Load data from DB
                 wheelItems = doc.data().items;
                 // Update the visual list for the user
                 nameInput.value = wheelItems.join('\n');
                 updateWheel();
            } else {
                // Fallback defaults
                wheelItems = ['Hari', 'Tanya', 'Kashish', 'Mohit', 'Ayushi']; 
                nameInput.value = wheelItems.join('\n');
                updateWheel();
            }
        }, (error) => {
            console.error("Error getting config:", error);
        });
    }

    // B. Event Listeners
    loginBtn.addEventListener('click', handleLogin);
    spinBtn.addEventListener('click', spin);
    
    // Shuffle Button
    shuffleBtn.addEventListener('click', () => {
        if (isSpinning) return;
        wheelItems.sort(() => Math.random() - 0.5);
        nameInput.value = wheelItems.join('\n');
        updateWheel();
    });

    // Manual Input Changes
    nameInput.addEventListener('input', () => {
        if (isSpinning) return;
        wheelItems = nameInput.value.split('\n').filter(n => n.trim() !== '');
        updateWheel();
    });
}

// 2. LOGIN & UNIQUENESS CHECK
async function handleLogin() {
    const name = usernameInput.value.trim();
    if (!name) return alert("Please enter your name.");

    loginBtn.innerText = "Checking...";
    loginBtn.disabled = true;

    try {
        const snapshot = await db.collection("records").where("user", "==", name).get();
        if (!snapshot.empty) {
            alert("⚠️ You have already played! Only one spin allowed per person.");
            loginBtn.innerText = "Start Game";
            loginBtn.disabled = false;
            return;
        }
        currentUser = name;
        loginModal.style.display = 'none';
        welcomeHeader.innerText = `Welcome, ${currentUser}!`;
        
    } catch (error) {
        console.error("Login Error:", error);
        alert("Connection failed. Please refresh and try again.");
        loginBtn.innerText = "Start Game";
        loginBtn.disabled = false;
    }
}

// 3. WHEEL DRAWING
function updateWheel() {
    if (wheelItems.length === 0) return;
    arc = Math.PI * 2 / wheelItems.length;
    drawWheel();
}

function drawWheel() {
    if (!canvas.getContext) return;

    const outsideRadius = 240;
    const textRadius = 180; // Pushed text further out for better visibility
    const insideRadius = 0;

    ctx.clearRect(0, 0, 500, 500);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    // Increased font size for numbers
    ctx.font = 'bold 28px Helvetica, Arial'; 

    for (let i = 0; i < wheelItems.length; i++) {
        const angle = startAngle + i * arc;
        
        // Draw Slice
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(250, 250, outsideRadius, angle, angle + arc, false);
        ctx.arc(250, 250, insideRadius, angle + arc, angle, true);
        ctx.stroke();
        ctx.fill();

        // Draw Text
        ctx.save();
        ctx.fillStyle = "white";
        ctx.translate(250 + Math.cos(angle + arc / 2) * textRadius, 
                      250 + Math.sin(angle + arc / 2) * textRadius);
        ctx.rotate(angle + arc / 2 + Math.PI / 2);
        
        // --- CHANGE HERE: SHOW NUMBERS INSTEAD OF NAMES ---
        // We use (i + 1) to show "1", "2", "3" etc.
        const displayText = (i + 1).toString();
        
        ctx.fillText(displayText, -ctx.measureText(displayText).width / 2, 0);
        ctx.restore();
    }
}

// 4. SPINNING LOGIC
function spin() {
    if (isSpinning) return;
    if (!currentUser) return location.reload(); 
    if (wheelItems.length === 0) return alert("List is empty!");

    isSpinning = true;
    spinBtn.disabled = true;
    shuffleBtn.disabled = true;
    spinBtn.style.background = "#ccc"; 

    spinAngleStart = Math.random() * 10 + 10;
    spinTime = 0;
    spinTimeTotal = Math.random() * 3000 + 4000; 

    requestAnimationFrame(rotateWheel);
}

function rotateWheel() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawWheel();
    requestAnimationFrame(rotateWheel);
}

function stopRotateWheel() {
    isSpinning = false;
    
    // Calculate Result
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - degrees % 360) / arcd);
    
    // Get actual name (Hidden on wheel, revealed here)
    const safeIndex = index % wheelItems.length;
    const resultPrize = wheelItems[safeIndex];

    saveResultToDB(resultPrize);
}

// 5. SAVE RESULT & SHOW WINNER
function saveResultToDB(prize) {
    // Show the Winning Name IMMEDIATELY
    winnerText.innerText = prize;
    winnerModal.classList.remove('hidden'); 
    winnerModal.style.display = 'flex';

    // Save to database
    db.collection("records").add({
        user: currentUser,
        result: prize,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log("Result saved.");
    }).catch((error) => {
        console.error("Error saving result:", error);
    });
}

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

init();