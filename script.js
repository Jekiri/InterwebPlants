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
const appElement = document.getElementById("app");
const plantImg = document.getElementById("plant");
const daysCounter = document.getElementById("days-counter");
const soilMoistureEl = document.getElementById("soil-moisture");
const waterBtn = document.getElementById("water-btn");

// Update the UI based on Firestore data
async function updatePlantUI(data) {
	const now = Date.now();
	const { lastWatered, plantedAt, daysSurvived } = data;

	// Calculate full days survived
	const timeElapsed = now - plantedAt;
	const fullDays = Math.floor(timeElapsed / ONE_DAY);

	// Ensure daysSurvived increments by at most 1
	if (fullDays === daysSurvived + 1) {
		data.daysSurvived = fullDays;
		console.log("Updating Firestore with:", data);
		await setDoc(plantRef, data); // Ensure continuity of `plantedAt`
	} else if (fullDays > daysSurvived + 1) {
		console.error("Days survived increment too large! Potential cheat detected.");
		return;
	}

	// Update the UI
	daysCounter.textContent = data.daysSurvived;
	soilMoistureEl.textContent = `Soil Moisture: ${getSoilMoistureLabel(now - lastWatered)}`;
	const currentStage = plants[0].stages.find((stage) => data.daysSurvived >= stage.day) || plants[0].stages[0];
	plantImg.src = currentStage.png; // Display the correct image
}


// Reset the plant in Firestore
async function resetPlant() {
	const now = Date.now();

	// Reset data with new planting time
	const resetData = {
		lastWatered: now,    // Reset watering time
		plantedAt: now,      // Reset planting time
		daysSurvived: 0,     // Reset survival days
	};

	console.log("Resetting plant with data:", resetData);
	await setDoc(plantRef, resetData); // Write new data to Firestore
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

	// Validate watering logic
	if (now - data.lastWatered <= TIME_TO_DIE) {
		const updateData = {
			lastWatered: now, // Update watering time
			daysSurvived: data.daysSurvived, // Keep days survived
			plantedAt: data.plantedAt, // Ensure continuity
		};

		console.log("Watering plant with data:", updateData);
		await setDoc(plantRef, updateData);
		console.log("Plant watered successfully!");
	} else {
		console.warn("Watering denied: Plant is dead.");
	}
}

// Get the soil moisture label
function getSoilMoistureLabel(timeSinceWatered) {
	const SOIL_MOISTURE_LEVELS = [
		{ label: "Soaked", duration: 2 * 60 * 60 * 1000 },
		{ label: "Wet", duration: 4 * 60 * 60 * 1000 },
		{ label: "Moist", duration: 6 * 60 * 60 * 1000 },
		{ label: "Damp", duration: 8 * 60 * 60 * 1000 },
		{ label: "Dry", duration: 10 * 60 * 60 * 1000 },
		{ label: "Cracking", duration: Infinity },
	];

	for (const level of SOIL_MOISTURE_LEVELS) {
		if (timeSinceWatered < level.duration) {
			return level.label;
		}
	}
	return "Cracking";
}

// Real-time listener for Firestore
onSnapshot(plantRef, (docSnap) => {
	if (docSnap.exists()) {
		updatePlantUI(docSnap.data());
	} else {
		resetPlant(); // Initialize the first plant if Firestore is empty
	}
});

// Event listener for watering button
waterBtn.addEventListener("click", waterPlant);
