  // Firebase configuration
  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
  import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
  import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";

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
  const analytics = getAnalytics(app); // Initialize Analytics

  // Reference to Firestore document
  const plantRef = doc(db, "plant", "state");

  // Plant configurations
  const plants = [
    {
      name: "tree",
      stages: [
        { day: 1, png: "assets/pictures/tree_stage1.png" }, // Initial stage
        { day: 5, png: "assets/pictures/tree_stage2.png" }, // Stage 2
        { day: 10, png: "assets/pictures/tree_stage3.png" }, // Stage 3
        { day: 30, png: "assets/pictures/tree_stage4.png" }, // Stage 4
        { day: 150, png: "assets/pictures/tree_stage5.png" }, // Stage 5
        { day: 365, png: "assets/pictures/tree_stage6.png" }, // Mature tree
      ],
    },
  ];

  // Constants
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const TIME_TO_DIE = 12 * 60 * 60 * 1000; // Time to die without water
  const SOIL_MOISTURE_LEVELS = [
    { label: "Soaked", duration: 2 * 60 * 60 * 1000 },  // 2 hours
    { label: "Wet", duration: 4 * 60 * 60 * 1000 },     // 4 hours
    { label: "Moist", duration: 6 * 60 * 60 * 1000 },   // 6 hours
    { label: "Damp", duration: 8 * 60 * 60 * 1000 },    // 8 hours
    { label: "Dry", duration: 10 * 60 * 60 * 1000 },    // 10 hours
    { label: "Cracking", duration: Infinity },          // Beyond 10 hours
  ];

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

    if (fullDays > daysSurvived) {
      data.daysSurvived = fullDays;
      await setDoc(plantRef, data);
    }

    // Update the UI
    daysCounter.textContent = data.daysSurvived;
    soilMoistureEl.textContent = `Soil Moisture: ${getSoilMoistureLabel(now - lastWatered)}`;

    const currentStage = plants[0].stages.find((stage) => data.daysSurvived >= stage.day) || plants[0].stages[0];
    plantImg.src = currentStage.png; // Display the correct image
  }

  // Reset the plant in Firestore
  async function resetPlant(data) {
    const now = Date.now();

    if (now - data.lastWatered <= TIME_TO_DIE) {
      console.warn("Reset denied: Plant is not dead yet.");
      return;
    }

    // Log reset event
    logEvent(analytics, "plant_reset", {
      daysSurvived: data.daysSurvived,
      reason: "death",
    });

    // Reset plant in Firestore
    await setDoc(plantRef, {
      lastWatered: now,
      plantedAt: now,
      daysSurvived: 0,
    });
    console.log("Plant reset successfully!");
  }

  // Water the plant
  async function waterPlant() {
    const now = Date.now();
    const docSnap = await getDoc(plantRef);
    const data = docSnap.data();

    if (now - data.lastWatered <= TIME_TO_DIE) {
      await setDoc(plantRef, {
        ...data,
        lastWatered: now,
      });

      // Log watering event
      logEvent(analytics, "plant_watered", {
        daysSurvived: data.daysSurvived,
        timestamp: now,
      });

      console.log("Plant watered successfully!");
    } else {
      console.warn("Watering denied: Plant is dead.");
    }
  }

  // Get the soil moisture label based on time since last watered
  function getSoilMoistureLabel(timeSinceWatered) {
    let elapsed = 0;
    for (const level of SOIL_MOISTURE_LEVELS) {
      elapsed += level.duration;
      if (timeSinceWatered < elapsed) {
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
      resetPlant({}); // Initialize the first plant if Firestore is empty
    }
  });

  // Event listener for watering button
  waterBtn.addEventListener("click", waterPlant);