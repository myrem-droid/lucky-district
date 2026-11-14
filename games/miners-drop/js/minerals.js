
// ======================================================
// MINER'S DROP 2.0
// MINERAL SYSTEM
// ======================================================

export const MINERALS = {

    stone: {
        id: "stone",
        name: "Roca",
        color: "#777985",
        secondaryColor: "#a0a2aa",

        health: 35,
        score: 10,

        rarity: 1,
        minDepth: 0,

        size: 32
    },

    copper: {
        id: "copper",
        name: "Cobre",
        color: "#b86d43",
        secondaryColor: "#e29b65",

        health: 55,
        score: 10,

        rarity: 0.85,
        minDepth: 40,

        size: 32
    },

    iron: {
        id: "iron",
        name: "Hierro",
        color: "#8c98a8",
        secondaryColor: "#c0cad5",

        health: 80,
        score: 10,

        rarity: 0.65,
        minDepth: 100,

        size: 32
    },

    gold: {
        id: "gold",
        name: "Oro",
        color: "#e6ae36",
        secondaryColor: "#ffe28a",

        health: 115,
        score: 20,

        rarity: 0.38,
        minDepth: 200,

        size: 32
    },

    diamond: {
        id: "diamond",
        name: "Diamante",
        color: "#42c9dc",
        secondaryColor: "#a1f4ff",

        health: 155,
        score: 30,

        rarity: 0.20,
        minDepth: 400,

        size: 32
    },

    neon: {
        id: "neon",
        name: "Neón",
        color: "#a45cff",
        secondaryColor: "#e1b5ff",

        health: 210,
        score: 40,

        rarity: 0.08,
        minDepth: 700,

        size: 32
    }

};


// ======================================================
// ROUNDING SYSTEM
// Todas las puntuaciones terminan en 0.
// ======================================================

export function roundScore(value) {

    return Math.round(value / 10) * 10;

}


// ======================================================
// GET MINERAL BY ID
// ======================================================

export function getMineralById(id) {

    return MINERALS[id] || MINERALS.stone;

}


// ======================================================
// GET AVAILABLE MINERALS
// Según la profundidad actual.
// ======================================================

export function getAvailableMinerals(depth = 0) {

    return Object.values(MINERALS).filter(mineral => {

        return depth >= mineral.minDepth;

    });

}


// ======================================================
// GET MINERAL BY DEPTH
// Selección aleatoria ponderada.
// ======================================================

export function getMineralByDepth(depth = 0) {

    const available = getAvailableMinerals(depth);

    const totalWeight = available.reduce((total, mineral) => {

        return total + mineral.rarity;

    }, 0);

    let random = Math.random() * totalWeight;

    for (const mineral of available) {

        random -= mineral.rarity;

        if (random <= 0) {

            return mineral;

        }

    }

    return available[0] || MINERALS.stone;

}


// ======================================================
// CALCULATE MINERAL SCORE
// ======================================================

export function calculateMineralScore(mineral, multiplier = 1) {

    const baseScore = mineral.score * multiplier;

    return roundScore(baseScore);

}


// ======================================================
// GET MINERAL INFORMATION
// ======================================================

export function getMineralInfo(id) {

    const mineral = getMineralById(id);

    return {

        name: mineral.name,

        health: mineral.health,

        score: mineral.score,

        color: mineral.color,

        rarity: mineral.rarity,

        minDepth: mineral.minDepth

    };

}
