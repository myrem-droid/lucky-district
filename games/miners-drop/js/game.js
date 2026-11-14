import { Mine } from "./mine.js";
import { PhysicsEngine } from "./physics.js";
import { Effects } from "./effects.js";
import { FragmentSystem } from "./fragments.js";
import { EventManager } from "./events.js";
import { TokenManager } from "./tokens.js";
import { GameUI } from "./ui.js";
import { getRandomPickaxe } from "./pickaxes.js";


// ======================================================
// MINER'S DROP — GAME ENGINE
// ======================================================

const CONFIG = {

    blockSize: 34,

    initialClearance: 170,
    pickaxeSpawnY: 35,
    pickaxeRadius: 19,

    gravity: 0.34,

    maximumVelocityX: 8,
    maximumVelocityY: 13,

    // Rebotes mejorados
    wallRestitution: 0.72,
    blockRestitution: 0.86,

    // Daño de vida: 1 al chocar + 15 extra al destruir el bloque
    durabilityPerHit: 1,
    durabilityPerBlockDestroyed: 15,

    // Evita golpes repetidos demasiado rápidos.
    hitCooldown: 110,

    cameraFollow: 0.075,
    cameraOffset: 210,

    dynamiteRadius: 105,

    giantDuration: 8000,
    giantMultiplier: 2,

    allowedTargets: [100, 200, 500, 1000],

    mineralPoints: {
        stone: 10,
        copper: 20,
        iron: 20,
        gold: 30,
        diamond: 50,
        neon: 80
    },

    // Multiplicador de minería para equilibrar la dificultad.
    miningMultiplier: 0.42,

    visualRotationMultiplier: 1
};


// ======================================================
// HELPERS
// ======================================================

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function roundToTen(value) {
    return Math.max(0, Math.round(value / 10) * 10);
}

function getTime() {
    return performance.now();
}


// ======================================================
// GAME CLASS
// ======================================================

export class MinersDrop {

    constructor() {

        this.canvas = document.getElementById("mineCanvas");

        if (!this.canvas) {
            throw new Error("No se encontró #mineCanvas");
        }

        this.ctx = this.canvas.getContext("2d");

        if (!this.ctx) {
            throw new Error("No se pudo crear el contexto Canvas 2D");
        }

        this.elements = {
            startOverlay: document.getElementById("startOverlay"),
            resultOverlay: document.getElementById("resultOverlay"),
            startButton: document.getElementById("startButton"),
            restartButton: document.getElementById("restartButton"),
            targetSelect: document.getElementById("targetScoreSelect")
        };

        this.physics = new PhysicsEngine({
            gravity: CONFIG.gravity,
            maxVelocityX: CONFIG.maximumVelocityX,
            maxVelocityY: CONFIG.maximumVelocityY,
            wallBounce: CONFIG.wallRestitution,
            blockBounce: CONFIG.blockRestitution
        });

        this.effects = new Effects();
        this.fragments = new FragmentSystem();
        this.events = new EventManager();

        this.tokens = new TokenManager();
        this.ui = new GameUI();

        this.width = 0;
        this.height = 0;

        this.running = false;
        this.animationId = null;
        this.expeditionId = 0;

        this.score = 0;
        this.depth = 0;
        this.mineralsDestroyed = 0;

        this.targetScore = 200;

        this.mine = null;

        this.pickaxe = null;
        this.pickaxeData = null;

        this.durability = 0;
        this.maxDurability = 0;

        this.lastHitByBlock = new Map();

        this.cameraY = 0;

        this.activePowers = {
            damage: false,
            giant: false
        };

        this.giantUntil = 0;

        this.lastFrameTime = 0;

        this.resize();
        this.bindControls();
        this.showStartScreen();
    }


    // ==================================================
    // CONTROLES
    // ==================================================

    bindControls() {

        this.elements.startButton?.addEventListener(
            "click",
            () => this.start()
        );

        this.elements.restartButton?.addEventListener(
            "click",
            () => this.start()
        );

        window.addEventListener(
            "resize",
            () => this.resize()
        );
    }


    // ==================================================
    // REDIMENSIONAR
    // ==================================================

    resize() {

        const rect = this.canvas.getBoundingClientRect();

        this.width = Math.max(1, rect.width);
        this.height = Math.max(1, rect.height);

        const ratio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);

        this.ctx.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );

        if (this.mine) {
            this.mine.resize(this.width, this.height);
        }

        this.draw();
    }


    // ==================================================
    // PANTALLA INICIAL
    // ==================================================

    showStartScreen() {

        this.running = false;

        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.elements.resultOverlay?.classList.add("hidden");
        this.elements.resultOverlay?.setAttribute("hidden", "");

        this.elements.startOverlay?.classList.remove("hidden");
        this.elements.startOverlay?.removeAttribute("hidden");

        this.score = 0;
        this.depth = 0;
        this.mineralsDestroyed = 0;

        this.pickaxe = null;
        this.pickaxeData = null;

        this.durability = 0;
        this.maxDurability = 0;

        this.cameraY = 0;

        this.ui.resetHUD(
            this.tokens.getBalance(),
            null
        );

        this.ui.updateBalance(this.tokens.getBalance());

        this.drawBackground();
    }


    // ==================================================
    // OBJETIVO
    // ==================================================

    getSelectedTarget() {

        const selected = Number(
            this.elements.targetSelect?.value || 200
        );

        return CONFIG.allowedTargets.includes(selected)
            ? selected
            : 200;
    }


    getDifficultyMultiplier() {
        return this.targetScore / 100;
    }


    getMineralBasePoints(mineralId) {

        return CONFIG.mineralPoints[mineralId] || 10;
    }


    calculateBlockPoints(mineralId) {

        const base = this.getMineralBasePoints(mineralId);

        return roundToTen(
            base * this.getDifficultyMultiplier()
        );
    }


    // ==================================================
    // CREAR MINA
    // ==================================================

    createMine() {

        this.mine = new Mine(
            this.width,
            this.height,
            {
                blockSize: CONFIG.blockSize,
                initialClearance: CONFIG.initialClearance,
                rowSpacing: CONFIG.blockSize,
                initialSideClearance: 0
            }
        );
    }


    // ==================================================
    // CREAR PICO (CON HITBOX POLIGONAL)
    // ==================================================

    createPickaxe() {

        this.pickaxeData = getRandomPickaxe();

        this.maxDurability = this.pickaxeData.durability;
        this.durability = this.maxDurability;

        const size = this.pickaxeData.size || 1;

        const pickaxeHitbox = [
            { x: -22 * size, y: -6 * size },
            { x: -14 * size, y: -14 * size },
            { x: 14 * size, y: -14 * size },
            { x: 22 * size, y: -6 * size },
            { x: 14 * size, y: 3 * size },
            { x: 0 * size, y: 28 * size },
            { x: -14 * size, y: 3 * size }
        ];

        this.pickaxe = this.physics.createBody(
            this.width / 2,
            CONFIG.pickaxeSpawnY,
            {
                radius: CONFIG.pickaxeRadius * size,
                mass: this.pickaxeData.weight || 1,
                restitution: this.pickaxeData.bounce || 0.8,
                rotation: Math.random() * 0.4 - 0.2,
                angularVelocity:
                    (Math.random() < 0.5 ? -1 : 1) *
                    (0.03 + Math.random() * 0.05),
                hitbox: pickaxeHitbox
            }
        );

        this.lastHitByBlock.clear();
    }


    // ==================================================
    // INICIAR EXPEDICIÓN
    // ==================================================

    start() {

        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.expeditionId++;

        this.targetScore = this.getSelectedTarget();

        this.score = 0;
        this.depth = 0;
        this.mineralsDestroyed = 0;

        this.cameraY = 0;

        this.activePowers = {
            damage: false,
            giant: false
        };

        this.giantUntil = 0;

        this.lastHitByBlock.clear();

        this.createMine();
        this.createPickaxe();

        this.ui.resetHUD(
            this.tokens.getBalance(),
            this.pickaxeData
        );

        this.updateHUD();

        this.elements.resultOverlay?.classList.add("hidden");
        this.elements.resultOverlay?.setAttribute("hidden", "");

        this.elements.startOverlay?.classList.add("hidden");
        this.elements.startOverlay?.removeAttribute("hidden");

        this.running = true;
        this.lastFrameTime = getTime();

        this.animationId = requestAnimationFrame(
            (time) => this.loop(time)
        );
    }


    // ==================================================
    // BUCLE PRINCIPAL
    // ==================================================

    loop(timestamp) {

        if (!this.running) return;

        const delta = Math.min(
            (timestamp - this.lastFrameTime) / 16.67,
            2
        );

        this.lastFrameTime = timestamp;

        this.update(delta);
        this.draw();

        if (this.running) {

            this.animationId = requestAnimationFrame(
                (time) => this.loop(time)
            );
        }
    }


    // ==================================================
    // ACTUALIZACIÓN (CON SUBPASOS DE FÍSICA)
    // ==================================================

    update(delta = 1) {

        if (!this.pickaxe || !this.mine) return;

        const maxStepDistance = Math.max(
            6,
            (this.pickaxe.radius || 18) * 0.35
        );

        const travel = Math.hypot(
            this.pickaxe.vx * delta,
            this.pickaxe.vy * delta
        );

        const steps = Math.min(
            8,
            Math.max(1, Math.ceil(travel / maxStepDistance))
        );

        const subDelta = delta / steps;

        for (let i = 0; i < steps; i++) {
            this.physics.update(this.pickaxe, subDelta);
            this.checkWallCollisions();
            this.checkBlockCollisions();
        }

        this.updateCamera();

        this.mine.update(
            this.cameraY,
            this.height
        );

        this.fragments.update?.(delta);
        this.effects.update?.(delta);

        this.updateEvents(delta);

        this.updateDepth();
        this.updateGiantPower();

        this.updateHUD();
        this.checkExpeditionEnd();
    }


    // ==================================================
    // EVENTOS
    // ==================================================

    updateEvents(delta) {

        if (!this.events) return;

        this.events.update?.(
            this,
            delta
        );
    }


    // ==================================================
    // COLISIONES CON PAREDES
    // ==================================================

    checkWallCollisions() {

        if (!this.pickaxe) return;

        this.physics.collideWithWalls(
            this.pickaxe,
            this.width
        );
    }


    // ==================================================
    // COLISIONES CON BLOQUES
    // ==================================================

    checkBlockCollisions() {

        if (!this.pickaxe || !this.mine) return;

        const nearby = this.mine.getNearbyBlocks(
            this.pickaxe.x,
            this.pickaxe.y,
            160
        );

        if (!nearby || nearby.length === 0) return;

        const sortedBlocks = [...nearby].sort((a, b) => {

            const da = Math.hypot(
                a.x + a.width / 2 - this.pickaxe.x,
                a.y + a.height / 2 - this.pickaxe.y
            );

            const db = Math.hypot(
                b.x + b.width / 2 - this.pickaxe.x,
                b.y + b.height / 2 - this.pickaxe.y
            );

            return da - db;
        });

        for (const block of sortedBlocks) {

            if (!block || block.destroyed) continue;

            const collision = this.physics.collideWithBlock(
                this.pickaxe,
                block
            );

            if (!collision?.collided) continue;

            // Restar 1 de durabilidad al chocar
            this.onBlockHit(block);

            this.hitBlock(
                block,
                collision.impactSpeed || 1
            );

            break;
        }
    }


    // ==================================================
    // IMPACTO CON BLOQUE (PIERDE 1 DE VIDA)
    // ==================================================

    onBlockHit(block) {

        if (!block || block.destroyed) return;

        const now = getTime();
        const lastHit = this.lastHitByBlock.get(block.id);

        if (lastHit !== undefined && now - lastHit < CONFIG.hitCooldown) {
            return;
        }

        this.lastHitByBlock.set(block.id, now);

        this.durability = Math.max(
            0,
            this.durability - CONFIG.durabilityPerHit
        );
    }


    // ==================================================
    // GOLPEAR BLOQUE (DAÑO AL BLOQUE)
    // ==================================================

    hitBlock(block, impactSpeed) {

        if (!block || block.destroyed) return;

        const baseDamage = this.pickaxeData.damage || 18;

        const impactMultiplier = clamp(
            impactSpeed / 6,
            0.45,
            1.35
        );

        const powerMultiplier = this.activePowers.damage
            ? 1.5
            : 1;

        const sizeMultiplier = this.getPickaxeSize();

        const damage =
            baseDamage *
            impactMultiplier *
            CONFIG.miningMultiplier *
            powerMultiplier *
            sizeMultiplier;

        const result = this.mine.damageBlock(
            block,
            damage
        );

        if (!result || !result.destroyed) return;

        this.onBlockDestroyed(result);
    }


    // ==================================================
    // BLOQUE DESTRUIDO (PIERDE 15 EXTRA DE VIDA)
    // ==================================================

    onBlockDestroyed(blockData) {

        if (!blockData) return;

        // Descuenta 15 de vida al romper el bloque por completo
        this.durability = Math.max(
            0,
            this.durability - CONFIG.durabilityPerBlockDestroyed
        );

        this.mineralsDestroyed++;

        const mineralId =
            blockData.mineralId || "stone";

        const points = this.calculateBlockPoints(mineralId);

        this.score = roundToTen(
            this.score + points
        );

        this.fragments.create?.(
            blockData.x,
            blockData.y,
            blockData.color
        );

        this.effects.add?.(
            blockData.x,
            blockData.y,
            blockData.color
        );
    }


    // ==================================================
    // TAMAÑO DEL PICO
    // ==================================================

    getPickaxeSize() {

        return this.activePowers.giant
            ? CONFIG.giantMultiplier
            : 1;
    }


    // ==================================================
    // PODERES
    // ==================================================

    activatePower(type) {

        if (!this.running) return;

        if (type === "damage") {

            this.activePowers.damage = true;
            return;
        }

        if (type === "giant") {

            this.activePowers.giant = true;

            this.giantUntil =
                getTime() + CONFIG.giantDuration;

            return;
        }

        if (type === "dynamite") {

            this.activateDynamite();
        }
    }


    activateDynamite() {

        if (!this.mine || !this.pickaxe) return;

        const destroyed = this.mine.destroyArea(
            this.pickaxe.x,
            this.pickaxe.y,
            CONFIG.dynamiteRadius
        );

        if (!Array.isArray(destroyed)) return;

        for (const block of destroyed) {

            this.onBlockDestroyed(block);
        }
    }


    updateGiantPower() {

        if (!this.activePowers.giant) return;

        if (getTime() >= this.giantUntil) {

            this.activePowers.giant = false;
        }
    }


    // ==================================================
    // CÁMARA
    // ==================================================

    updateCamera() {

        if (!this.pickaxe) return;

        const targetCameraY =
            this.pickaxe.y - CONFIG.cameraOffset;

        this.cameraY +=
            (targetCameraY - this.cameraY) *
            CONFIG.cameraFollow;

        this.cameraY = Math.max(
            0,
            this.cameraY
        );
    }


    // ==================================================
    // PROFUNDIDAD
    // ==================================================

    updateDepth() {

        if (!this.pickaxe) return;

        this.depth = Math.max(
            0,
            Math.floor(
                this.pickaxe.y / CONFIG.blockSize
            )
        );
    }


    getSectorName() {

        if (this.depth < 30) return "SUPERFICIE";
        if (this.depth < 80) return "SUBSUELO";
        if (this.depth < 150) return "CUEVA";
        if (this.depth < 250) return "ABISMO";

        return "ZONA PROFUNDA";
    }


    // ==================================================
    // HUD
    // ==================================================

    updateHUD() {

        if (!this.ui) return;

        this.ui.updateHUD({

            score: this.score,
            depth: this.depth,

            durability: this.durability,
            maxDurability: this.maxDurability,

            minerals: this.mineralsDestroyed,

            pickaxe: this.pickaxeData,

            targetScore: this.targetScore,

            balance: this.tokens.getBalance(),

            powers: this.activePowers
        });

        const sector = document.getElementById("sectorDisplay");

        if (sector) {
            sector.textContent = this.getSectorName();
        }
    }


    updateBalance() {

        this.ui.updateBalance(
            this.tokens.getBalance()
        );
    }


    // ==================================================
    // FINAL DE EXPEDICIÓN
    // ==================================================

    checkExpeditionEnd() {

        if (!this.running) return;

        if (this.durability <= 0) {

            this.durability = 0;

            this.finish();
        }
    }


    finish() {

        if (!this.running) return;

        this.running = false;

        if (this.animationId !== null) {

            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        const victory = this.score >= this.targetScore;

        let reward = 0;

        if (victory) {

            const claimed = this.tokens.claimReward(
                this.expeditionId,
                this.score,
                this.depth,
                this.targetScore
            );

            reward = claimed?.amount || 0;
        }

        this.updateBalance();

        this.showResult(
            victory,
            reward
        );
    }


    // ==================================================
    // RESULTADO
    // ==================================================

    showResult(victory, reward) {

        this.ui.showResult({

            victory,

            score: this.score,

            target: this.targetScore,

            depth: this.depth,

            minerals: this.mineralsDestroyed,

            reward
        });

        this.elements.startOverlay?.classList.add("hidden");
        this.elements.startOverlay?.setAttribute("hidden", "");

        this.elements.resultOverlay?.classList.remove("hidden");
        this.elements.resultOverlay?.removeAttribute("hidden");
    }


    // ==================================================
    // DIBUJO GENERAL
    // ==================================================

    draw() {

        const ctx = this.ctx;

        ctx.clearRect(
            0,
            0,
            this.width,
            this.height
        );

        this.drawBackground();
        this.drawMine();

        this.fragments.draw?.(
            ctx,
            this.cameraY
        );

        this.effects.draw?.(
            ctx,
            this.cameraY
        );

        this.drawPickaxe();
    }


    drawBackground() {

        const ctx = this.ctx;

        const gradient = ctx.createLinearGradient(
            0,
            0,
            0,
            this.height
        );

        gradient.addColorStop(0, "#101923");
        gradient.addColorStop(1, "#070b11");

        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            this.width,
            this.height
        );
    }


    // ==================================================
    // DIBUJAR MINA
    // ==================================================

    drawMine() {

        if (!this.mine || !Array.isArray(this.mine.blocks)) return;

        const ctx = this.ctx;

        for (const block of this.mine.blocks) {

            if (!block || block.destroyed) continue;

            const screenY = block.y - this.cameraY;

            if (
                screenY < -CONFIG.blockSize ||
                screenY > this.height + CONFIG.blockSize
            ) {
                continue;
            }

            this.drawBlock(
                block,
                screenY
            );
        }
    }


    // ==================================================
    // DIBUJAR BLOQUE
    // ==================================================

    drawBlock(block, screenY) {

        const ctx = this.ctx;

        const size = block.width || CONFIG.blockSize;
        const height = block.height || CONFIG.blockSize;

        const baseColor = block.color || "#555b63";

        ctx.save();

        // Base.
        const gradient = ctx.createLinearGradient(
            block.x,
            screenY,
            block.x + size,
            screenY + height
        );

        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, "#171d25");

        ctx.fillStyle = gradient;

        ctx.fillRect(
            block.x,
            screenY,
            size,
            height
        );

        // Borde.
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 2;

        ctx.strokeRect(
            block.x,
            screenY,
            size,
            height
        );

        // Facetas de roca.
        ctx.fillStyle = "rgba(255,255,255,0.09)";

        ctx.beginPath();
        ctx.moveTo(block.x + 3, screenY + 3);
        ctx.lineTo(block.x + size - 4, screenY + 3);
        ctx.lineTo(block.x + size * 0.72, screenY + height * 0.32);
        ctx.lineTo(block.x + size * 0.2, screenY + height * 0.42);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.16)";

        ctx.beginPath();
        ctx.moveTo(block.x + size * 0.2, screenY + height * 0.42);
        ctx.lineTo(block.x + size * 0.72, screenY + height * 0.32);
        ctx.lineTo(block.x + size - 3, screenY + height - 3);
        ctx.lineTo(block.x + 3, screenY + height - 3);
        ctx.closePath();
        ctx.fill();

        // Detalles minerales.
        if (block.secondaryColor) {

            ctx.globalAlpha = 0.8;

            ctx.fillStyle = block.secondaryColor;

            ctx.beginPath();
            ctx.moveTo(block.x + size * 0.25, screenY + height * 0.3);
            ctx.lineTo(block.x + size * 0.45, screenY + height * 0.18);
            ctx.lineTo(block.x + size * 0.55, screenY + height * 0.48);
            ctx.lineTo(block.x + size * 0.37, screenY + height * 0.62);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 1;
        }

        // Daño.
        if (block.health < block.maxHealth) {

            const ratio = clamp(
                block.health / block.maxHealth,
                0,
                1
            );

            ctx.fillStyle = "rgba(0,0,0,0.7)";

            ctx.fillRect(
                block.x + 3,
                screenY + height - 5,
                size - 6,
                3
            );

            ctx.fillStyle = "#f0c46e";

            ctx.fillRect(
                block.x + 3,
                screenY + height - 5,
                (size - 6) * ratio,
                3
            );
        }

        ctx.restore();
    }


    // ==================================================
    // DIBUJAR PICO
    // ==================================================

    drawPickaxe() {

        if (!this.pickaxe || !this.pickaxeData) return;

        const ctx = this.ctx;

        const x = this.pickaxe.x;
        const y = this.pickaxe.y - this.cameraY;

        const rotation =
            this.pickaxe.rotation ??
            this.pickaxe.angle ??
            0;

        const size = this.getPickaxeSize();

        const data = this.pickaxeData;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(
            rotation * CONFIG.visualRotationMultiplier
        );

        ctx.scale(size, size);

        if (data.glow) {

            ctx.shadowColor = data.color || "#ffffff";
            ctx.shadowBlur = 18;
        }

        // Mango.
        ctx.fillStyle = "#79502e";

        ctx.fillRect(
            -4,
            -2,
            8,
            36
        );

        ctx.fillStyle = "#b17b48";

        ctx.fillRect(
            -2,
            0,
            3,
            31
        );

        // Cabeza.
        ctx.fillStyle = data.color || "#b8c1ca";

        ctx.beginPath();

        if (data.id === "neon") {

            ctx.moveTo(-25, -8);
            ctx.lineTo(-12, -16);
            ctx.lineTo(0, -10);
            ctx.lineTo(12, -16);
            ctx.lineTo(25, -8);
            ctx.lineTo(18, 4);
            ctx.lineTo(-18, 4);

        } else if (data.id === "diamond") {

            ctx.moveTo(-25, -7);
            ctx.lineTo(-13, -15);
            ctx.lineTo(13, -15);
            ctx.lineTo(25, -7);
            ctx.lineTo(17, 3);
            ctx.lineTo(-17, 3);

        } else {

            ctx.moveTo(-25, -6);
            ctx.lineTo(-18, -13);
            ctx.lineTo(18, -13);
            ctx.lineTo(25, -6);
            ctx.lineTo(18, 4);
            ctx.lineTo(-18, 4);
        }

        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;

        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.4)";

        ctx.fillRect(
            -14,
            -10,
            28,
            3
        );

        ctx.restore();
    }

}


// ======================================================
// INICIALIZACIÓN
// ======================================================

let minersDropInstance = null;

export function initializeMinersDrop() {

    if (minersDropInstance) {
        return minersDropInstance;
    }

    minersDropInstance = new MinersDrop();

    return minersDropInstance;
}

initializeMinersDrop();