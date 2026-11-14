
export class GameUI {
    constructor() {
        this.elements = {};
        this.buttonHandlers = new Map();
        this.animationFrames = new Map();
        this.cacheElements();
    }

    cacheElements() {
        const ids = [
            "mineCanvas",
            "startOverlay",
            "resultOverlay",
            "tokenBalance",
            "depthDisplay",
            "durabilityDisplay",
            "durabilityBar",
            "mineralsDisplay",
            "scoreDisplay",
            "pickaxeDisplay",
            "pickaxeDescription",
            "sectorDisplay",
            "startButton",
            "restartButton",
            "resultDepth",
            "resultMinerals",
            "resultScore",
            "resultReward",
            "resultTitle",
            "resultDescription",
            "resultTag",
            "resultTarget",
            "objectiveDisplay",
            "powerDisplay",
            "eventDisplay",
            "progressBar",
            "progressText",
            "expeditionStatus",
            "targetScoreSelect"
        ];

        for (const id of ids) {
            this.elements[id] = document.getElementById(id);
        }
    }

    get(id) {
        return this.elements[id] || document.getElementById(id);
    }

    setText(id, value) {
        const element = this.get(id);
        if (element) element.textContent = String(value);
    }

    setVisible(id, visible) {
        const element = this.get(id);
        if (!element) return;

        element.classList.toggle("hidden", !visible);
        element.hidden = !visible;
    }

    formatNumber(value) {
        const number = Math.max(0, Number(value) || 0);
        const rounded = Math.round(number / 10) * 10;

        return rounded.toLocaleString("es-CL");
    }

    updateBalance(balance) {
        this.setText(
            "tokenBalance",
            `${this.formatNumber(balance)} DT`
        );
    }

    updateScore(score) {
        this.setText(
            "scoreDisplay",
            this.formatNumber(score)
        );
    }

    updateDepth(depth) {
        const value = Math.max(
            0,
            Math.floor(Number(depth) || 0)
        );

        this.setText("depthDisplay", `${value} m`);

        if (value < 100) {
            this.setText("sectorDisplay", "SUPERFICIE");
        } else if (value < 300) {
            this.setText("sectorDisplay", "MINA SUPERIOR");
        } else if (value < 600) {
            this.setText("sectorDisplay", "MINA PROFUNDA");
        } else if (value < 1000) {
            this.setText("sectorDisplay", "ABISMO");
        } else {
            this.setText("sectorDisplay", "ZONA NEÓN");
        }
    }

    updateDurability(current, maximum) {
        const max = Math.max(1, Number(maximum) || 1);

        const value = Math.max(
            0,
            Math.min(max, Number(current) || 0)
        );

        const percentage = value / max * 100;

        this.setText(
            "durabilityDisplay",
            `${Math.ceil(value)} / ${max}`
        );

        const bar = this.get("durabilityBar");

        if (bar) {
            bar.style.width = `${percentage}%`;

            bar.classList.remove(
                "is-low",
                "is-medium",
                "is-high"
            );

            if (percentage <= 25) {
                bar.classList.add("is-low");
            } else if (percentage <= 55) {
                bar.classList.add("is-medium");
            } else {
                bar.classList.add("is-high");
            }
        }
    }

    updateMinerals(count) {
        this.setText(
            "mineralsDisplay",
            this.formatNumber(count)
        );
    }

    updatePickaxe(pickaxe) {
        if (!pickaxe) return;

        this.setText(
            "pickaxeDisplay",
            pickaxe.name || pickaxe.id || "PICO"
        );

        this.setText(
            "pickaxeDescription",
            pickaxe.description || "Herramienta de expedición"
        );
    }

    updateObjective(targetScore, score) {
        const target = Math.max(
            1,
            Number(targetScore) || 200
        );

        const current = Math.max(
            0,
            Number(score) || 0
        );

        const percentage = Math.min(
            100,
            current / target * 100
        );

        this.setText(
            "objectiveDisplay",
            `${this.formatNumber(current)} / ${this.formatNumber(target)}`
        );

        this.setText(
            "progressText",
            `${Math.floor(percentage)}%`
        );

        const bar = this.get("progressBar");

        if (bar) {
            bar.style.width = `${percentage}%`;
        }
    }

    updatePowers(powers = []) {
        const element = this.get("powerDisplay");

        if (!element) return;

        element.textContent = powers.length
            ? powers.map(power =>
                typeof power === "string"
                    ? power
                    : power.name || power.label || power.type || "Mejora"
            ).join(" · ")
            : "Sin mejoras activas";
    }

    updateEvent(message, visible = true) {
        const element = this.get("eventDisplay");

        if (!element) return;

        element.textContent = message || "";

        this.setVisible(
            "eventDisplay",
            visible && Boolean(message)
        );
    }

    updateHUD(data = {}) {
        if (data.score !== undefined) {
            this.updateScore(data.score);
        }

        if (data.depth !== undefined) {
            this.updateDepth(data.depth);
        }

        if (data.durability !== undefined) {
            this.updateDurability(
                data.durability,
                data.maxDurability || 100
            );
        }

        if (data.minerals !== undefined) {
            this.updateMinerals(data.minerals);
        } else if (data.mineralsDestroyed !== undefined) {
            this.updateMinerals(data.mineralsDestroyed);
        }

        if (data.pickaxe) {
            this.updatePickaxe(data.pickaxe);
        }

        if (data.targetScore !== undefined) {
            this.updateObjective(
                data.targetScore,
                data.score || 0
            );
        }

        if (data.balance !== undefined) {
            this.updateBalance(data.balance);
        }

        if (data.powers !== undefined) {
            this.updatePowers(data.powers);
        }
    }

    showStartScreen() {
        this.setVisible("startOverlay", true);
        this.setVisible("resultOverlay", false);

        this.setText(
            "expeditionStatus",
            "PREPARADO PARA EXPLORAR"
        );

        this.setButtonState(
            "startButton",
            true,
            "INICIAR EXPEDICIÓN"
        );
    }

    startExpedition() {
        this.setVisible("startOverlay", false);
        this.setVisible("resultOverlay", false);

        this.updateEvent("", false);

        this.setText(
            "expeditionStatus",
            "EXPEDICIÓN EN CURSO"
        );

        this.setButtonState("startButton", false);
    }

    resetHUD(balance = 500, pickaxe = null) {
        this.updateScore(0);
        this.updateDepth(0);
        this.updateMinerals(0);
        this.updateDurability(100, 100);
        this.updateObjective(200, 0);
        this.updateBalance(balance);
        this.updatePowers([]);
        this.updateEvent("", false);

        if (pickaxe) {
            this.updatePickaxe(pickaxe);
        }

        this.setText(
            "expeditionStatus",
            "PREPARANDO EXPEDICIÓN"
        );
    }

    showResult({
        victory = false,
        won = false,
        score = 0,
        depth = 0,
        reward = 0,
        minerals = 0,
        mineralsDestroyed = 0,
        target = 200,
        targetScore = 200
    } = {}) {
        this.setVisible("startOverlay", false);
        this.setVisible("resultOverlay", true);

        const completed = Boolean(victory || won);

        const finalTarget = target || targetScore;

        const finalMinerals =
            minerals || mineralsDestroyed;

        const percentage = Math.min(
            100,
            Math.floor(score / Math.max(1, finalTarget) * 100)
        );

        this.setText(
            "resultTag",
            completed ? "VICTORIA" : "DERROTA"
        );

        this.setText(
            "resultTitle",
            completed
                ? "¡DESAFÍO COMPLETADO!"
                : "EL PICO SE HA ROTO"
        );

        this.setText(
            "resultDescription",
            completed
                ? `Conseguiste ${this.formatNumber(score)} puntos y completaste el objetivo.`
                : `Conseguiste ${this.formatNumber(score)} de ${this.formatNumber(finalTarget)} puntos necesarios.`
        );

        this.setText(
            "resultTarget",
            this.formatNumber(finalTarget)
        );

        this.setText(
            "resultScore",
            this.formatNumber(score)
        );

        this.setText(
            "resultDepth",
            `${Math.floor(depth)} m`
        );

        this.setText(
            "resultMinerals",
            this.formatNumber(finalMinerals)
        );

        this.setText(
            "resultReward",
            `+${this.formatNumber(reward)} DT`
        );

        this.setText(
            "progressText",
            `${percentage}%`
        );

        this.setText(
            "expeditionStatus",
            completed
                ? "OBJETIVO ALCANZADO"
                : "EXPEDICIÓN TERMINADA"
        );

        this.setButtonState(
            "restartButton",
            true,
            "NUEVA EXPEDICIÓN"
        );
    }

    showEventMessage(message, duration = 1800) {
        this.updateEvent(message, true);

        const element = this.get("eventDisplay");

        if (!element) return;

        if (element._hideTimeout) {
            clearTimeout(element._hideTimeout);
        }

        element._hideTimeout = setTimeout(() => {
            this.updateEvent("", false);
        }, duration);
    }

    animateValue(id, start, end, duration = 500) {
        const element = this.get(id);

        if (!element) return;

        const previous = this.animationFrames.get(id);

        if (previous) {
            cancelAnimationFrame(previous);
        }

        const from = Number(start) || 0;
        const to = Number(end) || 0;

        const startTime = performance.now();

        const animate = time => {
            const progress = Math.min(
                1,
                (time - startTime) / duration
            );

            const eased = 1 - Math.pow(1 - progress, 3);

            element.textContent = this.formatNumber(
                from + (to - from) * eased
            );

            if (progress < 1) {
                this.animationFrames.set(
                    id,
                    requestAnimationFrame(animate)
                );
            } else {
                this.animationFrames.delete(id);
            }
        };

        this.animationFrames.set(
            id,
            requestAnimationFrame(animate)
        );
    }

    setButtonHandler(id, callback) {
        const element = this.get(id);

        if (!element || typeof callback !== "function") {
            return false;
        }

        const previous = this.buttonHandlers.get(id);

        if (previous) {
            element.removeEventListener("click", previous);
        }

        const handler = event => {
            event.preventDefault();

            if (element.disabled) return;

            callback(event);
        };

        element.addEventListener("click", handler);

        this.buttonHandlers.set(id, handler);

        return true;
    }

    setButtonState(id, enabled, label = null) {
        const element = this.get(id);

        if (!element) return;

        element.disabled = !enabled;

        if (label !== null) {
            element.textContent = label;
        }
    }

    getSelectedTarget(defaultValue = 200) {
        const select = this.get("targetScoreSelect");

        if (!select) return defaultValue;

        const value = Number(select.value);

        const allowed = [100, 200, 500, 1000];

        return allowed.includes(value)
            ? value
            : defaultValue;
    }

    destroy() {
        for (const [id, handler] of this.buttonHandlers) {
            const element = this.get(id);

            if (element) {
                element.removeEventListener("click", handler);
            }
        }

        for (const frame of this.animationFrames.values()) {
            cancelAnimationFrame(frame);
        }

        const eventElement = this.get("eventDisplay");

        if (eventElement?._hideTimeout) {
            clearTimeout(eventElement._hideTimeout);
        }

        this.buttonHandlers.clear();
        this.animationFrames.clear();
    }
}
