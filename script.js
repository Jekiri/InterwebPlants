// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
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
	measurementId: "G-2YW9V8FJYK",
};

// Initialize Firebase, Firestore, and Analytics
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
			{ day: 365, png: "assets/pictures/tree_stage6.png" },
		],
	},
];

// Constants
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const TIME_TO_DIE = 12 * 60 * 60 * 1000; // Time to die without water

// DOM Elements
const daysCounter = document.getElementById("days-counter");
const plantImg = document.getElementById("plant");
const soilMoistureEl = document.getElementById("soil-moisture");
const statusEl = document.getElementById("status");
const waterBtn = document.getElementById("water-btn");

// Update the UI with plant status
async function updatePlantUI(data) {
	const now = Date.now();
	const { lastWatered, plantedAt, daysSurvived } = data;

	// Calculate plant status
	const timeSinceLastWatered = now - lastWatered;
	const isDead = timeSinceLastWatered > TIME_TO_DIE;

	// Update status display
	statusEl.textContent = Status: ${isDead ? "Dead" : "Alive"};
	statusEl.className = isDead ? "status-dead" : "status-alive";

	// Update soil moisture display
	const moistureLabel = getSoilMoistureLabel(timeSinceLastWatered);
	soilMoistureEl.textContent = Soil Moisture: ${moistureLabel};
	soilMoistureEl.className = soil-moisture-${moistureLabel.toLowerCase()};

	// Update days survived
	const fullDays = Math.floor((now - plantedAt) / ONE_DAY);
	daysCounter.textContent = isDead ? "0" : fullDays;

	// Update plant stage
	const currentStage = plants[0].stages.find((stage) => fullDays >= stage.day) || plants[0].stages[0];
	plantImg.src = currentStage.png;

	// Log updates
	console.log("Plant updated:", { ...data, isDead });

	if (isDead) {
		console.warn("The plant is dead. Please water it to restart.");
	}
}

// Reset the plant in Firestore
async function resetPlant() {
	const now = Date.now();
	const resetData = {
		lastWatered: now,
		plantedAt: now,
		daysSurvived: 0,
	};
	await setDoc(plantRef, resetData);
	console.log("Plant reset successfully!");
}

// Water the plant
async function waterPlant() {
	const now = Date.now();
	const docSnap = await getDoc(plantRef);

	if (!docSnap.exists()) {
		console.error("Plant document does not exist!");
		return;
	}

	const data = docSnap.data();
	const isDead = now - data.lastWatered > TIME_TO_DIE;

	if (isDead) {
		// Reset the plant if it's dead
		await resetPlant();
		console.log("Plant was dead. Resetting...");
	} else {
		// Water the plant normally
		const updateData = {
			...data,
			lastWatered: now,
		};
		await setDoc(plantRef, updateData);
		console.log("Plant watered successfully!");
	}
}


// Hours
// Get soil moisture label based on time since last watered
function getSoilMoistureLabel(timeSinceWatered) {
	const SOIL_MOISTURE_LEVELS = [
		{ label: "Soaked", duration: 30 * 60 * 1000 }, // 30 mins
		{ label: "Wet", duration: 1 * 60 * 60 * 1000 }, // 1 hour
		{ label: "Moist", duration: 3 * 60 * 60 * 1000 }, // 3 hours
		{ label: "Damp", duration: 5 * 60 * 60 * 1000 }, // 5 hours
		{ label: "Dry", duration: 8 * 60 * 60 * 1000 }, // 8 hours
		{ label: "Cracking", duration: Infinity },
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
		resetPlant();
	}
});

// Event listener for watering button
waterBtn.addEventListener("click", waterPlant);