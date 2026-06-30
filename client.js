import { db } from "./firebase-config.js";

import {
    collection,
    doc,
    getDocs,
    addDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


// ==========================
// VARIABLES CLIENT
// ==========================
window.clientTrajetId = "";
window.clientDate = "";
window.selectedHeureId = "";
window.selectedSiegeCle = "";

window.donneesTrajets = [];

const trajetsRef = collection(db, "trajets");
const reservationsRef = collection(db, "reservations");


// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    
    const selectTrajet = document.getElementById("select-trajet");
    const clientDateInput = document.getElementById("client-date");
    
    const today = new Date().toISOString().split("T")[0];
    clientDateInput.value = today;
    clientDateInput.min = today;
    window.clientDate = today;
    
    chargerTrajetsClient();
    
    selectTrajet.addEventListener("change", (e) => {
        window.clientTrajetId = e.target.value;
        reinitialiser();
        afficherVoitures();
    });
    
    clientDateInput.addEventListener("change", (e) => {
        window.clientDate = e.target.value;
        reinitialiser();
        afficherVoitures();
    });
    
    document.getElementById("btn-close-alert").onclick = () => {
        document.getElementById("custom-alert").classList.add("hidden");
        reinitialiser();
        afficherVoitures();
    };
    
    ecouterReservations();
});


// ==========================
// CHARGER TRAJETS FIRESTORE
// ==========================
async function chargerTrajetsClient() {
    const snapshot = await getDocs(trajetsRef);
    
    window.donneesTrajets = [];
    
    const select = document.getElementById("select-trajet");
    select.innerHTML = `<option value="" disabled selected>Choisir un trajet...</option>`;
    
    snapshot.forEach(docSnap => {
        const t = {
            id: docSnap.id,
            ...docSnap.data()
        };
        
        window.donneesTrajets.push(t);
        
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.depart} ➔ ${t.arrivee}`;
        select.appendChild(opt);
    });
}


// ==========================
// RESET
// ==========================
function reinitialiser() {
    window.selectedHeureId = "";
    window.selectedSiegeCle = "";
    document.getElementById("step-form-section").classList.add("hidden");
}


// ==========================
// AFFICHAGE VOITURES
// ==========================
window.afficherVoitures = function() {
    
    const list = document.getElementById("client-cars-list");
    const step = document.getElementById("step-seats-section");
    
    list.innerHTML = "";
    
    if (!window.clientTrajetId) return;
    
    const trajet = window.donneesTrajets.find(t => t.id === window.clientTrajetId);
    if (!trajet) return;
    
    step.classList.remove("hidden");
    
    const heures = [...trajet.heures].sort((a, b) =>
        a.heure.localeCompare(b.heure)
    );
    
    heures.forEach(h => {
        
        const block = document.createElement("div");
        block.className = "client-car-block";
        
        block.innerHTML = `
            <span class="client-car-title">⏰ ${h.heure}</span>
            <div class="crafter-layout" id="grid-${h.id}"></div>
        `;
        
        list.appendChild(block);
        
        const grid = document.getElementById(`grid-${h.id}`);
        
        const plan = [
            "allée", "allée", "1", "2",
            "3", "4", "5", "6",
            "7", "8", "allée", "9",
            "10", "11", "allée", "12",
            "13", "14", "15", "16"
        ];
        
        const key = `${window.clientDate}_${h.id}`;
        const places = window.reservationsMap?.[key] || {};
        
        plan.forEach(p => {
            
            if (p === "allée") {
                const d = document.createElement("div");
                d.className = "allée-vide";
                grid.appendChild(d);
            } else {
                
                const btn = document.createElement("button");
                const siegeKey = "place_" + p;
                
                const isReserved = places && places[siegeKey]?.statut === "reserve";

btn.className = `client-seat ${isReserved ? "reserved" : ""}`;

btn.disabled = isReserved;
                
                btn.textContent = p;
                
                btn.onclick = () => {
                    
                    window.selectedHeureId = h.id;
                    window.selectedSiegeCle = siegeKey;
                    
                    document.getElementById("summary-seat-badge").textContent = "N° " + p;
                    document.getElementById("summary-time").textContent = h.heure;
                    
                    document.getElementById("step-form-section").classList.remove("hidden");
                    document.getElementById("step-form-section").scrollIntoView({ behavior: "smooth" });
                };
                
                grid.appendChild(btn);
            }
        });
    });
};


// ==========================
// RESERVATION CLIENT FIRESTORE
// ==========================
document.getElementById("booking-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("client-name").value;
    const phone = document.getElementById("client-phone").value;
    
    const key = `${window.clientDate}_${window.selectedHeureId}`;

// Vérifier si déjà réservé
const current = window.reservationsMap?.[key]?.[window.selectedSiegeCle];

if (current) {
    alert("❌ Ce siège est déjà réservé !");
    return;
}

// recheck Firestore avant écriture
await addDoc(reservationsRef, {
    trajetId: window.clientTrajetId,
    heureId: window.selectedHeureId,
    sieges: [window.selectedSiegeCle],
    nom: name,
    telephone: phone,
    date: window.clientDate,
    createdAt: new Date()
});
    
    document.getElementById("custom-alert").classList.remove("hidden");
    document.getElementById("booking-form").reset();
});


// ==========================
// TEMPS RÉEL RÉSERVATIONS
// ==========================
function ecouterReservations() {

    onSnapshot(reservationsRef, (snapshot) => {

        window.reservationsMap = {};

        snapshot.forEach(docSnap => {

            const r = docSnap.data();

            const key = `${r.date}_${r.heureId}`;

            if (!window.reservationsMap[key]) {
                window.reservationsMap[key] = {};
            }

            // ==========================
            // CAS 1 : ancien format (siege)
            // ==========================
            if (r.siege) {
                window.reservationsMap[key][r.siege] = {
                    statut: "reserve",
                    nom: r.nom,
                    telephone: r.telephone,
                    reservationId: docSnap.id
                };
            }

            // ==========================
            // CAS 2 : format moderne (sieges[])
            // ==========================
            if (r.sieges && Array.isArray(r.sieges)) {
                r.sieges.forEach(siege => {
                    window.reservationsMap[key][siege] = {
                        statut: "reserve",
                        nom: r.nom,
                        telephone: r.telephone,
                        reservationId: docSnap.id
                    };
                });
            }
        });

        // ==========================
        // REFRESH UI
        // ==========================
        if (window.clientTrajetId) {
            afficherVoitures();
        }
    }, (error) => {
        console.error("Erreur écoute reservations :", error);
    });
}
