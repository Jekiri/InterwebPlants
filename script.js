// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Reference to Firestore document
const plantRef = doc(db, "plant", "state");

// Plant configuration
const plants = {
  tree: {
    stages: [
      { day: 1, gif: "assets/gifs/tree_stage1.gif", background: "assets/backgrounds/forest_day1.jpg" },
      { day: 30, gif: "assets/gifs/tree_stage2.gif", background: "assets/backgrounds/forest_day30.jpg" },
      { day: 300, gif: "assets/gifs/tree_stage3.gif", background: "assets/backgrounds/forest_day300.jpg" },
    ],
  },
};

const ONE_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds

// DOM Elements
const appElement = document.getElementById("app");
const plantImg = document.getElementById("plant");
const daysCounter = document.getElementById("days-counter");
const lastWateredEl = document.getElementById("last-watered");
const countdownTimer = document.getElementById("countdown-timer");
const waterBtn = document.getElementById("water-btn");

// Update UI based on Firestore data
function updatePlantUI(data) {
  const now = Date.now();
  const { lastWatered, daysSurvived } = data;

  if (!lastWatered) {
    countdownTimer.textContent = "Not watered yet!";
    lastWateredEl.textContent = "Never watered";
    daysCounter.textContent = 0;
    waterBtn.disabled = false;
    plantImg.src = "assets/gifs/tree_stage1.gif";
    appElement.style.backgroundImage = "url(assets/backgrounds/forest_day1.jpg)";
    return;
  }

  const timeSinceWatered = now - lastWatered;
  const timeUntilNextWater = ONE_DAY - timeSinceWatered;

  daysCounter.textContent = daysSurvived;
  lastWateredEl.textContent = formatTime(timeSinceWatered);
  countdownTimer.textContent = timeUntilNextWater <= 0 ? "Ready to water!" : formatTime(timeUntilNextWater);
  waterBtn.disabled = timeUntilNextWater > 0;

  const currentStage = plants.tree.stages.find(stage => daysSurvived >= stage.day) || plants.tree.stages[0];
  plantImg.src = currentStage.gif;
  appElement.style.backgroundImage = `url(${currentStage.background})`;
}

// Format time for display
function formatTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Water the plant
async function waterPlant() {
 
