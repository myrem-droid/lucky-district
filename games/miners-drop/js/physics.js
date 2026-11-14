
export class PhysicsEngine {

    constructor(options = {}) {

        this.gravity = options.gravity ?? 0.34;
        this.airResistance = options.airResistance ?? 0.999;

        this.maxVelocityX = options.maxVelocityX ?? 8;
        this.maxVelocityY = options.maxVelocityY ?? 12;

        this.wallBounce = options.wallBounce ?? 0.82;
        this.blockBounce = options.blockBounce ?? 0.82;

        this.groundFriction = options.groundFriction ?? 0.99;
        this.rotationDamping = options.rotationDamping ?? 0.997;

        this.minimumVelocity = 0.025;
        this.minimumBounceSpeed = 2.5;
        this.maximumAngularVelocity = 0.32;

        this.collisionEpsilon = 0.1;
        this.angularImpactFactor = 0.018;
        this.sideImpulseFactor = 0.12;
    }

    // ==================================================
    // CREATE BODY
    // ==================================================

    createBody(x, y, options = {}) {

        const vx = options.vx ?? options.velocityX ?? 0;
        const vy = options.vy ?? options.velocityY ?? 0;

        return {
            x,
            y,

            vx,
            vy,

            velocityX: vx,
            velocityY: vy,

            radius: options.radius ?? 18,
            mass: options.mass ?? 1,

            rotation: options.rotation ?? 0,
            angularVelocity: options.angularVelocity ?? 0.05,

            restitution: Math.max(
                this.blockBounce,
                options.restitution ?? 0
            ),

            // Polígono local relativo al centro del pico.
            hitbox: options.hitbox ?? null,

            grounded: false,

            previousX: x,
            previousY: y
        };
    }

    // ==================================================
    // SYNCHRONIZE
    // ==================================================

    synchronize(body) {

        if (!body) return;

        body.vx = Number.isFinite(body.vx)
            ? body.vx
            : body.velocityX ?? 0;

        body.vy = Number.isFinite(body.vy)
            ? body.vy
            : body.velocityY ?? 0;

        body.velocityX = body.vx;
        body.velocityY = body.vy;
    }

    // ==================================================
    // LIMIT VELOCITY
    // ==================================================

    limitVelocity(body) {

        body.vx = this.clamp(
            body.vx,
            -this.maxVelocityX,
            this.maxVelocityX
        );

        body.vy = this.clamp(
            body.vy,
            -this.maxVelocityY,
            this.maxVelocityY
        );

        this.synchronize(body);
    }

    // ==================================================
    // UPDATE
    // ==================================================

    update(body, delta = 1) {

        if (!body) return;

        delta = this.clamp(delta, 0.1, 2.5);

        this.synchronize(body);

        body.previousX = body.x;
        body.previousY = body.y;

        body.vy += this.gravity * delta;

        const resistance = Math.pow(
            this.airResistance,
            delta
        );

        body.vx *= resistance;
        body.vy *= resistance;

        this.limitVelocity(body);

        body.x += body.vx * delta;
        body.y += body.vy * delta;

        body.angularVelocity +=
            body.vx * 0.003 * delta;

        body.angularVelocity +=
            body.vy * 0.001 * delta;

        body.angularVelocity *= Math.pow(
            this.rotationDamping,
            delta
        );

        body.angularVelocity = this.clamp(
            body.angularVelocity,
            -this.maximumAngularVelocity,
            this.maximumAngularVelocity
        );

        body.rotation += body.angularVelocity * delta;

        if (Math.abs(body.vx) < this.minimumVelocity) {
            body.vx = 0;
        }

        if (Math.abs(body.vy) < this.minimumVelocity) {
            body.vy = 0;
        }

        this.synchronize(body);
    }

    // ==================================================
    // GET HITBOX
    // ==================================================

    getWorldHitbox(body) {

        if (!body.hitbox || body.hitbox.length < 3) {
            return null;
        }

        const cos = Math.cos(body.rotation);
        const sin = Math.sin(body.rotation);

        return body.hitbox.map(point => {

            const localX = point.x;
            const localY = point.y;

            return {
                x: body.x + localX * cos - localY * sin,
                y: body.y + localX * sin + localY * cos
            };
        });
    }

    // ==================================================
    // POLYGON PROJECTION
    // ==================================================

    projectPolygon(vertices, axisX, axisY) {

        let min = Infinity;
        let max = -Infinity;

        for (const vertex of vertices) {

            const projection =
                vertex.x * axisX +
                vertex.y * axisY;

            min = Math.min(min, projection);
            max = Math.max(max, projection);
        }

        return { min, max };
    }

    // ==================================================
    // SAT COLLISION
    // ==================================================

    getPolygonRectangleCollision(vertices, block) {

        const rectangle = [
            { x: block.x, y: block.y },
            { x: block.x + block.width, y: block.y },
            { x: block.x + block.width, y: block.y + block.height },
            { x: block.x, y: block.y + block.height }
        ];

        const axes = [];

        const addAxes = polygon => {

            for (let i = 0; i < polygon.length; i++) {

                const current = polygon[i];
                const next = polygon[(i + 1) % polygon.length];

                const edgeX = next.x - current.x;
                const edgeY = next.y - current.y;

                const length = Math.hypot(edgeX, edgeY);

                if (length < 0.0001) continue;

                axes.push({
                    x: -edgeY / length,
                    y: edgeX / length
                });
            }
        };

        addAxes(vertices);
        addAxes(rectangle);

        let minimumOverlap = Infinity;
        let collisionNormal = null;

        const centerX = vertices.reduce(
            (sum, point) => sum + point.x,
            0
        ) / vertices.length;

        const centerY = vertices.reduce(
            (sum, point) => sum + point.y,
            0
        ) / vertices.length;

        const blockCenterX = block.x + block.width / 2;
        const blockCenterY = block.y + block.height / 2;

        for (const axis of axes) {

            const polygonProjection = this.projectPolygon(
                vertices,
                axis.x,
                axis.y
            );

            const rectangleProjection = this.projectPolygon(
                rectangle,
                axis.x,
                axis.y
            );

            const overlap = Math.min(
                polygonProjection.max,
                rectangleProjection.max
            ) - Math.max(
                polygonProjection.min,
                rectangleProjection.min
            );

            if (overlap <= 0) {
                return null;
            }

            if (overlap < minimumOverlap) {

                minimumOverlap = overlap;

                let normalX = axis.x;
                let normalY = axis.y;

                const directionX = centerX - blockCenterX;
                const directionY = centerY - blockCenterY;

                if (
                    directionX * normalX +
                    directionY * normalY < 0
                ) {
                    normalX *= -1;
                    normalY *= -1;
                }

                collisionNormal = {
                    x: normalX,
                    y: normalY
                };
            }
        }

        return {
            penetration: minimumOverlap,
            normalX: collisionNormal.x,
            normalY: collisionNormal.y,
            centerX,
            centerY
        };
    }

    // ==================================================
    // COLLISION RESPONSE
    // ==================================================

    resolveCollision(body, normalX, normalY, contactX = body.x, contactY = body.y) {

        const normalVelocity =
            body.vx * normalX +
            body.vy * normalY;

        if (normalVelocity >= 0) {

            return {
                bounced: false,
                impactSpeed: 0
            };
        }

        const impactSpeed = -normalVelocity;

        const restitution = this.clamp(
            Math.max(
                this.blockBounce,
                body.restitution ?? 0
            ),
            0,
            0.95
        );

        const outgoingSpeed = Math.max(
            impactSpeed * restitution,
            this.minimumBounceSpeed
        );

        const velocityChange =
            outgoingSpeed + impactSpeed;

        body.vx += normalX * velocityChange;
        body.vy += normalY * velocityChange;

        // Impulso tangencial.
        const tangentX = -normalY;
        const tangentY = normalX;

        const tangentVelocity =
            body.vx * tangentX +
            body.vy * tangentY;

        const lateralImpulse = this.clamp(
            tangentVelocity * this.sideImpulseFactor,
            -1.2,
            1.2
        );

        body.vx += tangentX * lateralImpulse;
        body.vy += tangentY * lateralImpulse;

        // El punto de contacto influye en la rotación.
        const armX = contactX - body.x;
        const armY = contactY - body.y;

        const torque =
            armX * normalY -
            armY * normalX;

        const rotationDirection =
            Math.sign(torque || tangentVelocity || normalX || 1);

        const rotationImpulse =
            rotationDirection *
            Math.min(
                0.14,
                0.025 + impactSpeed * this.angularImpactFactor
            );

        this.applyRotation(body, rotationImpulse);

        body.grounded = false;

        this.limitVelocity(body);

        return {
            bounced: true,
            impactSpeed
        };
    }

    // ==================================================
    // WALL COLLISIONS
    // ==================================================

    collideWithWalls(body, width) {

        if (!body) return;

        this.synchronize(body);

        const radius = body.radius ?? 18;

        if (body.x - radius < 0) {

            body.x = radius;

            if (body.vx < 0) {

                body.vx = Math.max(
                    this.minimumBounceSpeed,
                    Math.abs(body.vx) * this.wallBounce
                );

                this.applyRotation(body, 0.07);
            }
        }

        if (body.x + radius > width) {

            body.x = width - radius;

            if (body.vx > 0) {

                body.vx = -Math.max(
                    this.minimumBounceSpeed,
                    body.vx * this.wallBounce
                );

                this.applyRotation(body, -0.07);
            }
        }

        this.limitVelocity(body);
    }

    // ==================================================
    // POLYGON BLOCK COLLISION
    // ==================================================

    collideWithPolygonBlock(body, block) {

        const vertices = this.getWorldHitbox(body);

        if (!vertices) return null;

        const collision = this.getPolygonRectangleCollision(
            vertices,
            block
        );

        if (!collision) return null;

        const {
            penetration,
            normalX,
            normalY,
            centerX,
            centerY
        } = collision;

        // Separación del bloque.
        body.x += normalX * (penetration + this.collisionEpsilon);
        body.y += normalY * (penetration + this.collisionEpsilon);

        // Contacto aproximado en el borde del polígono.
        const contactX =
            (centerX + block.x + block.width / 2) / 2;

        const contactY =
            (centerY + block.y + block.height / 2) / 2;

        const response = this.resolveCollision(
            body,
            normalX,
            normalY,
            contactX,
            contactY
        );

        return {
            collided: true,
            bounced: response.bounced,
            normalX,
            normalY,
            penetration,
            impactSpeed: response.impactSpeed,
            isVertical: Math.abs(normalY) > Math.abs(normalX),
            isHorizontal: Math.abs(normalX) >= Math.abs(normalY)
        };
    }

    // ==================================================
    // RECTANGLE COLLISION
    // ==================================================

    collideWithBlock(body, block) {

        if (!body || !block || block.destroyed) {
            return null;
        }

        this.synchronize(body);

        // Usar hitbox poligonal si está definida.
        if (body.hitbox && body.hitbox.length >= 3) {

            return this.collideWithPolygonBlock(
                body,
                block
            );
        }

        // Compatibilidad con el sistema circular anterior.
        const radius = body.radius ?? 18;

        const left = block.x;
        const right = block.x + block.width;
        const top = block.y;
        const bottom = block.y + block.height;

        const nearestX = this.clamp(body.x, left, right);
        const nearestY = this.clamp(body.y, top, bottom);

        const dx = body.x - nearestX;
        const dy = body.y - nearestY;

        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared >= radius * radius) {
            return null;
        }

        let normalX;
        let normalY;
        let penetration;

        const inside =
            body.x >= left &&
            body.x <= right &&
            body.y >= top &&
            body.y <= bottom;

        if (inside) {

            const faces = [
                { distance: body.x - left, x: -1, y: 0 },
                { distance: right - body.x, x: 1, y: 0 },
                { distance: body.y - top, x: 0, y: -1 },
                { distance: bottom - body.y, x: 0, y: 1 }
            ];

            faces.sort((a, b) => a.distance - b.distance);

            normalX = faces[0].x;
            normalY = faces[0].y;

            penetration = radius + faces[0].distance;

        } else {

            const distance = Math.sqrt(distanceSquared);

            if (distance < 0.0001) return null;

            normalX = dx / distance;
            normalY = dy / distance;

            penetration = radius - distance;
        }

        body.x += normalX * (penetration + this.collisionEpsilon);
        body.y += normalY * (penetration + this.collisionEpsilon);

        const response = this.resolveCollision(
            body,
            normalX,
            normalY
        );

        return {
            collided: true,
            bounced: response.bounced,
            normalX,
            normalY,
            penetration,
            impactSpeed: response.impactSpeed,
            isVertical: Math.abs(normalY) > Math.abs(normalX),
            isHorizontal: Math.abs(normalX) >= Math.abs(normalY)
        };
    }

    // ==================================================
    // CIRCLE COLLISION
    // ==================================================

    collideWithCircle(body, other, restitution = 0.8) {

        if (!body || !other) return null;

        this.synchronize(body);

        const dx = body.x - other.x;
        const dy = body.y - other.y;

        const distance = Math.hypot(dx, dy);

        const minimumDistance =
            (body.radius ?? 18) +
            (other.radius ?? 18);

        if (distance >= minimumDistance) {
            return null;
        }

        const safeDistance = Math.max(distance, 0.001);

        const normalX = dx / safeDistance;
        const normalY = dy / safeDistance;

        const penetration = minimumDistance - distance;

        body.x += normalX * (penetration + this.collisionEpsilon);
        body.y += normalY * (penetration + this.collisionEpsilon);

        const previousRestitution = body.restitution;

        body.restitution = Math.max(
            previousRestitution ?? 0,
            restitution
        );

        const response = this.resolveCollision(
            body,
            normalX,
            normalY
        );

        body.restitution = previousRestitution;

        return {
            collided: true,
            bounced: response.bounced,
            impactSpeed: response.impactSpeed,
            normalX,
            normalY,
            penetration
        };
    }

    // ==================================================
    // GROUND COLLISION
    // ==================================================

    collideWithGround(body, groundY) {

        if (!body) return null;

        this.synchronize(body);

        const radius = body.radius ?? 18;

        if (body.y + radius < groundY) {
            body.grounded = false;
            return null;
        }

        body.y = groundY - radius;

        const impactSpeed = Math.max(0, body.vy);

        if (body.vy > 0) {

            body.vy = -Math.max(
                this.minimumBounceSpeed,
                body.vy * this.blockBounce
            );

            this.applyRotation(body, 0.08);
        }

        body.vx *= this.groundFriction;
        body.grounded = false;

        this.limitVelocity(body);

        return {
            collided: true,
            impactSpeed
        };
    }

    // ==================================================
    // APPLY IMPULSE
    // ==================================================

    applyImpulse(body, x, y) {

        if (!body) return;

        this.synchronize(body);

        const mass = Math.max(0.1, body.mass ?? 1);

        body.vx += x / mass;
        body.vy += y / mass;

        this.applyRotation(body, x * 0.014);

        this.limitVelocity(body);
    }

    // ==================================================
    // APPLY ROTATION
    // ==================================================

    applyRotation(body, amount) {

        if (!body) return;

        body.angularVelocity += amount;

        body.angularVelocity = this.clamp(
            body.angularVelocity,
            -this.maximumAngularVelocity,
            this.maximumAngularVelocity
        );
    }

    // ==================================================
    // CLAMP
    // ==================================================

    clamp(value, min, max) {

        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    // ==================================================
    // RESET BODY
    // ==================================================

    resetBody(body, x, y) {

        if (!body) return;

        body.x = x;
        body.y = y;

        body.vx = 0;
        body.vy = 0;

        body.velocityX = 0;
        body.velocityY = 0;

        body.rotation = 0;
        body.angularVelocity = 0;

        body.grounded = false;

        body.previousX = x;
        body.previousY = y;

        this.synchronize(body);
    }
}
