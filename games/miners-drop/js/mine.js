
import { getMineralByDepth } from "./minerals.js";

// ======================================================
// MINER'S DROP — PROCEDURAL MINE V2
// ======================================================

export class Mine {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;

        this.blockSize = options.blockSize ?? 34;
        this.rowSpacing = options.rowSpacing ?? this.blockSize;

        // Zona vertical protegida al inicio.
        this.initialClearance = options.initialClearance ?? 170;

        // Margen lateral protegido para el pico.
        this.initialSideClearance = options.initialSideClearance ?? 0;

        this.blocks = [];
        this.generatedRows = 0;
        this.nextId = 1;
        this.cameraY = 0;

        this.generateInitialMine();
    }

    // ==================================================
    // INITIAL GENERATION
    // ==================================================

    generateInitialMine() {
        this.blocks = [];
        this.generatedRows = 0;
        this.nextId = 1;
        this.cameraY = 0;

        // Saltar todas las filas que pertenecen
        // a la zona inicial protegida.
        this.generatedRows = Math.ceil(
            this.initialClearance / this.rowSpacing
        );

        // Generar suficiente mina para comenzar.
        this.generateUntil(this.height * 2);
    }

    // ==================================================
    // GENERATE UNTIL
    // ==================================================

    generateUntil(targetY) {
        const targetRow = Math.ceil(
            targetY / this.rowSpacing
        );

        while (this.generatedRows <= targetRow) {
            this.generateRow();
        }
    }

    // ==================================================
    // RANDOM HELPERS
    // ==================================================

    random() {
        return Math.random();
    }

    randomInt(min, max) {
        return Math.floor(
            this.random() * (max - min + 1)
        ) + min;
    }

    // ==================================================
    // ROW GENERATION
    // ==================================================

    generateRow() {
        const rowIndex = this.generatedRows;
        const rowY = rowIndex * this.rowSpacing;
        const depth = rowY;

        const columns = Math.ceil(
            this.width / this.blockSize
        );

        if (columns <= 0) {
            this.generatedRows++;
            return;
        }

        // Protección absoluta de la zona inicial.
        if (rowY < this.initialClearance) {
            this.generatedRows++;
            return;
        }

        const difficulty = Math.min(
            1,
            depth / 2500
        );

        const density = 0.84 + difficulty * 0.12;

        const gapChance = Math.max(
            0.025,
            0.10 - difficulty * 0.06
        );

        const gapStart =
            this.random() < gapChance
                ? this.randomInt(0, columns - 1)
                : -1;

        const gapLength =
            gapStart >= 0
                ? this.randomInt(1, 2)
                : 0;

        const existingColumns = new Set();

        for (let column = 0; column < columns; column++) {
            const x = column * this.blockSize;

            const inNaturalGap =
                gapStart >= 0 &&
                column >= gapStart &&
                column < gapStart + gapLength;

            if (inNaturalGap) continue;

            // No generar bloques en el margen lateral
            // protegido de la zona inicial.
            const centerX = x + this.blockSize / 2;
            const centerOfMine = this.width / 2;

            const inProtectedSide =
                rowY < this.initialClearance + this.blockSize * 2 &&
                Math.abs(centerX - centerOfMine) <
                    this.initialSideClearance;

            if (inProtectedSide) continue;

            if (this.random() > density) continue;

            const mineral = getMineralByDepth(depth);

            if (!mineral) continue;

            this.createBlock(x, rowY, mineral);
            existingColumns.add(column);
        }

        // Garantizar densidad mínima de la fila.
        const minimumBlocks = Math.max(
            1,
            Math.floor(columns * 0.65)
        );

        if (existingColumns.size < minimumBlocks) {
            const candidates = [];

            for (let column = 0; column < columns; column++) {
                if (!existingColumns.has(column)) {
                    candidates.push(column);
                }
            }

            // Mezclar candidatos para evitar patrones repetidos.
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = this.randomInt(0, i);

                [candidates[i], candidates[j]] =
                    [candidates[j], candidates[i]];
            }

            for (const column of candidates) {
                if (existingColumns.size >= minimumBlocks) break;

                const mineral = getMineralByDepth(depth);

                if (!mineral) continue;

                this.createBlock(
                    column * this.blockSize,
                    rowY,
                    mineral
                );

                existingColumns.add(column);
            }
        }

        this.generatedRows++;
    }

    // ==================================================
    // CREATE BLOCK
    // ==================================================

    createBlock(x, y, mineral) {
        if (!mineral) return null;

        const block = {
            id: this.nextId++,
            x,
            y,

            width: this.blockSize,
            height: this.blockSize,

            rowIndex: Math.round(
                y / this.rowSpacing
            ),

            mineralId: mineral.id,
            name: mineral.name,

            color: mineral.color,
            secondaryColor: mineral.secondaryColor,

            maxHealth: mineral.health,
            health: mineral.health,

            score: mineral.score,

            destroyed: false,
            hitFlash: 0,
            eventChecked: false,

            createdAt: performance.now()
        };

        this.blocks.push(block);

        return block;
    }

    // ==================================================
    // GET NEARBY BLOCKS
    // ==================================================

    getNearbyBlocks(x, y, radius = 100) {
        const minY = y - radius - this.blockSize;
        const maxY = y + radius + this.blockSize;

        return this.blocks.filter(block => {
            if (block.destroyed) return false;

            if (block.y < minY || block.y > maxY) {
                return false;
            }

            const centerX = block.x + block.width / 2;
            const centerY = block.y + block.height / 2;

            const dx = centerX - x;
            const dy = centerY - y;

            return dx * dx + dy * dy <= radius * radius;
        });
    }

    // ==================================================
    // GET BLOCK AT POSITION
    // ==================================================

    getBlockAt(x, y) {
        return this.blocks.find(block => {
            if (block.destroyed) return false;

            return (
                x >= block.x &&
                x <= block.x + block.width &&
                y >= block.y &&
                y <= block.y + block.height
            );
        }) || null;
    }

    // ==================================================
    // DAMAGE BLOCK
    // ==================================================

    damageBlock(block, damage) {
        if (!block || block.destroyed) return null;

        const safeDamage = Math.max(
            0,
            Number(damage) || 0
        );

        block.health = Math.max(
            0,
            block.health - safeDamage
        );

        block.hitFlash = 1;

        const destroyed = block.health <= 0;

        if (destroyed) {
            block.destroyed = true;
        }

        return {
            id: block.id,
            destroyed,
            damage: safeDamage,
            remainingHealth: block.health,
            score: block.score,
            mineralId: block.mineralId,
            mineralName: block.name,
            color: block.color,
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height
        };
    }

    // ==================================================
    // DESTROY AREA
    // ==================================================

    destroyArea(x, y, radius) {
        const destroyed = [];

        for (const block of this.blocks) {
            if (block.destroyed) continue;

            const centerX = block.x + block.width / 2;
            const centerY = block.y + block.height / 2;

            const dx = centerX - x;
            const dy = centerY - y;

            if (dx * dx + dy * dy > radius * radius) {
                continue;
            }

            block.health = 0;
            block.destroyed = true;

            destroyed.push({
                id: block.id,
                destroyed: true,
                damage: block.maxHealth,
                remainingHealth: 0,
                score: block.score,
                mineralId: block.mineralId,
                mineralName: block.name,
                color: block.color,
                x: block.x,
                y: block.y,
                width: block.width,
                height: block.height
            });
        }

        return destroyed;
    }

    // ==================================================
    // UPDATE
    // ==================================================

    update(cameraY, viewportHeight) {
        this.cameraY = cameraY;

        this.generateUntil(
            cameraY + viewportHeight * 2
        );

        for (const block of this.blocks) {
            if (block.hitFlash > 0) {
                block.hitFlash = Math.max(
                    0,
                    block.hitFlash - 0.12
                );
            }
        }

        const minimumY = cameraY - viewportHeight * 2;

        this.blocks = this.blocks.filter(block => {
            if (block.destroyed) return false;
            return block.y > minimumY;
        });
    }

    // ==================================================
    // RESIZE
    // ==================================================

    resize(width, height) {
        this.width = width;
        this.height = height;

        this.generateUntil(
            this.cameraY + height * 2
        );
    }

    // ==================================================
    // RESET
    // ==================================================

    reset() {
        this.generateInitialMine();
    }

    // ==================================================
    // STATISTICS
    // ==================================================

    getStatistics() {
        const activeBlocks = this.blocks.filter(
            block => !block.destroyed
        );

        return {
            totalBlocks: this.blocks.length,
            activeBlocks: activeBlocks.length,
            generatedRows: this.generatedRows,
            depthGenerated:
                this.generatedRows * this.rowSpacing,
            initialClearance: this.initialClearance
        };
    }
}
