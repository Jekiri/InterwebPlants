// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Enable Firestore debugging
setLogLevel("debug");

const firebaseConfig = {
	apiKey: "AIzaSyCAqJ5pOizXYe6XTEjsQz0A3cZH4jpS2H8",
	authDomain: "interwebplants.firebaseapp.com",
	projectId: "interwebplants",
	storageBucket: "interwebplants.firebasestorage.app",
	messagingSenderId: "568838972773",
	appId: "1:568838972773:web:afcc9203f7dd1152976d8c",
	measurementId: "G-2YW9V8FJYK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Reference to Firestore document
const plantRef = doc(db, "plant", "state");

// Plant configurations
const plants = [
	{
		name: "tree",
		stages: [
			{ day: 1, png: "assets/pictures/tree_stage1.png" },
			{ day: 5, png: "assets/pictures/tree_stage2.png" },
			{ day: 10, png: "assets/pictures/tree_stage3.png" },
			{ day: 30, png: "assets/pictures/tree_stage4.png" },
			{ day: 150, png: "assets/pictures/tree_stage5.png" },
			{ day: 365, png: "assets/pictures/tree_stage6.png" }
		]
	}
];

// Constants
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in ms
const TIME_TO_DIE = 12 * 60 * 60 * 1000; // 12 hours in ms

// DOM Elements
const daysCounter = document.getElementById("days-counter");
const plantImg = document.getElementById("plant");
const soilMoistureEl = document.getElementById("soil-moisture");
const statusEl = document.getElementById("status");
const wateringCan = document.getElementById("watering-can");

// Update the UI with plant status
async function updatePlantUI(data) {
	const nowMs = Date.now();
	const lastWateredMs = data.lastWatered.toMillis();
	const plantedAtMs = data.plantedAt.toMillis();

	const timeSinceLastWatered = nowMs - lastWateredMs;
	const isDead = timeSinceLastWatered > TIME_TO_DIE;

	// Update status display
	statusEl.textContent = "Status: " + (isDead ? "Dead" : "Alive");
	statusEl.className = isDead ? "status-dead" : "status-alive";

	// Update soil moisture display
	const moistureLabel = getSoilMoistureLabel(timeSinceLastWatered);
	soilMoistureEl.textContent = "Soil Moisture: " + moistureLabel;
	soilMoistureEl.className = "soil-moisture-" + moistureLabel.toLowerCase();

	// Calculate days survived (as a display)
	const fullDays = Math.floor((nowMs - plantedAtMs) / ONE_DAY);
	daysCounter.textContent = isDead ? "0" : fullDays.toString();

	// Update plant stage
	const currentStage = plants[0].stages.find((stage) => fullDays >= stage.day) || plants[0].stages[0];
	plantImg.src = currentStage.png;

	console.log("Plant updated:", { ...data, isDead });
	if (isDead) {
		console.warn("The plant is dead. Please water it to restart.");
	}
}

// Reset the plant in Firestore
async function resetPlant() {
	const now = Timestamp.now();
	const resetData = {
		lastWatered: now,
		plantedAt: now,
		daysSurvived: 0
	};
	await setDoc(plantRef, resetData);
	console.log("Plant reset successfully!");
}

// Water the plant
async function waterPlant() {
	const docSnap = await getDoc(plantRef);

	// Initialization scenario if doc doesn't exist
	if (!docSnap.exists()) {
		const now = Timestamp.now();
		const initData = {
			lastWatered: now,
			plantedAt: now,
			daysSurvived: 0
		};
		await setDoc(plantRef, initData);
		console.log("Plant initialized successfully!");
		return;
	}

	const data = docSnap.data();
	const now = Timestamp.now();
	const nowMs = Date.now();
	const plantedAtMs = data.plantedAt.toMillis();
	const fullDays = Math.floor((nowMs - plantedAtMs) / ONE_DAY);
	const isDead = nowMs - data.lastWatered.toMillis() > TIME_TO_DIE;

	if (isDead) {
		// Dead -> Reset scenario
		await resetPlant();
		console.log("Plant was dead. Resetting...");
	} else {
		// Alive scenario
		// Check if at least one full day has passed since the last increment
		// If fullDays > data.daysSurvived, we are at or past a new 24-hour mark,
		// so we increment daysSurvived by 1 on this watering.
		if (fullDays > data.daysSurvived) {
			// Normal watering WITH increment
			const updateData = {
				...data,
				lastWatered: now,
				daysSurvived: data.daysSurvived + 1,
				// plantedAt stays the same
				plantedAt: data.plantedAt
			};
			await setDoc(plantRef, updateData);
			console.log("Plant watered + day incremented successfully!");
		} else {
			// Normal watering WITHOUT increment
			// Less than 24 hours since the last increment, but we still want to update lastWatered
			// This scenario updates soil moisture and lastWatered without incrementing daysSurvived.
			const updateData = {
				...data,
				lastWatered: now,
				// daysSurvived stays the same
				daysSurvived: data.daysSurvived,
				plantedAt: data.plantedAt // unchanged
			};
			await setDoc(plantRef, updateData);
			console.log("Plant watered without incrementing daysSurvived!");
		}
	}
}

// Get soil moisture label based on time since last watered
function getSoilMoistureLabel(timeSinceWatered) {
	const SOIL_MOISTURE_LEVELS = [
		{ label: "Soaked", duration: 1 * 60 * 60 * 1000 },
		{ label: "Wet", duration: 3 * 60 * 60 * 1000 },
		{ label: "Moist", duration: 6 * 60 * 60 * 1000 },
		{ label: "Damp", duration: 8 * 60 * 60 * 1000 },
		{ label: "Dry", duration: 10 * 60 * 60 * 1000 },
		{ label: "Cracking", duration: Infinity }
	];

	for (const level of SOIL_MOISTURE_LEVELS) {
		if (timeSinceWatered < level.duration) return level.label;
	}
	return "Cracking";
}

// Real-time listener for Firestore
onSnapshot(plantRef, (docSnap) => {
	if (docSnap.exists()) {
		updatePlantUI(docSnap.data());
	} else {
		// If no doc, initialize
		resetPlant();
	}
});

// Event listener for watering can
wateringCan.addEventListener("click", waterPlant);
