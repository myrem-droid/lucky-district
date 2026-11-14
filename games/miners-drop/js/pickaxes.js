
// ======================================================
// MINER'S DROP 3.0
// PICKAXE SYSTEM
// ======================================================

export const PICKAXES = {
    stone: {
        id: "stone",
        name: "PIEDRA",
        description: "Un pico básico para comenzar.",
        level: 1,
        rarity: 45,
        damage: 18,
        durability: 100,
        weight: 1.2,
        bounce: 0.22,
        rotation: 0.08,
        size: 1,
        color: "#999999",
        glow: null
    },

    iron: {
        id: "iron",
        name: "HIERRO",
        description: "Un pico resistente y equilibrado.",
        level: 2,
        rarity: 28,
        damage: 27,
        durability: 130,
        weight: 1.1,
        bounce: 0.25,
        rotation: 0.10,
        size: 1,
        color: "#b5c2d0",
        glow: null
    },

    gold: {
        id: "gold",
        name: "ORO",
        description: "Un pico ligero con gran potencia.",
        level: 3,
        rarity: 16,
        damage: 35,
        durability: 150,
        weight: 0.9,
        bounce: 0.31,
        rotation: 0.13,
        size: 1,
        color: "#ffd04d",
        glow: "#ffb52e"
    },

    diamond: {
        id: "diamond",
        name: "DIAMANTE",
        description: "Un pico extremadamente poderoso.",
        level: 4,
        rarity: 8,
        damage: 48,
        durability: 190,
        weight: 0.85,
        bounce: 0.36,
        rotation: 0.16,
        size: 1,
        color: "#53eaff",
        glow: "#20cfff"
    },

    neon: {
        id: "neon",
        name: "NEÓN",
        description: "El pico más raro y avanzado.",
        level: 5,
        rarity: 3,
        damage: 65,
        durability: 240,
        weight: 0.75,
        bounce: 0.42,
        rotation: 0.20,
        size: 1,
        color: "#c17aff",
        glow: "#a52aff"
    }
};

// ======================================================
// PICKAXE ORDER
// ======================================================

export const PICKAXE_ORDER = [
    "stone",
    "iron",
    "gold",
    "diamond",
    "neon"
];

// Evita repetir el mismo pico en dos expediciones seguidas.
let previousPickaxeId = null;

// ======================================================
// GET PICKAXE BY ID
// ======================================================

export function getPickaxeById(id) {
    return PICKAXES[id] || PICKAXES.stone;
}

// ======================================================
// GET PICKAXE BY LEVEL
// ======================================================

export function getPickaxeByLevel(level) {
    const safeLevel = Math.max(
        1,
        Math.min(5, Math.floor(Number(level) || 1))
    );

    return PICKAXES[PICKAXE_ORDER[safeLevel - 1]];
}

// ======================================================
// WEIGHTED RANDOM PICKAXE
// ======================================================

export function getRandomPickaxe(maxLevel = 5) {
    const safeMaxLevel = Math.max(
        1,
        Math.min(5, Math.floor(Number(maxLevel) || 5))
    );

    let available = PICKAXE_ORDER
        .map(id => PICKAXES[id])
        .filter(pickaxe => pickaxe.level <= safeMaxLevel);

    // Si hay más de una opción, excluimos el pico anterior.
    const alternatives = available.filter(
        pickaxe => pickaxe.id !== previousPickaxeId
    );

    if (alternatives.length > 0) {
        available = alternatives;
    }

    const totalWeight = available.reduce(
        (total, pickaxe) => total + pickaxe.rarity,
        0
    );

    let random = Math.random() * totalWeight;

    for (const pickaxe of available) {
        random -= pickaxe.rarity;

        if (random < 0) {
            previousPickaxeId = pickaxe.id;
            return { ...pickaxe };
        }
    }

    const selected = available[available.length - 1];
    previousPickaxeId = selected.id;

    return { ...selected };
}

// ======================================================
// RESET RANDOM SELECTION
// ======================================================

export function resetPickaxeSelection() {
    previousPickaxeId = null;
}

// ======================================================
// UPGRADE PICKAXE
// ======================================================

export function upgradePickaxe(currentLevel) {
    const nextLevel = Math.min(
        5,
        Math.max(1, Number(currentLevel) + 1)
    );

    return getPickaxeByLevel(nextLevel);
}

// ======================================================
// DAMAGE CALCULATION
// ======================================================

export function calculatePickaxeDamage(
    pickaxe,
    multiplier = 1
) {
    if (!pickaxe || !Number.isFinite(pickaxe.damage)) {
        return 0;
    }

    return Math.round(pickaxe.damage * multiplier);
}

// ======================================================
// DURABILITY RECOVERY
// ======================================================

export function recoverDurability(
    currentDurability,
    maximumDurability,
    percentage
) {
    const recovery = maximumDurability * percentage;

    return Math.min(
        maximumDurability,
        currentDurability + recovery
    );
}

// ======================================================
// GET PICKAXE DESCRIPTION
// ======================================================

export function getPickaxeInfo(id) {
    const pickaxe = getPickaxeById(id);

    return {
        id: pickaxe.id,
        name: pickaxe.name,
        description: pickaxe.description,
        level: pickaxe.level,
        damage: pickaxe.damage,
        durability: pickaxe.durability,
        rarity: pickaxe.rarity,
        color: pickaxe.color
    };
}
