/* =========================================
   LUCKY DISTRICT
   MAIN APPLICATION
========================================= */

(() => {

    "use strict";


    /* =====================================
       CONFIGURATION
    ===================================== */

    const CONFIG = {
        startingPoints: 1000,
        storagePrefix: "luckyDistrict_"
    };


    /* =====================================
       ELEMENTS
    ===================================== */

    const elements = {

        gamesGrid: document.getElementById("gamesGrid"),

        gameSearch: document.getElementById("gameSearch"),

        filterList: document.getElementById("filterList"),

        emptyState: document.getElementById("emptyState"),

        headerPoints: document.getElementById("headerPoints"),

        gameCount: document.getElementById("gameCount"),

        profileButton: document.getElementById("profileButton"),

        profileInitial: document.getElementById("profileInitial"),

        profileModal: document.getElementById("profileModal"),

        closeProfile: document.getElementById("closeProfile"),

        modalAvatar: document.getElementById("modalAvatar"),

        modalUsername: document.getElementById("modalUsername"),

        modalPoints: document.getElementById("modalPoints"),

        usernameInput: document.getElementById("usernameInput"),

        saveProfile: document.getElementById("saveProfile"),

        resetDemo: document.getElementById("resetDemo"),

        toast: document.getElementById("toast"),

        toastMessage: document.getElementById("toastMessage"),

        favoritesNav: document.getElementById("favoritesNav"),

        mobileMenuButton: document.getElementById("mobileMenuButton"),

        mainNav: document.getElementById("mainNav"),

        featuredButton: document.querySelector(".featured-button")

    };


    /* =====================================
       STORAGE
    ===================================== */

    const storage = {

        get(key, fallback) {

            try {

                const value = localStorage.getItem(
                    CONFIG.storagePrefix + key
                );

                return value === null
                    ? fallback
                    : JSON.parse(value);

            } catch (error) {

                console.warn("Storage read error:", error);

                return fallback;

            }

        },


        set(key, value) {

            try {

                localStorage.setItem(
                    CONFIG.storagePrefix + key,
                    JSON.stringify(value)
                );

            } catch (error) {

                console.warn("Storage write error:", error);

            }

        },


        remove(key) {

            try {

                localStorage.removeItem(
                    CONFIG.storagePrefix + key
                );

            } catch (error) {

                console.warn("Storage remove error:", error);

            }

        }

    };


    /* =====================================
       STATE
    ===================================== */

    const state = {

        activeFilter: "all",

        searchQuery: "",

        favoritesOnly: false,

        favorites: storage.get("favorites", []),

        username: storage.get("username", "GUEST PLAYER"),

        points: storage.get("points", CONFIG.startingPoints)

    };


    /* =====================================
       UTILITIES
    ===================================== */

    function formatNumber(number) {

        return new Intl.NumberFormat("es-CL").format(number);

    }


    function showToast(message) {

        elements.toastMessage.textContent = message;

        elements.toast.classList.add("visible");

        clearTimeout(showToast.timeout);

        showToast.timeout = setTimeout(() => {

            elements.toast.classList.remove("visible");

        }, 2800);

    }


    function normalizeText(text) {

        return String(text)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    }


    function getGame(id) {

        return window.LD_GAMES.find(game => game.id === id);

    }


    /* =====================================
       PROFILE
    ===================================== */

    function updateProfile() {

        const initial = state.username
            .trim()
            .charAt(0)
            .toUpperCase() || "G";

        elements.profileInitial.textContent = initial;

        elements.modalAvatar.textContent = initial;

        elements.modalUsername.textContent = state.username;

        elements.usernameInput.value =
            state.username === "GUEST PLAYER"
                ? ""
                : state.username;

        updatePoints();

    }


    function updatePoints() {

        const formatted = formatNumber(state.points);

        elements.headerPoints.textContent = formatted;

        elements.modalPoints.textContent = formatted;

        storage.set("points", state.points);

    }


    function openProfile() {

        updateProfile();

        elements.profileModal.classList.remove("hidden");

        document.body.style.overflow = "hidden";

    }


    function closeProfile() {

        elements.profileModal.classList.add("hidden");

        document.body.style.overflow = "";

    }


    function saveProfile() {

        const username = elements.usernameInput.value
            .trim()
            .replace(/\s+/g, " ");

        if (!username) {

            showToast("Escribe un nombre de jugador.");

            return;

        }

        state.username = username.toUpperCase();

        storage.set("username", state.username);

        updateProfile();

        closeProfile();

        showToast("Perfil actualizado correctamente.");

    }


    function resetDemo() {

        state.username = "GUEST PLAYER";

        state.points = CONFIG.startingPoints;

        state.favorites = [];

        storage.set("username", state.username);

        storage.set("points", state.points);

        storage.set("favorites", state.favorites);

        updateProfile();

        renderGames();

        showToast("Datos de demostración restablecidos.");

    }


    /* =====================================
       FAVORITES
    ===================================== */

    function isFavorite(id) {

        return state.favorites.includes(id);

    }


    function toggleFavorite(id) {

        if (isFavorite(id)) {

            state.favorites = state.favorites.filter(
                favorite => favorite !== id
            );

            showToast("Juego eliminado de favoritos.");

        } else {

            state.favorites.push(id);

            showToast("Juego añadido a favoritos.");

        }

        storage.set("favorites", state.favorites);

        renderGames();

    }


    /* =====================================
       GAME FILTERING
    ===================================== */

    function getFilteredGames() {

        let games = [...window.LD_GAMES];

        if (state.favoritesOnly) {

            games = games.filter(game =>
                state.favorites.includes(game.id)
            );

        }

        if (state.activeFilter !== "all") {

            games = games.filter(game =>
                game.category === state.activeFilter
            );

        }

        if (state.searchQuery) {

            const query = normalizeText(state.searchQuery);

            games = games.filter(game => {

                const searchableText = normalizeText(
                    game.name + " " +
                    game.description + " " +
                    game.categoryLabel
                );

                return searchableText.includes(query);

            });

        }

        return games;

    }


    /* =====================================
       GAME CARDS
    ===================================== */

    function createGameCard(game, index) {

        const favorite = isFavorite(game.id);

        let statusClass = "status-soon";

        if (game.status === "ready") {

            statusClass = "status-ready";

        } else if (game.status === "development") {

            statusClass = "status-development";

        }

        const card = document.createElement("article");

        card.className = "game-card";

        card.style.animationDelay = `${index * 70}ms`;

        card.innerHTML = `

            <div class="game-card-art art-${game.glow}">

                <span class="game-code">
                    ${game.code}
                </span>

                <div class="game-card-icon">
                    ${game.icon}
                </div>

                <span class="game-status ${statusClass}">
                    ${game.statusLabel}
                </span>

            </div>

            <div class="game-card-content">

                <div class="game-card-top">

                    <span class="game-card-category">
                        ${game.categoryLabel}
                    </span>

                    <button
                        class="favorite-button ${favorite ? "active" : ""}"
                        data-favorite="${game.id}"
                        aria-label="${favorite ? "Quitar favorito" : "Añadir favorito"}"
                        aria-pressed="${favorite}"
                    >
                        ${favorite ? "♥" : "♡"}
                    </button>

                </div>

                <h3>${game.name}</h3>

                <p>${game.description}</p>

                <div class="game-card-footer">

                    <span class="game-mode">
                        ${game.mode}
                    </span>

                    <button
                        class="game-play-button"
                        data-game="${game.id}"
                    >
                        ${game.status === "ready" ? "JUGAR ↗" : "VER JUEGO ↗"}
                    </button>

                </div>

            </div>

        `;

        return card;

    }


    function renderGames() {

        const games = getFilteredGames();

        elements.gamesGrid.replaceChildren();

        games.forEach((game, index) => {

            const card = createGameCard(game, index);

            elements.gamesGrid.appendChild(card);

        });

        elements.emptyState.classList.toggle(
            "hidden",
            games.length > 0
        );

    }


    /* =====================================
       GAME NAVIGATION
    ===================================== */

    function openGame(id) {

        const game = getGame(id);

        if (!game) {

            showToast("No se encontró este juego.");

            return;

        }

        if (game.status !== "ready") {

            showToast(
                game.status === "development"
                    ? "Este juego todavía está en desarrollo."
                    : "Este juego estará disponible próximamente."
            );

            return;

        }

        window.location.href = game.href;

    }


    /* =====================================
       FILTERS
    ===================================== */

    function setFilter(filter) {

        state.activeFilter = filter;

        state.favoritesOnly = false;

        elements.filterList
            .querySelectorAll(".filter-button")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.filter === filter
                );

            });

        elements.favoritesNav.classList.remove("active");

        renderGames();

    }


    function showFavorites() {

        state.favoritesOnly = true;

        state.activeFilter = "all";

        elements.filterList
            .querySelectorAll(".filter-button")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.filter === "all"
                );

            });

        elements.favoritesNav.classList.add("active");

        document.getElementById("games").scrollIntoView({
            behavior: "smooth"
        });

        renderGames();

        elements.mainNav.classList.remove("open");

    }


    /* =====================================
       MOBILE MENU
    ===================================== */

    function toggleMobileMenu() {

        elements.mainNav.classList.toggle("open");

    }


    /* =====================================
       SEARCH SHORTCUT
    ===================================== */

    function setupSearchShortcut() {

        document.addEventListener("keydown", event => {

            if (
                event.key === "/" &&
                !["INPUT", "TEXTAREA"].includes(
                    document.activeElement.tagName
                )
            ) {

                event.preventDefault();

                elements.gameSearch.focus();

            }

            if (event.key === "Escape") {

                closeProfile();

                elements.mainNav.classList.remove("open");

            }

        });

    }


    /* =====================================
       EVENT LISTENERS
    ===================================== */

    function setupEvents() {

        elements.filterList.addEventListener("click", event => {

            const button = event.target.closest("[data-filter]");

            if (!button) return;

            setFilter(button.dataset.filter);

        });


        elements.gameSearch.addEventListener("input", event => {

            state.searchQuery = event.target.value;

            renderGames();

        });


        elements.gamesGrid.addEventListener("click", event => {

            const favoriteButton =
                event.target.closest("[data-favorite]");

            if (favoriteButton) {

                toggleFavorite(favoriteButton.dataset.favorite);

                return;

            }

            const gameButton =
                event.target.closest("[data-game]");

            if (gameButton) {

                openGame(gameButton.dataset.game);

            }

        });


        elements.featuredButton.addEventListener("click", () => {

            openGame("miners-drop");

        });


        elements.favoritesNav.addEventListener("click", showFavorites);


        elements.profileButton.addEventListener("click", openProfile);


        elements.closeProfile.addEventListener("click", closeProfile);


        elements.profileModal.addEventListener("click", event => {

            if (event.target === elements.profileModal) {

                closeProfile();

            }

        });


        elements.saveProfile.addEventListener("click", saveProfile);


        elements.usernameInput.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                saveProfile();

            }

        });


        elements.resetDemo.addEventListener("click", resetDemo);


        elements.mobileMenuButton.addEventListener(
            "click",
            toggleMobileMenu
        );


        elements.mainNav.querySelectorAll("a").forEach(link => {

            link.addEventListener("click", () => {

                elements.mainNav.classList.remove("open");

            });

        });

    }


    /* =====================================
       INITIALIZATION
    ===================================== */

    function initialize() {

        if (!Array.isArray(window.LD_GAMES)) {

            console.error("Game database could not be loaded.");

            showToast("Error al cargar los juegos.");

            return;

        }

        elements.gameCount.textContent =
            String(window.LD_GAMES.length).padStart(2, "0");

        updateProfile();

        renderGames();

        setupEvents();

        setupSearchShortcut();

        console.log("LUCKY DISTRICT initialized successfully.");

    }


    initialize();

})();