
 // ======================================================
// MINER'S DROP 2.0
// MINERAL FRAGMENT SYSTEM
// ======================================================

export class FragmentSystem {

    constructor(options = {}) {

        this.fragments = [];

        this.maxFragments = options.maxFragments ?? 500;

        this.gravity = options.gravity ?? 0.16;

        this.airResistance = options.airResistance ?? 0.992;

        this.defaultLifetime = options.lifetime ?? 75;

    }


    // ==================================================
    // CREATE SINGLE FRAGMENT
    // ==================================================

    create(x, y, options = {}) {

        if (this.fragments.length >= this.maxFragments) {

            this.fragments.shift();

        }

        const angle = options.angle ??
            Math.random() * Math.PI * 2;

        const speed = options.speed ??
            Math.random() * 5 + 1;

        const sides = options.sides ??
            Math.floor(Math.random() * 3) + 3;

        const fragment = {

            x,
            y,

            vx: options.vx ?? Math.cos(angle) * speed,

            vy: options.vy ?? Math.sin(angle) * speed,

            size: options.size ?? Math.random() * 7 + 4,

            color: options.color ?? "#999999",

            alpha: 1,

            life: options.life ?? this.defaultLifetime,

            maxLife: options.life ?? this.defaultLifetime,

            rotation: Math.random() * Math.PI * 2,

            rotationSpeed:
                (Math.random() - 0.5) * 0.3,

            gravity: options.gravity ?? this.gravity,

            friction: options.friction ?? this.airResistance,

            bounce: options.bounce ?? 0.35,

            sides,

            shape: options.shape ?? "polygon"

        };

        this.fragments.push(fragment);

        return fragment;

    }


    // ==================================================
    // BREAK MINERAL
    // ==================================================

    burst(x, y, color, amount = 12, options = {}) {

        const secondaryColor =
            options.secondaryColor ?? color;

        for (let i = 0; i < amount; i++) {

            const angle =
                Math.random() * Math.PI * 2;

            const speed =
                Math.random() * 5 + 1.5;

            const fragmentColor =
                Math.random() > 0.65
                    ? secondaryColor
                    : color;

            this.create(x, y, {

                angle,

                speed,

                color: fragmentColor,

                size: Math.random() * 8 + 3,

                life: 45 + Math.random() * 45,

                sides: Math.floor(
                    Math.random() * 3
                ) + 3,

                rotationSpeed:
                    (Math.random() - 0.5) * 0.25

            });

        }

    }


    // ==================================================
    // EXPLOSION FRAGMENTS
    // ==================================================

    explosion(x, y, color = "#ff9c42", amount = 35) {

        for (let i = 0; i < amount; i++) {

            const angle =
                Math.random() * Math.PI * 2;

            const speed =
                Math.random() * 10 + 3;

            this.create(x, y, {

                angle,

                speed,

                color,

                size: Math.random() * 10 + 4,

                life: 50 + Math.random() * 40,

                gravity: 0.2,

                bounce: 0.25

            });

        }

    }


    // ==================================================
    // UPDATE
    // ==================================================

    update(delta = 1, floorY = Infinity) {

        const dt = Math.min(delta, 2);

        for (const fragment of this.fragments) {

            fragment.vy += fragment.gravity * dt;

            fragment.vx *= Math.pow(
                fragment.friction,
                dt
            );

            fragment.vy *= Math.pow(
                fragment.friction,
                dt
            );

            fragment.x += fragment.vx * dt;

            fragment.y += fragment.vy * dt;

            fragment.rotation +=
                fragment.rotationSpeed * dt;

            // Simple floor collision.
            if (
                fragment.y + fragment.size / 2 > floorY &&
                fragment.vy > 0
            ) {

                fragment.y =
                    floorY - fragment.size / 2;

                fragment.vy *= -fragment.bounce;

                fragment.vx *= 0.82;

                fragment.rotationSpeed *= 0.8;

                if (Math.abs(fragment.vy) < 0.7) {

                    fragment.vy = 0;

                }

            }

            fragment.life -= dt;

            fragment.alpha = Math.max(
                0,
                fragment.life / fragment.maxLife
            );

            fragment.size *= Math.pow(0.997, dt);

        }

        this.fragments = this.fragments.filter(
            fragment => fragment.life > 0
        );

    }


    // ==================================================
    // DRAW
    // ==================================================

    draw(ctx, cameraY = 0) {

        ctx.save();

        for (const fragment of this.fragments) {

            ctx.save();

            ctx.globalAlpha = fragment.alpha;

            ctx.translate(
                fragment.x,
                fragment.y - cameraY
            );

            ctx.rotate(fragment.rotation);

            ctx.fillStyle = fragment.color;

            ctx.shadowColor = fragment.color;

            ctx.shadowBlur = 5;

            const half = fragment.size / 2;

            if (fragment.shape === "square") {

                ctx.fillRect(
                    -half,
                    -half,
                    fragment.size,
                    fragment.size
                );

            } else {

                ctx.beginPath();

                for (
                    let i = 0;
                    i < fragment.sides;
                    i++
                ) {

                    const angle =
                        (i / fragment.sides) *
                        Math.PI * 2;

                    const px =
                        Math.cos(angle) * half;

                    const py =
                        Math.sin(angle) * half;

                    if (i === 0) {

                        ctx.moveTo(px, py);

                    } else {

                        ctx.lineTo(px, py);

                    }

                }

                ctx.closePath();

                ctx.fill();

            }

            ctx.restore();

        }

        ctx.restore();

    }


    // ==================================================
    // CLEAR
    // ==================================================

    clear() {

        this.fragments = [];

    }


    // ==================================================
    // COUNT
    // ==================================================

    get count() {

        return this.fragments.length;

    }

}
