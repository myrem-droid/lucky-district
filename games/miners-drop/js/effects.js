
export class Effects {
  constructor(options = {}) {
    this.particles = [];
    this.rings = [];
    this.floatingTexts = [];

    this.maxParticles = options.maxParticles ?? 650;
    this.maxRings = options.maxRings ?? 45;
    this.maxFloatingTexts = options.maxFloatingTexts ?? 35;

    this.gravity = options.gravity ?? 0.12;
    this.particleDrag = options.particleDrag ?? 0.985;

    this.colors = {
      gold: "#ffd166",
      blue: "#55d9ff",
      purple: "#bd83ff",
      orange: "#ff984f",
      red: "#ff5c65",
      white: "#ffffff"
    };
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  createParticle(x, y, options = {}) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    const angle = options.angle ?? this.random(0, Math.PI * 2);
    const speed = options.speed ?? this.random(1, 4);
    const lifetime = options.lifetime ?? this.random(25, 55);

    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: options.size ?? this.random(2, 5),
      color: options.color ?? "#ffffff",
      alpha: 1,
      lifetime,
      maxLifetime: lifetime,
      gravity: options.gravity ?? this.gravity,
      drag: options.drag ?? this.particleDrag,
      glow: options.glow ?? false,
      square: options.square ?? false,
      rotation: this.random(0, Math.PI * 2),
      rotationSpeed: this.random(-0.12, 0.12)
    });
  }

  burst(x, y, color = "#ffffff", amount = 12, options = {}) {
    const count = Math.min(
      100,
      Math.max(0, Math.floor(amount))
    );

    for (let i = 0; i < count; i++) {
      const angle =
        (Math.PI * 2 * i) / count +
        this.random(-0.2, 0.2);

      this.createParticle(x, y, {
        color,
        angle,
        speed: this.random(
          options.minSpeed ?? 1,
          options.maxSpeed ?? 5
        ),
        size: this.random(
          options.minSize ?? 2,
          options.maxSize ?? 5
        ),
        lifetime: this.random(
          options.minLifetime ?? 25,
          options.maxLifetime ?? 55
        ),
        gravity: options.gravity,
        glow: options.glow ?? false,
        square: options.square ?? false
      });
    }
  }

  impact(x, y, color = "#ffffff", intensity = 1) {
    const power = this.clamp(intensity, 0.2, 3);

    this.burst(
      x,
      y,
      color,
      Math.floor(5 + power * 5),
      {
        minSpeed: 1,
        maxSpeed: 2.5 + power * 2,
        minSize: 1.5,
        maxSize: 3.5 + power,
        minLifetime: 15,
        maxLifetime: 32
      }
    );

    this.createRing(x, y, color, {
      radius: 4,
      maxRadius: 15 + power * 10,
      lifetime: 15 + power * 5,
      lineWidth: 2
    });
  }

  mineralBreak(x, y, color = "#aaaaaa", amount = 15) {
    this.burst(x, y, color, amount, {
      minSpeed: 1.5,
      maxSpeed: 5,
      minSize: 2,
      maxSize: 6,
      minLifetime: 25,
      maxLifetime: 60,
      square: true,
      gravity: 0.16
    });

    this.createRing(x, y, color, {
      radius: 5,
      maxRadius: 30,
      lifetime: 22,
      lineWidth: 3
    });
  }

  explosion(x, y, color = "#ff9c42", amount = 35) {
    this.burst(x, y, color, amount, {
      minSpeed: 2,
      maxSpeed: 8,
      minSize: 2,
      maxSize: 7,
      minLifetime: 30,
      maxLifetime: 75,
      glow: true,
      square: true,
      gravity: 0.08
    });

    this.burst(x, y, "#ffffff", Math.floor(amount * 0.25), {
      minSpeed: 1,
      maxSpeed: 5,
      minSize: 1,
      maxSize: 3,
      minLifetime: 10,
      maxLifetime: 25
    });

    this.createRing(x, y, color, {
      radius: 8,
      maxRadius: 110,
      lifetime: 32,
      lineWidth: 5
    });

    this.createRing(x, y, "#ffffff", {
      radius: 4,
      maxRadius: 65,
      lifetime: 22,
      lineWidth: 2
    });

    this.text(x, y - 15, "¡BOOM!", color, {
      size: 20,
      lifetime: 50
    });
  }

  upgrade(x, y) {
    this.burst(x, y, this.colors.blue, 35, {
      minSpeed: 2,
      maxSpeed: 6,
      minSize: 2,
      maxSize: 5,
      glow: true,
      gravity: -0.04
    });

    this.createRing(x, y, this.colors.blue, {
      radius: 8,
      maxRadius: 75,
      lifetime: 35,
      lineWidth: 4
    });

    this.text(x, y - 25, "¡MEJORA!", this.colors.blue, {
      size: 18,
      lifetime: 55
    });
  }

  giant(x, y) {
    this.burst(x, y, this.colors.purple, 30, {
      minSpeed: 1,
      maxSpeed: 5,
      minSize: 2,
      maxSize: 6,
      glow: true,
      gravity: -0.02
    });

    this.createRing(x, y, this.colors.purple, {
      radius: 10,
      maxRadius: 90,
      lifetime: 40,
      lineWidth: 5
    });

    this.text(x, y - 25, "¡GIGANTE!", this.colors.purple, {
      size: 18,
      lifetime: 60
    });
  }

  createRing(x, y, color = "#ffffff", options = {}) {
    if (this.rings.length >= this.maxRings) {
      this.rings.shift();
    }

    this.rings.push({
      x,
      y,
      radius: options.radius ?? 4,
      maxRadius: options.maxRadius ?? 40,
      color,
      lifetime: options.lifetime ?? 25,
      maxLifetime: options.lifetime ?? 25,
      lineWidth: options.lineWidth ?? 2,
      alpha: 1
    });
  }

  text(x, y, message, color = "#ffffff", options = {}) {
    if (this.floatingTexts.length >= this.maxFloatingTexts) {
      this.floatingTexts.shift();
    }

    const lifetime = options.lifetime ?? 45;

    this.floatingTexts.push({
      x,
      y,
      text: String(message),
      color,
      size: options.size ?? 15,
      lifetime,
      maxLifetime: lifetime,
      vy: options.vy ?? -0.8,
      alpha: 1,
      bold: options.bold ?? true
    });
  }

  update(delta = 1) {
    const step = this.clamp(Number(delta) || 1, 0, 3);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      particle.vx *= Math.pow(particle.drag, step);
      particle.vy *= Math.pow(particle.drag, step);

      particle.vy += particle.gravity * step;

      particle.x += particle.vx * step;
      particle.y += particle.vy * step;

      particle.rotation += particle.rotationSpeed * step;
      particle.lifetime -= step;

      particle.alpha = this.clamp(
        particle.lifetime / particle.maxLifetime,
        0,
        1
      );

      if (particle.lifetime <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];

      ring.lifetime -= step;

      const progress = 1 - ring.lifetime / ring.maxLifetime;

      ring.radius =
        ring.radius +
        (ring.maxRadius - ring.radius) * (0.12 * step);

      ring.alpha = this.clamp(1 - progress, 0, 1);

      if (ring.lifetime <= 0) {
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const item = this.floatingTexts[i];

      item.y += item.vy * step;
      item.lifetime -= step;

      item.alpha = this.clamp(
        item.lifetime / item.maxLifetime,
        0,
        1
      );

      if (item.lifetime <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx, cameraY = 0) {
    if (!ctx) return;

    ctx.save();

    // Anillos de impacto y explosión.
    for (const ring of this.rings) {
      const screenY = ring.y - cameraY;

      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.lineWidth;

      ctx.beginPath();
      ctx.arc(
        ring.x,
        screenY,
        Math.max(0, ring.radius),
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Partículas.
    for (const particle of this.particles) {
      const screenY = particle.y - cameraY;

      ctx.save();

      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;

      if (particle.glow) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = particle.color;
      }

      ctx.translate(particle.x, screenY);
      ctx.rotate(particle.rotation);

      if (particle.square) {
        ctx.fillRect(
          -particle.size / 2,
          -particle.size / 2,
          particle.size,
          particle.size
        );
      } else {
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          particle.size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    }

    // Textos flotantes.
    for (const item of this.floatingTexts) {
      const screenY = item.y - cameraY;

      ctx.globalAlpha = item.alpha;
      ctx.fillStyle = item.color;
      ctx.font = `${item.bold ? "bold " : ""}${item.size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.shadowBlur = 8;
      ctx.shadowColor = item.color;

      ctx.fillText(item.text, item.x, screenY);
    }

    ctx.restore();
  }

  clear() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.floatingTexts.length = 0;
  }

  getInfo() {
    return {
      particles: this.particles.length,
      rings: this.rings.length,
      floatingTexts: this.floatingTexts.length,
      totalEffects:
        this.particles.length +
        this.rings.length +
        this.floatingTexts.length
    };
  }
}
