import { db } from "./firebase-config.js";

import {
    collection,
    doc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


// ==========================
// VARIABLES GLOBALES
// ==========================
window.donneesTrajets = [];
window.dateSelectionnee = "";
window.trajetSelectionneId = "";

// Référence Firestore
const trajetsRef = collection(db, "trajets");
const reservationsRef = collection(db, "reservations");

// Code d'accès admin
const CODE_SECRET = "FICOTRANS2026";


// ==========================
// AUTHENTIFICATION SIMPLE
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    
    const lockScreen = document.getElementById("lock-screen");
    const adminContent = document.getElementById("admin-content");
    const unlockBtn = document.getElementById("btn-unlock");
    const codeInput = document.getElementById("admin-code-input");
    const lockError = document.getElementById("lock-error");
    
    unlockBtn.addEventListener("click", () => {
        if (codeInput.value === CODE_SECRET) {
            lockScreen.classList.add("hidden");
            adminContent.classList.remove("hidden");
            
            initialiserGestionnaire();
        } else {
            lockError.textContent = "Code d'accès incorrect.";
        }
    });
    
    codeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") unlockBtn.click();
    });
});


// ==========================
// INITIALISATION DU PANEL
// ==========================
function initialiserGestionnaire() {
    
    const filterDateInput = document.getElementById("filter-date");
    const btnAddTrajet = document.getElementById("btn-add-trajet");
    
    const aujourdhui = new Date().toISOString().split("T")[0];
    
    filterDateInput.value = aujourdhui;
    window.dateSelectionnee = aujourdhui;
    
    filterDateInput.addEventListener("change", (e) => {
        window.dateSelectionnee = e.target.value;
        window.rafraichirTrajets();
    });
    
    btnAddTrajet.onclick = ajouterNouveauTrajet;
    
    // Charger les données Firestore
    
    ecouterReservations();
    ecouterTrajetsTempsReel();
}


// ==========================
// CHARGEMENT DES TRAJETS FIRESTORE
// ==========================
async function chargerTrajets() {
    try {
        const snapshot = await getDocs(trajetsRef);

        window.donneesTrajets = [];

        snapshot.forEach(docSnap => {
            window.donneesTrajets.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        window.rafraichirTrajets();

    } catch (error) {
        console.error("Erreur chargement trajets :", error);
    }
}


// ==========================
// LISTENER TEMPS RÉEL (OPTIONNEL MAIS IMPORTANT)
// ==========================
// Synchronisation automatique admin en cas de changement Firestore
function ecouterTrajetsTempsReel() {
    onSnapshot(trajetsRef, (snapshot) => {

        window.donneesTrajets = [];

        snapshot.forEach(docSnap => {
            window.donneesTrajets.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        window.rafraichirTrajets();
    });
}



window.ajouterNouveauTrajet = async function () {
    const depart = prompt("Entrez la gare de DEPART :");
    if (!depart) return;

    const arrivee = prompt("Entrez la gare d'ARRIVEE :");
    if (!arrivee) return;

    if (depart.toLowerCase() === arrivee.toLowerCase()) {
        alert("Départ et arrivée identiques interdit.");
        return;
    }

    const id = "trajet_" + Date.now();

    try {
        await setDoc(doc(db, "trajets", id), {
            depart,
            arrivee,
            heures: []
        });

        chargerTrajets();
    } catch (e) {
        console.error(e);
    }
};


// ==========================
// MODIFIER TRAJET
// ==========================
window.modifierTrajet = async function (trajetId) {
    const trajet = window.donneesTrajets.find(t => t.id === trajetId);
    if (!trajet) return;

    const newDep = prompt("Modifier départ :", trajet.depart);
    const newArr = prompt("Modifier arrivée :", trajet.arrivee);

    if (!newDep || !newArr) return;

    try {
        await updateDoc(doc(db, "trajets", trajetId), {
            depart: newDep,
            arrivee: newArr
        });

        chargerTrajets();
    } catch (e) {
        console.error(e);
    }
};


// ==========================
// SUPPRIMER TRAJET
// ==========================
window.supprimerTrajet = async function (trajetId) {
    if (!confirm("Supprimer ce trajet ?")) return;

    try {
        await deleteDoc(doc(db, "trajets", trajetId));
        chargerTrajets();
    } catch (e) {
        console.error(e);
    }
};



// ==========================
// AJOUTER UN HORAIRE DE DÉPART
// ==========================
window.ajouterHeureDepart = async function (trajetId) {
    const heure = prompt("Entrez l'heure (ex: 06:00) :");
    if (!heure) return;

    const trajet = window.donneesTrajets.find(t => t.id === trajetId);
    if (!trajet) return;

    // Création des places (16 sièges)
    let placesInitiales = {};
    for (let i = 1; i <= 16; i++) {
        placesInitiales["place_" + i] = {
            statut: "libre",
            nom: "",
            telephone: ""
        };
    }

    const newHeure = {
        id: "heure_" + Date.now(),
        heure: heure,
        voiture: "Crafter 16p",
        places: placesInitiales
    };

    try {
        await updateDoc(doc(db, "trajets", trajetId), {
            heures: [...trajet.heures, newHeure]
        });

        chargerTrajets();
    } catch (e) {
        console.error(e);
    }
};


// ==========================
// SUPPRIMER UN HORAIRE
// ==========================
window.supprimerHeureDepart = async function (trajetId, heureId) {
    if (!confirm("Supprimer cet horaire ?")) return;

    const trajet = window.donneesTrajets.find(t => t.id === trajetId);
    if (!trajet) return;

    const newHeures = trajet.heures.filter(h => h.id !== heureId);

    try {
        await updateDoc(doc(db, "trajets", trajetId), {
            heures: newHeures
        });
        chargerTrajets();
ecouterReservations();

        
    } catch (e) {
        console.error(e);
    }
};




// ==========================
// SÉLECTION TRAJET (AFFICHAGE TABLEAU)
// ==========================
window.selectionnerTrajet = function(trajetId) {
    
    const trajet = window.donneesTrajets.find(t => t.id === trajetId);
    if (!trajet) return;
    
    window.trajetSelectionneId = trajetId;
    window.rafraichirTrajets();
    
    document.getElementById("trajets-list").classList.add("hidden");
    document.getElementById("trajet-detail").classList.remove("hidden");
    
    document.getElementById("titre-trajet-selectionne").textContent =
        `${trajet.depart} ➔ ${trajet.arrivee}`;
    
    // 🔥 IMPORTANT: reset + reload propre
    
    window.reconstruireTableauReservations();
};


window.rafraichirTrajets = function () {

    const conteneur = document.getElementById("trajets-list");
    conteneur.innerHTML = "";

    if (window.donneesTrajets.length === 0) {
        conteneur.innerHTML = `
            <p class="empty-state">
                Aucun trajet configuré. Cliquez sur + Ajouter un Trajet.
            </p>
        `;
        window.reconstruireTableauReservations();
        return;
    }

    window.donneesTrajets.forEach(trajet => {

        const card = document.createElement("div");
        card.className = "trajet-card";

        const actif = window.trajetSelectionneId === trajet.id ? "active" : "";

        card.innerHTML = `
            <div class="trajet-main-info">
                <h3>📍 ${trajet.depart} ➔ ${trajet.arrivee}</h3>

                <div class="actions">
                    <button class="btn-view ${actif}"
                        onclick="window.selectionnerTrajet('${trajet.id}'); window.rafraichirTrajets();">
                        📊 Réservations
                    </button>

                    <button class="btn-edit"
                        onclick="window.modifierTrajet('${trajet.id}')">
                        Modifier
                    </button>

                    <button class="btn-danger"
                        onclick="window.supprimerTrajet('${trajet.id}')">
                        Supprimer
                    </button>
                </div>
            </div>

            <div class="heures-container">
                <div class="heures-top-bar">
                    <h4>🕒 Horaires</h4>

                    <button class="btn-primary"
                        onclick="window.ajouterHeureDepart('${trajet.id}')">
                        + Ajouter horaire
                    </button>
                </div>

                <div id="heures-list-${trajet.id}"></div>
            </div>
        `;

        conteneur.appendChild(card);

        const conteneurHeures = document.getElementById(`heures-list-${trajet.id}`);

        const heuresTriees = [...trajet.heures].sort((a, b) =>
            a.heure.localeCompare(b.heure)
        );

        heuresTriees.forEach(h => {

            const div = document.createElement("div");
            div.className = "heure-block";

            div.innerHTML = `
                <div class="heure-header">
                    <strong>⏰ ${h.heure}</strong>

                    <button class="btn-danger-text"
                        onclick="window.supprimerHeureDepart('${trajet.id}', '${h.id}')">
                        Supprimer
                    </button>
                </div>

                <div class="crafter-layout" id="grid-${trajet.id}-${h.id}"></div>
            `;

            conteneurHeures.appendChild(div);

            const grille = document.getElementById(`grid-${trajet.id}-${h.id}`);

            const plan = [
                "allée", "allée", "1", "2",
                "3", "4", "5", "6",
                "7", "8", "allée", "9",
                "10", "11", "allée", "12",
                "13", "14", "15", "16"
            ];

            // ⚠️ réservation encore locale (sera corrigée en partie 8)
            const cle = `${window.dateSelectionnee}_${h.id}`;
            const places = window.reservationsParJour?.[cle] || {};

            plan.forEach(p => {

                if (p === "allée") {
                    const empty = document.createElement("div");
                    empty.className = "allée-vide";
                    grille.appendChild(empty);
                } else {
                    const btn = document.createElement("button");
                    const key = "place_" + p;

                    btn.className = `admin-seat ${
                        places[key]?.statut === "reserve" ? "reserved" : ""
                    }`;

                    btn.textContent = p;

                    btn.onclick = () =>
                        window.basculerStatutSiege(trajet.id, h.id, key);

                    grille.appendChild(btn);
                }
            });
        });
    });

    window.reconstruireTableauReservations();
};


// ==========================
// TABLEAU DES RÉSERVATIONS
// ==========================
window.reconstruireTableauReservations = function () {
    const tbody = document.getElementById("reservations-table-body");
    const section = document.getElementById("tableau-reservations-section");
    const titre = document.getElementById("titre-tableau-filtre");

    tbody.innerHTML = "";

    if (!window.trajetSelectionneId) {
        section.classList.add("hidden");
        return;
    }

    const trajet = window.donneesTrajets.find(
        t => t.id === window.trajetSelectionneId
    );

    if (!trajet) {
        section.classList.add("hidden");
        return;
    }

    section.classList.remove("hidden");

    const dateObj = new Date(window.dateSelectionnee);
    const dateFormat = dateObj.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    titre.textContent =
        `Réservations : ${trajet.depart} ➔ ${trajet.arrivee} (${dateFormat})`;

    let total = 0;

    trajet.heures.forEach(h => {

        const cle = `${window.dateSelectionnee}_${h.id}`;
        const places = window.reservationsParJour?.[cle];

        if (!places) return;

        for (let i = 1; i <= 16; i++) {

            const siege = places["place_" + i];

            if (siege && siege.statut === "reserve") {

                total++;

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>⏰ ${h.heure}</td>
                    <td><strong>${siege.nom}</strong></td>
                    <td>
                        <a href="tel:${siege.telephone}">
                            📞 ${siege.telephone}
                        </a>
                    </td>
                    <td><span class="seat-badge">N° ${i}</span></td>
                    <td style="text-align:center;">
                        <button class="btn-danger-text"
                            onclick="window.annulerReservationDirecte(
                                '${trajet.id}',
                                '${h.id}',
                                'place_${i}'
                            )">
                            Annuler
                        </button>
                    </td>
                `;

                tbody.appendChild(row);
            }
        }
    });

    if (total === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    Aucune réservation pour cette date.
                </td>
            </tr>
        `;
    }
};



// ==========================
// BASCULER STATUT SIÈGE (ADMIN CLICK)
// ==========================
window.basculerStatutSiege = async function (trajetId, heureId, cleSiege) {

    const cle = `${window.dateSelectionnee}_${heureId}`;

    if (!window.reservationsParJour) {
        window.reservationsParJour = {};
    }

    if (!window.reservationsParJour[cle]) {
        window.reservationsParJour[cle] = {};
    }

    const siegeActuel = window.reservationsParJour[cle][cleSiege];

    // ==========================
    // CAS 1 : SIÈGE DÉJÀ RÉSERVÉ → ANNULATION
    // ==========================
    if (siegeActuel && siegeActuel.statut === "reserve") {

        const reservation = window.listeReservations.find(r =>
            r.date === window.dateSelectionnee &&
            r.heureId === heureId &&
            r.sieges.includes(cleSiege)
        );

        if (!reservation) return;

        if (confirm(`Annuler réservation de ${reservation.nom} ?`)) {
            await annulerReservationFirestore(reservation.id);
        }

        return;
    }

    // ==========================
    // CAS 2 : AJOUT / RÉSERVATION
    // ==========================

    const nom = prompt("Nom du client :");
    if (!nom) return;

    const telephone = prompt("Téléphone :");
    if (!telephone) return;

    // Vérifie si le client existe déjà pour cette date + heure
    if (!window.listeReservations) window.listeReservations = [];
    let reservationExistante = window.listeReservations.find(r =>
        r.date === window.dateSelectionnee &&
        r.heureId === heureId &&
        r.nom === nom &&
        r.telephone === telephone
    );

    if (reservationExistante) {

        // Ajout du siège dans réservation existante
        if (!reservationExistante.sieges.includes(cleSiege)) {
            const nouveauxSieges = [...reservationExistante.sieges, cleSiege];

            await updateDoc(doc(db, "reservations", reservationExistante.id), {
                sieges: nouveauxSieges
            });
        }

    } else {

        // Nouvelle réservation
        await addDoc(reservationsRef, {
            trajetId,
            heureId,
            nom,
            telephone,
            sieges: [cleSiege],
            date: window.dateSelectionnee,
            createdAt: new Date()
        });
    }
};




window.annulerReservationDirecte = async function(trajetId, heureId, cleSiege) {
    
    const reservation = window.listeReservations.find(r =>
        r.date === window.dateSelectionnee &&
        r.heureId === heureId &&
        r.sieges.includes(cleSiege)
    );
    
    if (!reservation) return;
    
    if (!confirm(`Annuler ce siège pour ${reservation.nom} ?`)) return;
    
    const nouveauxSieges = reservation.sieges.filter(s => s !== cleSiege);
    
    if (nouveauxSieges.length === 0) {
        await annulerReservationFirestore(reservation.id);
    } else {
        await updateDoc(doc(db, "reservations", reservation.id), {
            sieges: nouveauxSieges
        });
    }
};



// ==========================
// ANNULER RÉSERVATION FIRESTORE
// ==========================
window.annulerReservationFirestore = async function (reservationId) {
    try {
        await deleteDoc(doc(db, "reservations", reservationId));
    } catch (e) {
        console.error(e);
    }
};
// ==========================
// SYNCHRONISATION TEMPS RÉEL RÉSERVATIONS
// ==========================
function ecouterReservations() {

    onSnapshot(reservationsRef, (snapshot) => {

        // ==========================
        // RESET DES STRUCTURES
        // ==========================
        window.reservationsParJour = {};
        window.listeReservations = [];

        snapshot.forEach(docSnap => {

            const r = docSnap.data();

            // ==========================
            // STOCK LISTE COMPLETE
            // ==========================
            window.listeReservations.push({
                id: docSnap.id,
                ...r
            });

            // ==========================
            // CLÉ DATE + HORAIRE
            // ==========================
            const cle = `${r.date}_${r.heureId}`;

            if (!window.reservationsParJour[cle]) {
                window.reservationsParJour[cle] = {};
            }

            // ==========================
            // PROTECTION (sieges undefined)
            // ==========================
            (r.sieges || []).forEach(siege => {

                window.reservationsParJour[cle][siege] = {
                    statut: "reserve",
                    nom: r.nom,
                    telephone: r.telephone,
                    reservationId: docSnap.id
                };
            });
        });

        // ==========================
        // REFRESH UI (SAFE + STABLE)
        // ==========================
        requestAnimationFrame(() => {
            window.rafraichirTrajets();
            window.reconstruireTableauReservations();

            if (typeof refreshReservationsView === "function") {
                refreshReservationsView();
            }
        });

    }, (error) => {
        console.error("Erreur écoute reservations :", error);
    });
}
window.retourListeTrajets = function () {

    window.trajetSelectionneId = "";

    document.getElementById("trajets-list").classList.remove("hidden");
    document.getElementById("trajet-detail").classList.add("hidden");

    window.rafraichirTrajets();
};



window.afficherDetailTrajet = function (trajet) {

    const containerHeures = document.getElementById("detail-heures");
    if (!containerHeures) return;

    containerHeures.innerHTML = "";

    trajet.heures.forEach(h => {

        const div = document.createElement("div");
        div.className = "heure-block";

        div.innerHTML = `
            <div class="heure-header">
                <strong>⏰ ${h.heure}</strong>

                <button class="btn-danger-text"
                    onclick="window.supprimerHeureDepart('${trajet.id}', '${h.id}')">
                    Supprimer
                </button>
            </div>

            <div class="crafter-layout" id="grid-${trajet.id}-${h.id}"></div>
        `;

        containerHeures.appendChild(div);

        const grille = document.getElementById(`grid-${trajet.id}-${h.id}`);

        const plan = [
            "allée", "allée", "1", "2",
            "3", "4", "5", "6",
            "7", "8", "allée", "9",
            "10", "11", "allée", "12",
            "13", "14", "15", "16"
        ];

        const cle = `${window.dateSelectionnee}_${h.id}`;
        const places = window.reservationsParJour?.[cle] || {};

        plan.forEach(p => {

            if (p === "allée") {
                const empty = document.createElement("div");
                empty.className = "allée-vide";
                grille.appendChild(empty);
            } else {
                const btn = document.createElement("button");
                const key = "place_" + p;

                btn.className = `admin-seat ${
                    places[key]?.statut === "reserve" ? "reserved" : ""
                }`;

                btn.textContent = p;

                btn.onclick = () =>
                    window.basculerStatutSiege(trajet.id, h.id, key);

                grille.appendChild(btn);
            }
        });
    });



};




window.afficherReservationsTrajet = function (trajet) {

    const tbody = document.getElementById("reservations-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    let total = 0;

    window.listeReservations.forEach(r => {

        if (r.date !== window.dateSelectionnee) return;

        trajet.heures.forEach(h => {

            if (r.heureId !== h.id) return;

            if (!r.sieges || r.sieges.length === 0) return;

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${r.date}</td>
                <td>⏰ ${h.heure}</td>
                <td><strong>${r.nom}</strong></td>
                <td><a href="tel:${r.telephone}">${r.telephone}</a></td>
                <td>${r.sieges.map(s => s.replace("place_", "")).join(", ")}</td>
                <td>
                    <button class="btn-danger-text"
                        onclick="window.annulerReservationFirestore('${r.id}')">
                        Annuler
                    </button>
                </td>
            `;

            tbody.appendChild(row);
            total++;
        });
    });

    if (total === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    Aucune réservation pour cette date.
                </td>
            </tr>
        `;
    }
};


    
