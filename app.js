document.addEventListener("DOMContentLoaded", () => {
    // Récupération de toutes les images du diaporama
    const slides = document.querySelectorAll(".slide");
    let currentSlideIndex = 0;
    const slideIntervalTime = 3500; // Changement toutes les 3,5 secondes

    function nextSlide() {
        // Enlever la classe 'active' de l'image actuelle (devient invisible)
        slides[currentSlideIndex].classList.remove("active");

        // Passer à l'image suivante, ou revenir à 0 si on est à la fin (Boucle)
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;

        // Ajouter la classe 'active' sur la nouvelle image (devient visible)
        slides[currentSlideIndex].classList.add("active");
    }

    // Lancement du diaporama automatique
    setInterval(nextSlide, slideIntervalTime);
});
