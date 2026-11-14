
import {
    getPickaxeByLevel,
    getPickaxeById,
    PICKAXE_ORDER
} from "./pickaxes.js";


// ======================================================
// MINER'S DROP — SPECIAL EVENTS
// ======================================================

export const POWER_TYPES = {

    upgrade: {

        id: "upgrade",

        name: "MEJORA",

        description: "Mejora tu pico y recupera su durabilidad.",

        color: "#55d9ff",

        icon: "⬆",

        weight: 40

    },

    dynamite: {

        id: "dynamite",

        name: "DINAMITA",

        description: "Destruye los minerales cercanos.",

        color: "#ff914d",

        icon: "✹",

        weight: 35

    },

    giant: {

        id: "giant",

        name: "PICO GIGANTE",

        description: "Duplica temporalmente el tamaño del pico.",

        color: "#d38aff",

        icon: "✦",

        weight: 25

    }

};


// ======================================================
// EVENT MANAGER
// ======================================================

export class EventManager {

    constructor(options = {}) {

        this.events = [];

        this.activePowers = {};

        this.nextId = 1;

        this.lastSpawnDepth = -Infinity;

        this.minimumSpawnDistance =
            options.minimumSpawnDistance ?? 240;

        this.spawnChance =
            options.spawnChance ?? 0.12;

        this.maximumActiveBoxes =
            options.maximumActiveBoxes ?? 1;

        this.boxSize =
            options.boxSize ?? 31;

        this.enabled = true;

        this.spawnAttempts = 0;

        this.collectedEvents = 0;

        this.lastUpdateTime = 0;

    }


    // ==================================================
    // RANDOM POWER
    // ==================================================

    getRandomPower() {

        const entries =
            Object.values(POWER_TYPES);

        const totalWeight =
            entries.reduce(
                (sum, item) => sum + item.weight,
                0
            );

        let random =
            Math.random() * totalWeight;

        for (const item of entries) {

            random -= item.weight;

            if (random <= 0) {

                return item;

            }

        }

        return entries[0];

    }


    // ==================================================
    // SPAWN EVENT
    // ==================================================

    trySpawn(depth, width, rowY) {

        if (!this.enabled) return null;

        const activeBoxes =
            this.events.filter(
                event => !event.collected
            );

        if (
            activeBoxes.length >=
            this.maximumActiveBoxes
        ) {

            return null;

        }

        if (
            depth - this.lastSpawnDepth <
            this.minimumSpawnDistance
        ) {

            return null;

        }

        this.spawnAttempts++;

        const difficulty = Math.min(
            1,
            Math.max(0, depth / 2000)
        );

        const chance =
            this.spawnChance *
            (0.8 + difficulty * 0.4);

        if (Math.random() > chance) {

            return null;

        }

        const power =
            this.getRandomPower();

        const margin =
            this.boxSize + 8;

        const availableWidth =
            Math.max(
                1,
                width - margin * 2
            );

        const x =
            margin +
            Math.random() * availableWidth;

        const event = {

            id: this.nextId++,

            type: power.id,

            name: power.name,

            description: power.description,

            color: power.color,

            icon: power.icon,

            x,

            y: rowY,

            size: this.boxSize,

            collected: false,

            age: 0,

            rotation: Math.random() * Math.PI * 2,

            pulse: Math.random() * Math.PI * 2

        };

        this.events.push(event);

        this.lastSpawnDepth = depth;

        return event;

    }


    // ==================================================
    // UPDATE
    // ==================================================

    update(delta = 1) {

        const safeDelta = Math.min(
            3,
            Math.max(0, delta)
        );

        for (const event of this.events) {

            if (event.collected) continue;

            event.age += safeDelta;

            event.rotation +=
                0.012 * safeDelta;

            event.pulse +=
                0.06 * safeDelta;

        }

        // Remove collected and excessively old boxes.
        this.events = this.events.filter(event => {

            return (
                !event.collected &&
                event.age < 3000
            );

        });

        // Expire temporary powers.
        const currentTime =
            performance.now();

        for (
            const [power, data]
            of Object.entries(this.activePowers)
        ) {

            if (
                data.expiresAt &&
                currentTime >= data.expiresAt
            ) {

                delete this.activePowers[power];

            }

        }

    }


    // ==================================================
    // NEARBY BOXES
    // ==================================================

    getNearbyBoxes(x, y, radius = 100) {

        return this.events.filter(event => {

            if (event.collected) return false;

            const centerX =
                event.x + event.size / 2;

            const centerY =
                event.y + event.size / 2;

            const dx =
                centerX - x;

            const dy =
                centerY - y;

            return (
                dx * dx + dy * dy <=
                radius * radius
            );

        });

    }


    // ==================================================
    // GET BOX AT POSITION
    // ==================================================

    getBoxAt(x, y) {

        return this.events.find(event => {

            if (event.collected) return false;

            return (

                x >= event.x &&
                x <= event.x + event.size &&

                y >= event.y &&
                y <= event.y + event.size

            );

        }) || null;

    }


    // ==================================================
    // COLLECT BOX
    // ==================================================

    destroyBox(id) {

        const event =
            this.events.find(
                item => item.id === id
            );

        if (!event || event.collected) {

            return null;

        }

        event.collected = true;

        this.collectedEvents++;

        return event;

    }


    // ==================================================
    // ACTIVATE POWER
    // ==================================================

    activatePower(type, gameState, currentTime = performance.now()) {

        if (!gameState) return null;

        // ----------------------------------------------
        // PICKAXE UPGRADE
        // ----------------------------------------------

        if (type === "upgrade") {

            const currentLevel =
                gameState.pickaxe?.level ?? 1;

            const nextLevel =
                Math.min(
                    PICKAXE_ORDER.length,
                    currentLevel + 1
                );

            const nextPickaxe =
                getPickaxeByLevel(nextLevel);

            if (!nextPickaxe) return null;

            gameState.pickaxe =
                nextPickaxe;

            gameState.maxDurability =
                nextPickaxe.durability;

            gameState.durability =
                nextPickaxe.durability;

            return {

                type,

                label: `${nextPickaxe.name} OBTENIDO`,

                pickaxe: nextPickaxe,

                maxDurability:
                    nextPickaxe.durability

            };

        }


        // ----------------------------------------------
        // DYNAMITE
        // ----------------------------------------------

        if (type === "dynamite") {

            return {

                type,

                label: "¡DINAMITA!",

                x: gameState.pickaxeBody?.x ?? 0,

                y: gameState.pickaxeBody?.y ?? 0,

                radius: 105,

                damage: 999999

            };

        }


        // ----------------------------------------------
        // GIANT PICKAXE
        // ----------------------------------------------

        if (type === "giant") {

            const duration = 8000;

            this.activePowers.giant = {

                startedAt: currentTime,

                expiresAt:
                    currentTime + duration

            };

            return {

                type,

                label: "¡PICO GIGANTE!",

                duration

            };

        }

        return null;

    }


    // ==================================================
    // SIZE MULTIPLIER
    // ==================================================

    getSizeMultiplier() {

        const giant =
            this.activePowers.giant;

        if (!giant) return 1;

        if (
            performance.now() >=
            giant.expiresAt
        ) {

            delete this.activePowers.giant;

            return 1;

        }

        return 2;

    }


    // ==================================================
    // DRAW
    // ==================================================

    draw(ctx, cameraY = 0) {

        if (!ctx) return;

        for (const event of this.events) {

            if (event.collected) continue;

            const screenY =
                event.y - cameraY;

            ctx.save();

            const centerX =
                event.x + event.size / 2;

            const centerY =
                screenY + event.size / 2;

            const pulse =
                1 + Math.sin(event.pulse) * 0.07;

            ctx.translate(
                centerX,
                centerY
            );

            ctx.rotate(
                event.rotation
            );

            ctx.scale(
                pulse,
                pulse
            );

            // Glow.
            ctx.shadowColor =
                event.color;

            ctx.shadowBlur = 18;

            // Box.
            ctx.fillStyle =
                "#171b28";

            ctx.fillRect(
                -event.size / 2,
                -event.size / 2,
                event.size,
                event.size
            );

            ctx.strokeStyle =
                event.color;

            ctx.lineWidth = 3;

            ctx.strokeRect(
                -event.size / 2,
                -event.size / 2,
                event.size,
                event.size
            );

            // Icon.
            ctx.shadowBlur = 0;

            ctx.fillStyle =
                event.color;

            ctx.font =
                "bold 19px Arial";

            ctx.textAlign =
                "center";

            ctx.textBaseline =
                "middle";

            ctx.fillText(
                event.icon,
                0,
                1
            );

            ctx.restore();

        }

    }


    // ==================================================
    // RESET
    // ==================================================

    reset() {

        this.events = [];

        this.activePowers = {};

        this.nextId = 1;

        this.lastSpawnDepth = -Infinity;

        this.spawnAttempts = 0;

        this.collectedEvents = 0;

        this.lastUpdateTime = 0;

        this.enabled = true;

    }


    // ==================================================
    // CLEAR
    // ==================================================

    clear() {

        this.events = [];

        this.activePowers = {};

    }


    // ==================================================
    // STATISTICS
    // ==================================================

    getInfo() {

        return {

            activeBoxes:
                this.events.filter(
                    event => !event.collected
                ).length,

            collectedEvents:
                this.collectedEvents,

            spawnAttempts:
                this.spawnAttempts,

            activePowers:
                Object.keys(this.activePowers)

        };

    }

}
