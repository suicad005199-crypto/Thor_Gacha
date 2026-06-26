const config = window.GotchaPerformanceConfig;
const orbDrops = config.orbDrops;
const orbMultiplierPools = config.orbMultiplierPools || {};
const ballAssets = config.ballAssets;
const shellAssets = config.shellAssets || {};
const bitmapFont = config.bitmapFont;
const highOpenBitmapFont = config.highOpenBitmapFont
  ? { ...bitmapFont, image: config.highOpenBitmapFont.image }
  : null;
const bgmNormalVolume = config.audio.bgmNormalVolume;
const bgmDuckedVolume = config.audio.bgmDuckedVolume;

const stage = document.querySelector(".stage");
const boss = document.querySelector(".boss");
const bossImage = document.querySelector(".boss-image");
const ballLayer = document.querySelector("#ballLayer");
const lightningCanvas = document.querySelector("#lightningCanvas");
const lightningCtx = lightningCanvas.getContext("2d");
const clawCanvas = document.querySelector("#clawCanvas");
const clawCtx = clawCanvas.getContext("2d");
const bubbleCanvas = document.querySelector("#bubbleCanvas");
const bubbleCtx = bubbleCanvas.getContext("2d");
const scoreGatherLayer = document.querySelector("#scoreGatherLayer");
const prizeRow = document.querySelector("#prizeRow");
const prizeInput = document.querySelector("#prizeInput");
const playButton = document.querySelector("#playButton");
const presetButtons = document.querySelectorAll("[data-value]");
const characterButtons = document.querySelectorAll("[data-character-key]");
const bgmSound = new Audio(config.audio.bgm);
bgmSound.preload = "auto";
bgmSound.loop = true;
bgmSound.volume = bgmNormalVolume;
const gotchaSound = new Audio(config.audio.gotcha);
gotchaSound.preload = "auto";
const gotchaIntroSound = new Audio(config.audio.intro);
gotchaIntroSound.preload = "auto";
const activeIntroSounds = new Set();
const gotchaHitLargeSound = new Audio(config.audio.hitLarge);
gotchaHitLargeSound.preload = "auto";
const activeHitLargeSounds = new Set();
const chargeSound = new Audio(config.audio.charge || "charge 1.mp3");
chargeSound.preload = "auto";
chargeSound.loop = true;
chargeSound.volume = 1;
let chargeRateFrame = 0;
const shellImages = Object.fromEntries(Object.entries(shellAssets).map(([key, src]) => {
  const image = new Image();
  image.src = src;
  return [key, image];
}));

let sequenceId = 0;
let activeCharacterKey = config.activeCharacter;
let activeCharacter = config.characters[activeCharacterKey];
let idleBossImage = activeCharacter.idleImage;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lightningCanvasWidth = 0;
let lightningCanvasHeight = 0;
let lightningFrameId = 0;
const lightningBolts = [];
const lightningParticles = [];
const lightningCircles = [];
let clawCanvasWidth = 0;
let clawCanvasHeight = 0;
let clawFrameId = 0;
const clawSlashes = [];
const clawParticles = [];
const clawSlashAngle = Math.PI * .75;
let bubbleCanvasWidth = 0;
let bubbleCanvasHeight = 0;
let bubbleFrameId = 0;
const mermaidBubbles = [];
const mermaidDrops = [];

function resizeLightningCanvas() {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(1.35, window.devicePixelRatio || 1);
      lightningCanvasWidth = rect.width || stage.clientWidth || 1120;
      lightningCanvasHeight = rect.height || stage.clientHeight || 630;
      lightningCanvas.width = Math.round(lightningCanvasWidth * dpr);
      lightningCanvas.height = Math.round(lightningCanvasHeight * dpr);
      lightningCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lightningCtx.clearRect(0, 0, lightningCanvasWidth, lightningCanvasHeight);
    }

function stagePointToCanvas(point) {
      if (!lightningCanvasWidth || !lightningCanvasHeight) {
        resizeLightningCanvas();
      }

      return {
        x: lightningCanvasWidth * (point.x / 100),
        y: lightningCanvasHeight * (point.y / 100),
      };
    }

class LightningMagicCircle {
      constructor(x, y, strong = false) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = Math.min(lightningCanvasWidth * (strong ? .16 : .12), strong ? 230 : 180);
        this.rotation = Math.random() * Math.PI;
        this.alpha = 1;
        this.life = strong ? 58 : 44;
        this.strong = strong;
      }

      update() {
        this.radius += (this.maxRadius - this.radius) * .2;
        this.rotation += this.strong ? .06 : .045;
        this.life -= 1;
        if (this.life < 22) this.alpha = Math.max(0, this.life / 22);
      }

      draw() {
        if (this.alpha <= 0) return;
        lightningCtx.save();
        lightningCtx.translate(this.x, this.y);
        lightningCtx.scale(1, .35);
        lightningCtx.rotate(this.rotation);
        lightningCtx.globalCompositeOperation = "screen";
        lightningCtx.strokeStyle = `rgba(255, 188, 58, ${this.alpha})`;
        lightningCtx.lineWidth = this.strong ? 4 : 3;
        lightningCtx.shadowBlur = this.strong ? 24 : 18;
        lightningCtx.shadowColor = "#ff9a28";

        lightningCtx.beginPath();
        lightningCtx.arc(0, 0, this.radius, 0, Math.PI * 2);
        lightningCtx.stroke();

        lightningCtx.beginPath();
        lightningCtx.setLineDash([15, 10]);
        lightningCtx.arc(0, 0, this.radius * .78, 0, Math.PI * 2);
        lightningCtx.stroke();
        lightningCtx.setLineDash([]);

        lightningCtx.beginPath();
        for (let index = 0; index < 6; index += 1) {
          const angle = (index * Math.PI * 2) / 6;
          lightningCtx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
        }
        lightningCtx.closePath();
        lightningCtx.stroke();
        lightningCtx.restore();
      }
    }

class LightningSpark {
      constructor(x, y, strong = false) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = (strong ? 7 : 5) + Math.random() * (strong ? 13 : 9);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - (strong ? 8 : 5);
        this.gravity = strong ? .88 : .72;
        this.friction = .91;
        this.life = 1;
        this.decay = .04 + Math.random() * .045;
        this.color = Math.random() > .45 ? "#ffbc35" : "#ffffff";
        this.strong = strong;
      }

      update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
      }

      draw() {
        if (this.life <= 0) return;
        lightningCtx.save();
        lightningCtx.globalCompositeOperation = "lighter";
        lightningCtx.fillStyle = this.color;
        lightningCtx.shadowBlur = this.strong ? 12 : 9;
        lightningCtx.shadowColor = this.color;
        lightningCtx.beginPath();
        lightningCtx.arc(this.x, this.y, (this.strong ? 3.4 : 2.7) * this.life, 0, Math.PI * 2);
        lightningCtx.fill();
        lightningCtx.restore();
      }
    }

class LightningBolt {
      constructor(startX, startY, endX, endY, strong = false) {
        this.segments = [];
        this.alpha = strong ? 1.42 : 1.2;
        this.strong = strong;
        this.generateFractal(startX, startY, endX, endY, strong ? 170 : 130);
      }

      generateFractal(x1, y1, x2, y2, displace) {
        if (displace < 7) {
          this.segments.push({ x1, y1, x2, y2 });
          return;
        }

        const midX = (x1 + x2) / 2 + (Math.random() - .5) * displace;
        const midY = (y1 + y2) / 2 + (Math.random() - .5) * displace;
        this.generateFractal(x1, y1, midX, midY, displace / 2);
        this.generateFractal(midX, midY, x2, y2, displace / 2);

        if (Math.random() < (this.strong ? .22 : .14)) {
          const branchEndX = midX + (Math.random() - .5) * displace * 2;
          const branchEndY = midY + (Math.random() - .1) * displace * 2;
          this.generateFractal(midX, midY, branchEndX, branchEndY, displace / 2);
        }
      }

      update() {
        this.alpha -= this.strong ? .043 : .055;
      }

      draw() {
        if (this.alpha <= 0) return;
        lightningCtx.save();
        lightningCtx.globalCompositeOperation = "screen";
        lightningCtx.shadowBlur = this.strong ? 34 : 26;
        lightningCtx.shadowColor = "#00aaff";
        lightningCtx.strokeStyle = `rgba(42, 184, 255, ${this.alpha})`;
        lightningCtx.lineWidth = this.strong ? 10 : 7;
        lightningCtx.lineCap = "round";
        lightningCtx.beginPath();
        this.segments.forEach((segment) => {
          lightningCtx.moveTo(segment.x1, segment.y1);
          lightningCtx.lineTo(segment.x2, segment.y2);
        });
        lightningCtx.stroke();

        lightningCtx.shadowBlur = this.strong ? 12 : 9;
        lightningCtx.shadowColor = "#ffffff";
        lightningCtx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
        lightningCtx.lineWidth = this.strong ? 3.2 : 2.4;
        lightningCtx.beginPath();
        this.segments.forEach((segment) => {
          lightningCtx.moveTo(segment.x1, segment.y1);
          lightningCtx.lineTo(segment.x2, segment.y2);
        });
        lightningCtx.stroke();
        lightningCtx.restore();
      }
    }

function updateLightningGroup(group) {
      for (let index = group.length - 1; index >= 0; index -= 1) {
        const item = group[index];
        item.update();
        item.draw();
        if ((item.alpha !== undefined && item.alpha <= 0) || (item.life !== undefined && item.life <= 0)) {
          group.splice(index, 1);
        }
      }
    }

function renderLightning() {
      lightningCtx.clearRect(0, 0, lightningCanvasWidth, lightningCanvasHeight);

      updateLightningGroup(lightningCircles);
      updateLightningGroup(lightningBolts);
      updateLightningGroup(lightningParticles);
      lightningFrameId = requestAnimationFrame(renderLightning);
    }

function startLightningRenderer() {
      if (!lightningFrameId) {
        resizeLightningCanvas();
        lightningFrameId = requestAnimationFrame(renderLightning);
      }
    }

function clearLightningShow() {
      lightningBolts.length = 0;
      lightningParticles.length = 0;
      lightningCircles.length = 0;
      lightningCtx.clearRect(0, 0, lightningCanvasWidth, lightningCanvasHeight);
    }

function resizeClawCanvas() {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(1.35, window.devicePixelRatio || 1);
      clawCanvasWidth = rect.width || stage.clientWidth || 1120;
      clawCanvasHeight = rect.height || stage.clientHeight || 630;
      clawCanvas.width = Math.round(clawCanvasWidth * dpr);
      clawCanvas.height = Math.round(clawCanvasHeight * dpr);
      clawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      clawCtx.clearRect(0, 0, clawCanvasWidth, clawCanvasHeight);
    }

function stagePointToClawCanvas(point) {
      if (!clawCanvasWidth || !clawCanvasHeight) {
        resizeClawCanvas();
      }

      return {
        x: clawCanvasWidth * (point.x / 100),
        y: clawCanvasHeight * (point.y / 100),
      };
    }

class HadesSlash {
      constructor(x, y, strong = false, offsets = [82, 0, -82], options = {}) {
        this.x = x;
        this.y = y;
        this.strong = strong;
        this.offsets = offsets;
        this.angle = clawSlashAngle + (Math.random() * .035 - .0175);
        this.length = Math.min(clawCanvasWidth * (strong ? .88 : .72), strong ? 980 : 800) * (options.lengthScale || 1);
        this.thicknessScale = options.thicknessScale || 1;
        this.progress = 0;
        this.life = 1;
      }

      update() {
        if (this.progress < 1) {
          this.progress += this.strong ? .18 : .16;
        } else {
          this.life -= this.strong ? .035 : .045;
        }
      }

      draw() {
        if (this.life <= 0) return;
        clawCtx.save();
        clawCtx.translate(this.x, this.y);
        clawCtx.rotate(this.angle);
        clawCtx.globalCompositeOperation = "source-over";
        clawCtx.shadowBlur = this.strong ? 24 : 18;
        clawCtx.shadowColor = "#ff1700";

        const drawProgress = Math.min(1, this.progress);
        const startX = -this.length / 2;
        const endX = startX + this.length * drawProgress;
        const midX = (startX + endX) / 2;
        const openAmount = this.progress < 1 ? Math.sin(drawProgress * Math.PI) : .62;
        const thickness = (this.strong ? 30 : 20) * openAmount * this.thicknessScale;

        this.offsets.forEach((offset) => {
          clawCtx.beginPath();
          clawCtx.moveTo(startX, offset);
          clawCtx.quadraticCurveTo(midX, offset - thickness, endX, offset);
          clawCtx.quadraticCurveTo(midX, offset + thickness, startX, offset);
          clawCtx.fillStyle = `rgba(220, 0, 0, ${this.life})`;
          clawCtx.fill();

          clawCtx.beginPath();
          clawCtx.moveTo(startX, offset - thickness * .08);
          clawCtx.quadraticCurveTo(midX, offset - thickness * .78, endX, offset - thickness * .08);
          clawCtx.strokeStyle = `rgba(255, 190, 42, ${this.life * .5})`;
          clawCtx.lineWidth = this.strong ? 3.4 : 2.4;
          clawCtx.stroke();
        });

        clawCtx.restore();
      }
    }

class HadesClawParticle {
      constructor(x, y, strong = false) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = (strong ? 10 : 7) + Math.random() * (strong ? 22 : 16);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = strong ? .82 : .72;
        this.friction = .88;
        this.life = 1;
        this.decay = .024 + Math.random() * .04;
        this.color = Math.random() > .18 ? "#df0000" : "#ffcc32";
      }

      update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
      }

      draw() {
        if (this.life <= 0) return;
        clawCtx.save();
        clawCtx.globalCompositeOperation = this.color === "#ffcc32" ? "lighter" : "source-over";
        clawCtx.fillStyle = this.color;
        clawCtx.beginPath();
        clawCtx.ellipse(this.x, this.y, 4 * this.life, 14 * this.life, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
        clawCtx.fill();
        clawCtx.restore();
      }
    }

function updateClawGroup(group) {
      for (let index = group.length - 1; index >= 0; index -= 1) {
        const item = group[index];
        item.update();
        item.draw();
        if ((item.life !== undefined && item.life <= 0) || (item.alpha !== undefined && item.alpha <= 0)) {
          group.splice(index, 1);
        }
      }
    }

function renderClawShow() {
      clawCtx.clearRect(0, 0, clawCanvasWidth, clawCanvasHeight);
      updateClawGroup(clawSlashes);
      updateClawGroup(clawParticles);

      if (clawSlashes.length || clawParticles.length) {
        clawFrameId = requestAnimationFrame(renderClawShow);
      } else {
        clawFrameId = 0;
        clawCtx.clearRect(0, 0, clawCanvasWidth, clawCanvasHeight);
      }
    }

function startClawRenderer() {
      if (!clawFrameId) {
        resizeClawCanvas();
        clawFrameId = requestAnimationFrame(renderClawShow);
      }
    }

function clearClawShow() {
      clawSlashes.length = 0;
      clawParticles.length = 0;
      stage.classList.remove("stage--hades-dark", "stage--hades-bright-peek", "stage--claw-shake");
      if (clawFrameId) {
        cancelAnimationFrame(clawFrameId);
        clawFrameId = 0;
      }
      clawCtx.clearRect(0, 0, clawCanvasWidth, clawCanvasHeight);
    }

function resizeBubbleCanvas() {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(1.35, window.devicePixelRatio || 1);
      bubbleCanvasWidth = rect.width || stage.clientWidth || 1120;
      bubbleCanvasHeight = rect.height || stage.clientHeight || 630;
      bubbleCanvas.width = Math.round(bubbleCanvasWidth * dpr);
      bubbleCanvas.height = Math.round(bubbleCanvasHeight * dpr);
      bubbleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bubbleCtx.clearRect(0, 0, bubbleCanvasWidth, bubbleCanvasHeight);
    }

function stagePointToBubbleCanvas(point) {
      if (!bubbleCanvasWidth || !bubbleCanvasHeight) {
        resizeBubbleCanvas();
      }

      return {
        x: bubbleCanvasWidth * (point.x / 100),
        y: bubbleCanvasHeight * (point.y / 100),
      };
    }

class MermaidBubble {
      constructor(point) {
        const target = stagePointToBubbleCanvas(point);
        this.targetX = target.x;
        this.targetY = target.y;
        this.radius = point.radius || 66;
        this.isGold = Boolean(point.isGold);
        this.hasScore = Boolean(point.score);
        this.shouldPop = point.shouldPop !== false;
        this.createdAt = performance.now();
        this.openedAt = 0;
        this.duration = point.spawnTime || 260;
        this.spawnScale = .18;
        this.alpha = 1;
        this.isPopped = false;
        this.x = this.targetX;
        this.y = this.targetY;
      }

      update(now) {
        if (this.openedAt) {
          this.alpha = 1;
          return;
        }

        const elapsed = now - this.createdAt;
        const progress = Math.min(1, elapsed / this.duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        this.spawnScale = .18 + eased * .82;
        this.x = this.targetX;
        this.y = this.targetY;
        this.alpha = 1;
      }

      draw() {
        if (this.isPopped) return;
        const imageKey = this.openedAt
          ? (this.isGold ? (this.hasScore ? "goldPearl" : "goldEmpty") : (this.hasScore ? "normalPearl" : "normalEmpty"))
          : (this.isGold ? "goldClosed" : "normalClosed");
        const image = shellImages[imageKey];
        const aspect = image?.naturalWidth ? image.naturalHeight / image.naturalWidth : 911 / 751;
        const openElapsed = this.openedAt ? performance.now() - this.openedAt : 0;
        const openPulse = this.openedAt ? 1 + Math.sin(Math.min(1, openElapsed / 180) * Math.PI) * .12 : 1;
        const width = this.radius * (this.isGold ? 1.95 : 1.82) * openPulse * (this.openedAt ? 1 : this.spawnScale);
        const height = width * aspect;

        bubbleCtx.save();
        bubbleCtx.translate(this.x, this.y);
        bubbleCtx.globalAlpha = this.alpha;
        bubbleCtx.globalCompositeOperation = "source-over";
        bubbleCtx.shadowBlur = this.isGold ? 18 : 10;
        bubbleCtx.shadowColor = this.isGold ? "rgba(255, 210, 64, .55)" : "rgba(94, 226, 255, .42)";

        if (image?.complete && image.naturalWidth) {
          bubbleCtx.drawImage(image, -width / 2, -height / 2, width, height);
        } else {
          bubbleCtx.globalCompositeOperation = "screen";
          bubbleCtx.fillStyle = this.isGold
            ? "rgba(255, 190, 44, .95)"
            : "rgba(145, 241, 255, .95)";
          bubbleCtx.beginPath();
          bubbleCtx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
          bubbleCtx.fill();
        }
        bubbleCtx.restore();
      }
    }

class MermaidDrop {
      constructor(x, y, radius, isGold = false) {
        this.x = x;
        this.y = y;
        this.isGold = isGold;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * (radius * .16);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - Math.random() * 2.5;
        this.radius = 2 + Math.random() * 4.5;
        this.alpha = 1;
        this.gravity = .18;
      }

      update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= .032;
      }

      draw() {
        if (this.alpha <= 0) return;
        bubbleCtx.save();
        bubbleCtx.globalCompositeOperation = "screen";
        bubbleCtx.fillStyle = this.isGold
          ? `rgba(255, 223, 97, ${this.alpha})`
          : `rgba(145, 241, 255, ${this.alpha})`;
        bubbleCtx.shadowBlur = this.isGold ? 12 : 8;
        bubbleCtx.shadowColor = this.isGold ? "#ffd449" : "#70f4ff";
        bubbleCtx.beginPath();
        bubbleCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        bubbleCtx.fill();
        bubbleCtx.restore();
      }
    }

function renderBubbleShow() {
      const now = performance.now();
      bubbleCtx.clearRect(0, 0, bubbleCanvasWidth, bubbleCanvasHeight);

      for (let index = mermaidBubbles.length - 1; index >= 0; index -= 1) {
        const bubble = mermaidBubbles[index];
        bubble.update(now);
        bubble.draw();
        if (bubble.isPopped) {
          mermaidBubbles.splice(index, 1);
        }
      }

      for (let index = mermaidDrops.length - 1; index >= 0; index -= 1) {
        const drop = mermaidDrops[index];
        drop.update();
        drop.draw();
        if (drop.alpha <= 0) {
          mermaidDrops.splice(index, 1);
        }
      }

      if (mermaidBubbles.length || mermaidDrops.length) {
        bubbleFrameId = requestAnimationFrame(renderBubbleShow);
      } else {
        bubbleFrameId = 0;
        bubbleCtx.clearRect(0, 0, bubbleCanvasWidth, bubbleCanvasHeight);
      }
    }

function startBubbleRenderer() {
      if (!bubbleFrameId) {
        resizeBubbleCanvas();
        bubbleFrameId = requestAnimationFrame(renderBubbleShow);
      }
    }

function clearBubbleShow() {
      mermaidBubbles.length = 0;
      mermaidDrops.length = 0;
      stage.classList.remove("stage--mermaid-water");
      if (bubbleFrameId) {
        cancelAnimationFrame(bubbleFrameId);
        bubbleFrameId = 0;
      }
      bubbleCtx.clearRect(0, 0, bubbleCanvasWidth, bubbleCanvasHeight);
    }

function createHadesScore(point, text, index, total) {
      const explicitPosition = Array.isArray(point.scorePositions) ? point.scorePositions[index] : null;
      const distance = (index - (total - 1) / 2) * (point.scoreGap || 9);
      const scorePoint = {
        x: explicitPosition?.x ?? ((point.scoreX ?? point.x) + Math.cos(clawSlashAngle) * distance),
        y: explicitPosition?.y ?? ((point.scoreY ?? point.y) + Math.sin(clawSlashAngle) * distance * .72),
      };
      const score = document.createElement("div");
      const isBigScore = String(text).replace(/\D/g, "").length >= 4;
      score.className = "hades-score is-visible";
      if (point.strong) score.classList.add("is-strong");
      if (isBigScore) score.classList.add("is-big");
      score.dataset.text = text;
      setPoint(score, scorePoint);
      score.style.left = `${scorePoint.x}%`;
      score.style.top = `${scorePoint.y}%`;
      setBitmapText(score, text, isBigScore ? (point.bigScoreScale || .68) : (point.scoreScale || (point.strong ? .6 : .66)), { opening: true });
      scoreGatherLayer.append(score);

      const echo = score.cloneNode(true);
      echo.classList.remove("is-visible", "is-gathering");
      echo.classList.add("hades-score-echo");
      scoreGatherLayer.append(echo);
      window.setTimeout(() => echo.remove(), 430);
      return score;
    }

function triggerHadesClawStrike(point, runId) {
      const { x, y } = stagePointToClawCanvas(point);
      const strong = Boolean(point.strong);
      const lineOffsets = point.clawLineOffsets || (strong ? [82, 0, -82] : [64, 0, -64]);
      const particleCount = point.particleCount ?? (strong ? 42 : 28);

      clawSlashes.push(new HadesSlash(x, y, strong, lineOffsets, {
        lengthScale: point.clawLengthScale || 1,
        thicknessScale: point.clawThicknessScale || 1,
      }));
      for (let index = 0; index < particleCount; index += 1) {
        clawParticles.push(new HadesClawParticle(x, y, strong));
      }
      startClawRenderer();
      playGotchaIntroSound({ overlap: true });

      if (strong) {
        stage.classList.remove("stage--claw-shake");
        void stage.offsetWidth;
        stage.classList.add("stage--claw-shake");
        window.setTimeout(() => stage.classList.remove("stage--claw-shake"), 220);
      }

      if (runId === sequenceId) {
        const scores = point.scores || [point.text || "860"];
        const scoreDelay = point.scoreDelay ?? 0;
        const scoreStagger = point.scoreStagger ?? 118;
        scores.forEach((scoreText, index) => {
          window.setTimeout(() => {
            if (runId === sequenceId) {
              createHadesScore(point, scoreText, index, scores.length);
              playGotchaHitLargeSound();
            }
          }, scoreDelay + index * scoreStagger);
        });
      }
    }

function createMermaidScore(point) {
      const score = document.createElement("div");
      const isStrong = Boolean(point.strong);
      score.className = "mermaid-score is-visible";
      if (isStrong) score.classList.add("is-strong");
      if (point.isGold) score.classList.add("is-gold");
      score.dataset.text = point.score || "";
      setPoint(score, { x: point.scoreX ?? point.x, y: point.scoreY ?? point.y });
      setBitmapText(score, point.score || "0", isStrong ? (point.bigScoreScale || .76) : (point.scoreScale || .58), { opening: true });
      scoreGatherLayer.append(score);
      return score;
    }

function popMermaidBubble(bubble, point, runId) {
      if (runId !== sequenceId || bubble.isPopped || bubble.openedAt) return;
      bubble.openedAt = performance.now();
      bubble.hasScore = Boolean(point.score);

      for (let index = 0; index < (point.dropCount || 16); index += 1) {
        mermaidDrops.push(new MermaidDrop(bubble.x, bubble.y, bubble.radius, point.isGold));
      }

      if (point.score) {
        createMermaidScore(point);
      }
      playGotchaHitLargeSound();
      startBubbleRenderer();
    }

function spawnMermaidBubble(point) {
      const bubble = new MermaidBubble(point);
      mermaidBubbles.push(bubble);
      startBubbleRenderer();
      return bubble;
    }

function clampNumber(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

function pickRandomItem(items, fallback) {
      if (!Array.isArray(items) || !items.length) return fallback;
      return items[Math.floor(Math.random() * items.length)];
    }

function pickWeightedEntry(entries, fallback) {
      const validEntries = entries.filter((entry) => Number(entry.weight) > 0);
      const totalWeight = validEntries.reduce((total, entry) => total + Number(entry.weight), 0);
      if (!totalWeight) return fallback;

      let cursor = Math.random() * totalWeight;
      for (const entry of validEntries) {
        cursor -= Number(entry.weight);
        if (cursor <= 0) return entry;
      }

      return validEntries[validEntries.length - 1] || fallback;
    }

function createIndexSet(count, targetCount, avoidEdges = true) {
      const candidates = [];
      const start = avoidEdges ? 2 : 0;
      const end = avoidEdges ? count - 2 : count;
      for (let index = start; index < end; index += 1) {
        candidates.push(index);
      }

      for (let index = candidates.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
      }

      return new Set(candidates.slice(0, Math.min(targetCount, candidates.length)));
    }

function shuffleList(items) {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
      }
      return items;
    }

function buildMermaidBubblePoints(settings) {
      const count = settings.bubbleCount || 10;
      const goldTarget = Math.min(
        count,
        Math.max(settings.bubbleGoldMin ?? 0, Math.round(count * (settings.bubbleGoldChance ?? .16)))
      );
      const goldIndices = createIndexSet(count, goldTarget, false);
      const scoreIndices = new Set();
      const interval = settings.bubbleSpawnInterval ?? 105;
      const jitter = settings.bubbleSpawnJitter ?? 45;
      const bubbleLayout = [
        { x: 14, y: 72, explodeOrder: 0 },
        { x: 27, y: 48, explodeOrder: 1 },
        { x: 14, y: 24, explodeOrder: 2 },
        { x: 86, y: 24, explodeOrder: 3 },
        { x: 73, y: 48, explodeOrder: 4 },
        { x: 86, y: 72, explodeOrder: 5 },
      ];

      for (let index = 0; index < count; index += 1) {
        const isGold = goldIndices.has(index);
        if (!isGold || Math.random() < (settings.bubbleGoldScoreChance ?? .72)) {
          scoreIndices.add(index);
        }
      }

      return Array.from({ length: count }, (_, index) => {
        const isGold = goldIndices.has(index);
        const hasScore = scoreIndices.has(index);
        const layout = bubbleLayout[index % bubbleLayout.length];
        const x = clampNumber(layout.x, 5, 95);
        const y = clampNumber(layout.y - (isGold ? 1.2 : 0), 7, 81);
        const radius = isGold
          ? 124 + Math.random() * 8
          : 112 + Math.random() * 8;
        const spawnTime = isGold ? 320 : 260;
        const score = hasScore
          ? pickRandomItem(isGold ? settings.bubbleGoldScores : settings.bubbleScores, isGold ? "3860" : "680")
          : "";

        return {
          x,
          y,
          score,
          isGold,
          shouldPop: true,
          radius,
          spawnTime,
          delay: index * interval + Math.random() * jitter,
          explodeOrder: layout.explodeOrder,
          scoreScale: isGold ? .68 : .58,
          bigScoreScale: isGold ? .8 : .68,
          dropCount: isGold ? 24 : 14,
          strong: isGold && hasScore,
        };
      });
    }

function createLightningScore(point) {
      const score = document.createElement("div");
      const scoreX = Number(point.scoreX ?? point.x);
      const scoreY = Number(point.scoreY ?? point.y);
      const scorePoint = {
        x: Number.isFinite(scoreX) ? scoreX : 50,
        y: Number.isFinite(scoreY) ? scoreY - (point.strong ? 6.5 : 5.5) : 50,
      };

      score.className = "lightning-score is-visible";
      if (point.strong) score.classList.add("is-strong");
      setPoint(score, scorePoint);
      score.dataset.text = point.text || "";
      setBitmapText(score, point.text || "x0", point.textScale || (point.strong ? .82 : .7), { opening: true });
      scoreGatherLayer.append(score);
      return score;
    }

function createLightningStrikeFlash(point, strong = false) {
      const flash = document.createElement("div");
      flash.className = "lightning-strike-flash";
      if (strong) flash.classList.add("is-strong");
      setPoint(flash, point);
      scoreGatherLayer.append(flash);
      window.setTimeout(() => flash.remove(), 380);
    }

function triggerLightningStrike(point, runId) {
      const { x, y } = stagePointToCanvas(point);
      const strong = Boolean(point.strong);
      const boltCount = strong ? 3 : 2;
      const particleCount = strong ? 38 : 24;
      const scoreDigits = String(point.text || "").replace(/\D/g, "").length;
      const shouldShake = scoreDigits >= 4;

      if (shouldShake) {
        stage.classList.remove("stage--lightning-shake");
        void stage.offsetWidth;
        stage.classList.add("stage--lightning-shake");
        window.setTimeout(() => stage.classList.remove("stage--lightning-shake"), strong ? 240 : 180);
      }

      lightningCircles.push(new LightningMagicCircle(x, y, strong));
      if (point.localFlash) {
        createLightningStrikeFlash(point, strong);
      }

      for (let index = 0; index < boltCount; index += 1) {
        const spread = strong ? 420 : 300;
        const startX = x + (Math.random() - .5) * spread;
        lightningBolts.push(new LightningBolt(startX, -lightningCanvasHeight * .26, x, y, strong));
      }

      for (let index = 0; index < particleCount; index += 1) {
        lightningParticles.push(new LightningSpark(x, y, strong));
      }

      if (runId === sequenceId) {
        createLightningScore(point);
      }

      playGotchaHitLargeSound();
    }

function updateCharacterButtons() {
      characterButtons.forEach((button) => {
        const isActive = button.dataset.characterKey === activeCharacterKey;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

function setActiveCharacter(characterKey, shouldReplay = false) {
      if (!config.characters[characterKey]) return;

      activeCharacterKey = characterKey;
      activeCharacter = config.characters[activeCharacterKey];
      idleBossImage = activeCharacter.idleImage;
      config.activeCharacter = activeCharacterKey;
      updateCharacterButtons();
      applyCharacterSetup();

      if (shouldReplay) {
        playPerformance();
      }
    }

function applyCharacterSetup() {
      const style = activeCharacter.style || {};
      const entrance = activeCharacter.entrance || {};

      stage.dataset.character = activeCharacterKey;
      boss.dataset.character = activeCharacterKey;
      boss.className = `boss boss--${activeCharacterKey}`;
      boss.style.setProperty("--boss-x", style.x || "48%");
      boss.style.setProperty("--boss-y", style.y || "47%");
      boss.style.setProperty("--boss-width", style.width || "min(38vw, 430px)");
      boss.style.setProperty("--boss-aspect", style.aspect || "1 / 1");
      boss.style.setProperty("--boss-image-origin", style.imageOrigin || "center 62%");
      boss.style.setProperty("--boss-drop-duration", `${entrance.dropDuration || 560}ms`);
      boss.style.setProperty("--boss-image-url", `url("${idleBossImage.replace(/"/g, '\\"')}")`);
      stage.style.setProperty("--boss-impact-x", style.impactX || "50%");
      stage.style.setProperty("--boss-impact-y", style.impactY || "52%");
      bossImage.src = idleBossImage;
    }

function cleanPrize(value) {
      const digits = String(value).replace(/\D/g, "").slice(0, 8);
      return digits || "0";
    }

    function openingDigit(index) {
      return String((index + 1 + Math.floor(Math.random() * 9)) % 10);
    }

    function digitScale() {
      const width = stage.clientWidth || 1120;
      return Math.min(1.1, Math.max(.58, width / 1500));
    }

    function setSlotDigit(slot, digit) {
      const glyph = bitmapFont.chars[digit] || bitmapFont.chars[0];
      const scale = digitScale();
      let glyphNode = slot.querySelector(".bitmap-digit");

      if (!glyphNode) {
        glyphNode = document.createElement("span");
        glyphNode.className = "bitmap-digit";
        slot.replaceChildren(glyphNode);
      }

      slot.dataset.value = digit;
      slot.setAttribute("aria-label", digit);
      glyphNode.style.width = `${glyph.width * scale}px`;
      glyphNode.style.height = `${glyph.height * scale}px`;
      glyphNode.style.backgroundImage = `url("${bitmapFont.image}")`;
      glyphNode.style.backgroundSize = `${bitmapFont.width * scale}px ${bitmapFont.height * scale}px`;
      glyphNode.style.backgroundPosition = `${-glyph.x * scale}px ${-glyph.y * scale}px`;
    }

    function openingTextValue(text) {
      const value = Number(String(text || "").replace(/[^\d.]/g, ""));
      return Number.isFinite(value) ? value : 0;
    }

    function bitmapFontForText(text, options = {}) {
      if (!options.opening || !highOpenBitmapFont) return bitmapFont;
      const rawText = String(text || "").toLowerCase();
      const threshold = rawText.includes("x")
        ? (config.highOpenBitmapFont.multiplierMin ?? 100)
        : (config.highOpenBitmapFont.scoreMin ?? 3000);
      return openingTextValue(text) >= threshold ? highOpenBitmapFont : bitmapFont;
    }

    function setBitmapText(container, text, scaleMultiplier = .46, options = {}) {
      const font = options.font || bitmapFontForText(text, options);
      const scaleBoost = font === highOpenBitmapFont
        ? (config.highOpenBitmapFont.scaleBoost ?? 1)
        : 1;
      const scale = digitScale() * scaleMultiplier * scaleBoost;
      container.replaceChildren();

      [...String(text)].forEach((character) => {
        const glyph = font.chars[character] || font.chars[0];
        const glyphNode = document.createElement("span");
        glyphNode.className = "bitmap-symbol";
        glyphNode.style.width = `${glyph.width * scale}px`;
        glyphNode.style.height = `${glyph.height * scale}px`;
        glyphNode.style.backgroundImage = `url("${font.image}")`;
        glyphNode.style.backgroundSize = `${font.width * scale}px ${font.height * scale}px`;
        glyphNode.style.backgroundPosition = `${-glyph.x * scale}px ${-glyph.y * scale}px`;
        container.append(glyphNode);
      });
    }

    function buildSlots(count) {
      prizeRow.replaceChildren();

      for (let index = 0; index < count; index += 1) {
        const slot = document.createElement("div");
        slot.className = "digit-slot";
        slot.dataset.index = String(index);
        slot.dataset.stopped = "false";
        setSlotDigit(slot, openingDigit(index));
        prizeRow.append(slot);
      }
    }

    function clearOrbShow() {
      stopChargeSound();
      ballLayer.replaceChildren();
      scoreGatherLayer.replaceChildren();
      clearLightningShow();
      clearClawShow();
      clearBubbleShow();
    }

    function setPoint(element, point) {
      element.style.setProperty("--x", `${point.x}%`);
      element.style.setProperty("--y", `${point.y}%`);
    }

    function createDropEffect(point) {
      const effect = document.createElement("div");
      effect.className = "drop-effect";
      setPoint(effect, point);
      effect.style.setProperty("--orb-z", point.depth || 10);
      ballLayer.append(effect);
      return effect;
    }

    function createImpact(point, tone = "normal") {
      const ring = document.createElement("div");
      ring.className = "drop-impact";
      if (tone === "gold") {
        ring.classList.add("is-gold");
      } else if (tone === "red") {
        ring.classList.add("is-red");
      }
      setPoint(ring, point);
      ring.style.setProperty("--orb-z", Math.max(0, (point.depth || 10) - 1));
      ballLayer.append(ring);
      window.setTimeout(() => ring.remove(), tone === "gold" ? 640 : tone === "red" ? 560 : 480);
    }

    function multiplierValue(multiplier) {
      const value = Number(String(multiplier || "").replace(/[^\d.]/g, ""));
      return Number.isFinite(value) ? value : 0;
    }

    function ballToneForMultiplier(multiplier) {
      const value = multiplierValue(multiplier);
      if (value >= 100) return "gold";
      if (value > 20) return "red";
      return "purple";
    }

    function randomOrbMultiplier() {
      const weights = orbMultiplierPools.weights || {};
      const toneEntry = pickWeightedEntry([
        { tone: "purple", weight: weights.purple ?? 68 },
        { tone: "red", weight: weights.red ?? 22 },
        { tone: "gold", weight: weights.gold ?? 10 },
      ], { tone: "purple" });

      const fallback = toneEntry.tone === "gold" ? "x100" : toneEntry.tone === "red" ? "x25" : "x2";
      return pickRandomItem(orbMultiplierPools[toneEntry.tone], fallback);
    }

    function orbTextScaleForMultiplier(multiplier) {
      const value = multiplierValue(multiplier);
      if (value >= 100) return .56;
      if (value > 20) return .66;
      return .72;
    }

    function normalizeOrbDrop(point) {
      const multiplier = randomOrbMultiplier();
      const ball = ballToneForMultiplier(multiplier);
      const toneTiming = {
        purple: {
          revealDelay: 110,
          afterRevealHold: 120,
          nextDelay: 115,
        },
        red: {
          revealCharge: 1540,
          chargePeak: 520,
          impactHold: 230,
          afterRevealHold: 330,
          nextDelay: 270,
        },
        gold: {
          revealCharge: 1540,
          chargePeak: 520,
          impactHold: 230,
          afterRevealHold: 330,
          nextDelay: 270,
        },
      }[ball];

      return {
        ...point,
        ...toneTiming,
        ball,
        multiplier,
        textScale: orbTextScaleForMultiplier(multiplier),
      };
    }

    function createBall(point) {
      const ball = document.createElement("div");
      const image = document.createElement("img");
      const multiplier = document.createElement("span");

      ball.className = "gacha-ball";
      setPoint(ball, point);
      ball.style.setProperty("--orb-z", point.depth || 10);
      ball.style.setProperty("--float-y", point.floatY || "-4%");
      ball.style.setProperty("--float-time", `${point.floatTime || 1900}ms`);
      ball.style.setProperty("--float-delay", `${point.floatDelay || 0}ms`);
      image.src = ballAssets.purple;
      image.alt = "";
      multiplier.className = "multiplier";
      setBitmapText(multiplier, point.multiplier, point.textScale || .62, { opening: true });
      ball.append(image, multiplier);
      ballLayer.append(ball);
      return ball;
    }

    function startBallChargeAura(ball, tone) {
      const aura = document.createElement("div");
      const canvas = document.createElement("canvas");
      const core = document.createElement("span");
      const ctx = canvas.getContext("2d");
      const isGold = tone === "gold" || tone === "red";
      const particleCount = isGold ? 42 : 34;
      const colors = isGold
        ? ["#ffffff", "#fff3a8", "#ffd84c", "#ffae23", "#fff8d8"]
        : ["#ffffff", "#ffd2c2", "#ff6b3d", "#ff2f2f", "#ff9a74"];
      let width = 1;
      let height = 1;
      let centerX = 0;
      let centerY = 0;
      let radius = 1;
      let frameId = 0;
      let active = true;
      let intensity = 1;
      let targetIntensity = 1;

      aura.className = "charge-aura";
      core.className = "charge-core";
      aura.append(canvas, core);
      ball.append(aura);

      function resizeAura() {
        width = isGold ? 246 : 230;
        height = isGold ? 246 : 230;
        canvas.width = width;
        canvas.height = height;
        centerX = width / 2;
        centerY = height / 2;
        radius = Math.min(width, height) * (isGold ? .27 : .28);
      }

      function makeParticle(initFar = false) {
        const angle = Math.random() * Math.PI * 2;
        const start = radius * (initFar ? (.48 + Math.random() * .72) : (.92 + Math.random() * .4));
        return {
          angle,
          distance: start,
          speed: (isGold ? 1.75 : 1.45) + Math.random() * (isGold ? 2.65 : 1.75),
          length: (isGold ? 8 : 6) + Math.random() * (isGold ? 14 : 9),
          width: (isGold ? .58 : .5) + Math.random() * (isGold ? .72 : .48),
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      }

      const particles = Array.from({ length: particleCount }, () => makeParticle(true));

      function resetParticle(particle) {
        Object.assign(particle, makeParticle(false));
      }

      function drawParticle(particle) {
        particle.distance -= particle.speed * intensity;
        if (particle.distance < radius * .32) {
          particle.speed += (isGold ? .28 : .2) * intensity;
        }
        if (particle.distance <= 5) {
          resetParticle(particle);
        }

        const startX = centerX + Math.cos(particle.angle) * particle.distance;
        const startY = centerY + Math.sin(particle.angle) * particle.distance;
        const endDistance = particle.distance + particle.length;
        const endX = centerX + Math.cos(particle.angle) * endDistance;
        const endY = centerY + Math.sin(particle.angle) * endDistance;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = particle.width;
        ctx.strokeStyle = particle.color;
        ctx.shadowBlur = isGold ? 5 : 4;
        ctx.shadowColor = particle.color;
        ctx.stroke();
      }

      function animateAura() {
        if (!active || !aura.isConnected) return;
        intensity += (targetIntensity - intensity) * .16;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "screen";
        particles.forEach(drawParticle);
        ctx.globalCompositeOperation = "source-over";
        frameId = requestAnimationFrame(animateAura);
      }

      resizeAura();
      animateAura();

      return {
        setPeak(isPeak) {
          targetIntensity = isPeak ? (isGold ? 2.35 : 1.8) : .86;
        },
        stop() {
          active = false;
          cancelAnimationFrame(frameId);
          aura.remove();
        },
      };
    }

    async function revealBall(ball, point, runId) {
      const image = ball.querySelector("img");
      const isMysteryColor = point.ball !== "purple";
      const chargeTone = point.ball === "red" ? "gold" : point.ball;

      if (isMysteryColor) {
        ball.classList.add("is-charging", `charge-${chargeTone}`);
        ball.style.setProperty("--charge-duration", `${point.revealCharge || 300}ms`);
        const chargeAura = startBallChargeAura(ball, point.ball);
        const chargeTime = point.revealCharge || 300;
        const hasAcceleratedCharge = point.ball === "gold";
        const peakTime = hasAcceleratedCharge ? Math.min(point.chargePeak || 360, chargeTime) : 0;
        const warmupTime = Math.max(0, chargeTime - peakTime);
        playChargeSound(1);

        await sleep(warmupTime);
        if (runId !== sequenceId) {
          chargeAura.stop();
          stopChargeSound();
          return;
        }

        if (hasAcceleratedCharge) {
          ball.classList.add("is-charge-peak", "is-charge-accelerated");
          chargeAura.setPeak(true);
          setChargeSoundRate(2.25, 180);
          await sleep(peakTime);
        }
        chargeAura.stop();
        stopChargeSound();
        if (runId !== sequenceId) return;

        image.src = ballAssets[point.ball];
        if (point.ball === "gold") {
          ball.classList.add("is-premium");
        } else if (point.ball === "red") {
          ball.classList.add("is-mid");
        }
        ball.classList.remove("is-charging", "is-charge-peak", "is-charge-accelerated", `charge-${chargeTone}`);
        ball.style.removeProperty("--charge-duration");
        createImpact(point, point.ball);
      } else {
        await sleep(point.revealDelay || 55);
        if (runId !== sequenceId) return;
      }

      playGotchaHitLargeSound();
      if (point.ball === "gold") {
        triggerOrbShake();
      }
      ball.classList.add("is-revealed");
    }

    function triggerOrbShake() {
      stage.classList.remove("stage--orb-shake");
      void stage.offsetWidth;
      stage.classList.add("stage--orb-shake");
      window.setTimeout(() => stage.classList.remove("stage--orb-shake"), 190);
    }

    async function dropBall(point, runId) {
      const dropEffect = createDropEffect(point);
      playGotchaIntroSound();
      await sleep(point.anticipation || 36);
      if (runId !== sequenceId) return;

      const ball = createBall(point);
      void ball.offsetWidth;
      ball.classList.add("is-dropping");

      await sleep(point.dropTime || 200);
      if (runId !== sequenceId) return;
      ball.classList.remove("is-dropping");
      ball.classList.add("is-landed");
      dropEffect.classList.add("is-fading");
      createImpact(point);

      await sleep(point.impactHold || 110);
      dropEffect.remove();
      if (runId !== sequenceId) return;

      await revealBall(ball, point, runId);
      if (runId !== sequenceId) return;
      ball.classList.add("is-floating");
      await sleep(point.afterRevealHold || point.settleTime || 55);
    }

    async function playOrbDrops(runId) {
      clearOrbShow();

      for (const dropPoint of orbDrops) {
        const point = normalizeOrbDrop(dropPoint);
        await dropBall(point, runId);
        if (runId !== sequenceId) return;
        await sleep(point.nextDelay || 72);
      }
    }

    async function playLightningShow(runId) {
      clearOrbShow();
      startLightningRenderer();
      const strikes = activeCharacter.lightningStrikes || orbDrops.map((point) => ({
        x: point.x,
        y: point.y,
        text: point.multiplier,
      }));

      for (const strike of strikes) {
        if (typeof strike.optionalChance === "number" && Math.random() >= strike.optionalChance) {
          continue;
        }

        if (strike.pause) {
          await sleep(strike.pause);
          if (runId !== sequenceId) return;
          continue;
        }

        await sleep(strike.delay ?? 90);
        if (runId !== sequenceId) return;
        triggerLightningStrike(strike, runId);
        await sleep(strike.hold ?? 260);
        if (runId !== sequenceId) return;
      }

      await sleep(activeCharacter.lightningAfterHold ?? 720);
      if (runId !== sequenceId) return;
      await gatherLightningScores(runId);
    }

    async function playHadesClawShow(runId) {
      clearOrbShow();
      stage.classList.add("stage--hades-dark");
      await sleep(activeCharacter.clawIntroHold ?? 220);
      if (runId !== sequenceId) return;

      const strikes = activeCharacter.clawStrikes || [
        { x: 50, y: 54, scores: ["860", "1240", "1680"], delay: 120, hold: 420, strong: true },
      ];
      const strikesToPlay = strikes.filter((strike) => (
        typeof strike.optionalChance !== "number" || Math.random() < strike.optionalChance
      ));
      let brightPeekActive = false;
      let skipDelayForStrike = -1;

      for (let index = 0; index < strikesToPlay.length; index += 1) {
        const strike = strikesToPlay[index];
        if (skipDelayForStrike === index) {
          skipDelayForStrike = -1;
        } else {
          await sleep(strike.delay ?? 120);
          if (runId !== sequenceId) return;
        }
        if (strike.preBrighten) {
          if (!brightPeekActive) {
            stage.classList.add("stage--hades-bright-peek");
            brightPeekActive = true;
            await sleep(strike.preBrighten);
            if (runId !== sequenceId) return;
          }
          stage.classList.remove("stage--hades-bright-peek");
          brightPeekActive = false;
          const darkenHold = strike.preDarken ?? activeCharacter.secondClawDarkenHold ?? 0;
          if (darkenHold > 0) {
            await sleep(darkenHold);
            if (runId !== sequenceId) return;
          }
        }
        triggerHadesClawStrike(strike, runId);
        await sleep(strike.hold ?? 420);
        if (runId !== sequenceId) return;

        if (index === 0) {
          brightPeekActive = true;
          if (strikesToPlay.length > 1) {
            const nextStrike = strikesToPlay[index + 1];
            const brightenHold = activeCharacter.firstClawBrightenHold ?? 260;
            const nextDelay = nextStrike?.delay ?? 120;
            await sleep(Math.max(0, nextDelay - brightenHold));
            if (runId !== sequenceId) return;
            stage.classList.add("stage--hades-bright-peek");
            await sleep(brightenHold);
            if (runId !== sequenceId) return;
            skipDelayForStrike = index + 1;
          } else {
            stage.classList.add("stage--hades-clear");
            await sleep(activeCharacter.firstClawClearHold ?? 520);
            if (runId !== sequenceId) return;
          }
        }
      }

      await sleep(strikesToPlay.length > 1 ? (activeCharacter.clawAfterHold ?? 760) : 0);
      if (runId !== sequenceId) return;
      await gatherHadesScores(runId);
      stage.classList.remove("stage--hades-bright-peek", "stage--hades-clear", "stage--hades-dark");
    }

    async function playMermaidBubbleShow(runId) {
      clearOrbShow();
      stage.classList.add("stage--mermaid-water");
      playGotchaIntroSound();
      await sleep(activeCharacter.bubbleIntroHold ?? 220);
      if (runId !== sequenceId) return;

      const bubblePops = activeCharacter.bubbleCount ? buildMermaidBubblePoints(activeCharacter) : (activeCharacter.bubblePops || [
        { x: 35, y: 55, score: "520", delay: 80, riseTime: 680, radius: 64 },
        { x: 50, y: 45, score: "1280", delay: 120, riseTime: 760, radius: 76 },
        { x: 65, y: 58, score: "2460", delay: 160, riseTime: 820, radius: 82, strong: true },
      ]);

      const bubbleStartTime = performance.now();
      const spawnedBubbles = new Array(bubblePops.length);
      let nextDelay = 0;
      let latestArrival = 0;
      const bubbleTasks = bubblePops.map((point, index) => {
        if (activeCharacter.bubbleCount) {
          nextDelay = point.delay ?? nextDelay;
        } else {
          nextDelay += point.delay ?? 120;
        }
        const startDelay = nextDelay;
        latestArrival = Math.max(latestArrival, startDelay + (point.spawnTime || 260));
        return (async () => {
          await sleep(startDelay);
          if (runId !== sequenceId) return;
          spawnedBubbles[index] = {
            bubble: spawnMermaidBubble(point),
            point,
          };
        })();
      });

      await Promise.all(bubbleTasks);
      if (runId !== sequenceId) return;

      const elapsed = performance.now() - bubbleStartTime;
      await sleep(Math.max(0, latestArrival - elapsed) + (activeCharacter.bubbleSettleHold ?? 260));
      if (runId !== sequenceId) return;

      const popQueue = spawnedBubbles
        .filter(Boolean)
        .sort((first, second) => {
          if (first.point.isGold !== second.point.isGold) {
            return first.point.isGold ? 1 : -1;
          }
          const firstOrder = first.point.explodeOrder ?? first.point.x;
          const secondOrder = second.point.explodeOrder ?? second.point.x;
          return firstOrder - secondOrder;
        });

      let goldStarted = false;
      for (const item of popQueue) {
        if (runId !== sequenceId) return;
        if (item.point.isGold && !goldStarted) {
          goldStarted = true;
          await sleep(activeCharacter.bubbleGoldGroupHold ?? 480);
          if (runId !== sequenceId) return;
        }

        if (item.point.isGold) {
          await sleep(activeCharacter.bubbleGoldPrePopHold ?? 240);
          if (runId !== sequenceId) return;
        }

        if (item.point.shouldPop !== false) {
          popMermaidBubble(item.bubble, item.point, runId);
        }
        await sleep(item.point.isGold
          ? (activeCharacter.bubbleGoldPopStagger ?? 250)
          : (activeCharacter.bubblePopStagger ?? 150));
      }

      await sleep(activeCharacter.bubbleAfterHold ?? 760);
      if (runId !== sequenceId) return;
      await gatherMermaidScores(runId);
      stage.classList.remove("stage--mermaid-water");
    }

    async function gatherLightningScores(runId) {
      const scores = [...scoreGatherLayer.querySelectorAll(".lightning-score")];

      scores.forEach((score) => {
        score.classList.add("is-gathering");
      });

      await sleep(760);
      if (runId !== sequenceId) return;
      scores.forEach((score) => score.remove());
      clearBubbleShow();
    }

    async function gatherHadesScores(runId) {
      const scores = [...scoreGatherLayer.querySelectorAll(".hades-score")];

      scores.forEach((score) => {
        score.classList.add("is-gathering");
      });

      await sleep(760);
      if (runId !== sequenceId) return;
      scores.forEach((score) => score.remove());
    }

    async function gatherMermaidScores(runId) {
      const scores = [...scoreGatherLayer.querySelectorAll(".mermaid-score")];

      scores.forEach((score) => {
        score.classList.add("is-gathering");
      });

      await sleep(760);
      if (runId !== sequenceId) return;
      scores.forEach((score) => score.remove());
    }

    async function gatherOrbScores(runId) {
      const balls = [...ballLayer.querySelectorAll(".gacha-ball")];

      orbDrops.forEach((point) => {
        const chip = document.createElement("div");
        chip.className = "score-chip";
        setPoint(chip, point);
        setBitmapText(chip, point.multiplier, .56, { opening: true });
        scoreGatherLayer.append(chip);
        void chip.offsetWidth;
        chip.classList.add("is-gathering");
      });

      balls.forEach((ball) => {
        ball.classList.remove("is-landed", "is-floating");
        ball.classList.add("is-collecting");
      });

      await sleep(760);
      if (runId !== sequenceId) return;
      clearOrbShow();
    }

    async function showFinalScoreRolling(prize, runId) {
      const targetScore = Number(prize);
      const rollDuration = 2400;
      const rollStep = targetScore >= 100 ? 100 : 1;
      const digitCount = prize.length;

      function paintScore(value, isFinal = false) {
        const visibleText = String(value);
        const scoreText = visibleText.padStart(digitCount, "0").slice(-digitCount);
        const hiddenCount = Math.max(0, digitCount - visibleText.length);

        getSlots().forEach((slot, index) => {
          slot.dataset.stopped = isFinal ? "true" : "false";
          slot.classList.remove("is-locked", "is-hidden-digit");
          setSlotDigit(slot, scoreText[index]);
          slot.classList.add("is-filled");

          if (!isFinal && index < hiddenCount) {
            slot.classList.add("is-hidden-digit");
          }

          if (isFinal) {
            slot.classList.add("is-locked");
          } else {
            slot.classList.remove("is-locked");
          }

          freezeSlotMotion(slot);
        });
      }

      buildSlots(digitCount);
      paintScore(0);
      stage.classList.add("stage--result-ready");
      playGotchaSound();

      await new Promise((resolve) => {
        const startTime = performance.now();

        function tick(now) {
          if (runId !== sequenceId) {
            resolve();
            return;
          }

          const progress = Math.min(1, (now - startTime) / rollDuration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const rawScore = Math.floor(targetScore * eased);
          const rollingScore = progress >= 1 ? targetScore : Math.floor(rawScore / rollStep) * rollStep;
          paintScore(Math.min(targetScore, rollingScore));

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        }

        requestAnimationFrame(tick);
      });

      if (runId !== sequenceId) return;
      paintScore(targetScore, true);
      await sleep(140);
      if (runId !== sequenceId) return;
    }

    function stopGotchaSound() {
      gotchaSound.pause();
      gotchaSound.currentTime = 0;
      restoreBackgroundMusic();
    }

    function stopGotchaIntroSound() {
      gotchaIntroSound.pause();
      gotchaIntroSound.currentTime = 0;
      activeIntroSounds.forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      activeIntroSounds.clear();
    }

    function stopGotchaHitLargeSound() {
      gotchaHitLargeSound.pause();
      gotchaHitLargeSound.currentTime = 0;
      activeHitLargeSounds.forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      activeHitLargeSounds.clear();
    }

    function playChargeSound(rate = 1) {
      stopChargeSound();
      chargeSound.playbackRate = rate;
      chargeSound.currentTime = 0;
      const playPromise = chargeSound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
        });
      }
    }

    function setChargeSoundRate(rate, rampMs = 0) {
      if (chargeRateFrame) {
        cancelAnimationFrame(chargeRateFrame);
        chargeRateFrame = 0;
      }

      if (!rampMs) {
        chargeSound.playbackRate = rate;
        return;
      }

      const startRate = chargeSound.playbackRate || 1;
      const startTime = performance.now();
      const ramp = (now) => {
        if (chargeSound.paused) {
          chargeRateFrame = 0;
          return;
        }

        const progress = Math.min(1, (now - startTime) / rampMs);
        const eased = progress * progress * (3 - 2 * progress);
        chargeSound.playbackRate = startRate + (rate - startRate) * eased;
        if (progress < 1) {
          chargeRateFrame = requestAnimationFrame(ramp);
        } else {
          chargeRateFrame = 0;
        }
      };
      chargeRateFrame = requestAnimationFrame(ramp);
    }

    function stopChargeSound() {
      if (chargeRateFrame) {
        cancelAnimationFrame(chargeRateFrame);
        chargeRateFrame = 0;
      }
      chargeSound.pause();
      chargeSound.currentTime = 0;
      chargeSound.playbackRate = 1;
    }

    function playGotchaIntroSound(options = {}) {
      if (options.overlap) {
        const sound = gotchaIntroSound.cloneNode();
        sound.preload = "auto";
        activeIntroSounds.add(sound);
        sound.addEventListener("ended", () => activeIntroSounds.delete(sound), { once: true });
        const playPromise = sound.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Browsers may block sound before the first user gesture.
            activeIntroSounds.delete(sound);
          });
        }
        return;
      }

      stopGotchaIntroSound();
      const playPromise = gotchaIntroSound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
        });
      }
    }

    function playGotchaHitLargeSound() {
      const sound = gotchaHitLargeSound.cloneNode();
      sound.preload = "auto";
      activeHitLargeSounds.add(sound);
      sound.addEventListener("ended", () => activeHitLargeSounds.delete(sound), { once: true });
      const playPromise = sound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
          activeHitLargeSounds.delete(sound);
        });
      }
    }

    function playGotchaSound() {
      stopGotchaSound();
      duckBackgroundMusic();
      const playPromise = gotchaSound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
          restoreBackgroundMusic();
        });
      }
    }

    function playBackgroundMusic() {
      bgmSound.volume = bgmNormalVolume;
      const playPromise = bgmSound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
        });
      }
    }

    function duckBackgroundMusic() {
      bgmSound.volume = bgmDuckedVolume;
    }

    function restoreBackgroundMusic() {
      bgmSound.volume = bgmNormalVolume;
    }

    gotchaSound.addEventListener("ended", restoreBackgroundMusic);

    function resetStage(prize) {
      stopGotchaSound();
      stopGotchaIntroSound();
      stopGotchaHitLargeSound();
      stopChargeSound();
      clearOrbShow();
      stage.className = "stage";
      applyCharacterSetup();
      buildSlots(prize.length);
    }

    function getSlots() {
      return [...prizeRow.querySelectorAll(".digit-slot")];
    }

    function freezeSlotMotion(slot) {
      slot.style.animation = "none";
      slot.style.transform = "scale(1)";
      const glyphNode = slot.querySelector(".bitmap-digit");
      if (glyphNode) {
        glyphNode.style.animation = "none";
        glyphNode.style.transform = "";
      }
    }

    async function playBossEntrance(runId) {
      const entrance = activeCharacter.entrance || {};
      const dropDuration = entrance.dropDuration || 560;
      const landHold = entrance.landHold ?? 260;
      const hitDuration = entrance.hitDuration || 420;
      const isSlam = entrance.type === "slam";

      stage.classList.remove("stage--flash", "stage--hit");
      bossImage.src = idleBossImage;
      stage.classList.add("stage--drop");

      await sleep(dropDuration);
      if (runId !== sequenceId) return;
      stage.classList.remove("stage--drop");
      stage.classList.add("stage--landed");

      if (isSlam) {
        stage.classList.add("stage--hit");
        window.setTimeout(() => stage.classList.remove("stage--hit"), hitDuration);
      }

      await sleep(landHold);
    }

    async function playPerformance() {
      const runId = sequenceId + 1;
      sequenceId = runId;
      const prize = cleanPrize(prizeInput.value);
      prizeInput.value = prize;
      resetStage(prize);
      playBackgroundMusic();
      playButton.disabled = true;

      await sleep(420);
      if (runId !== sequenceId) return;
      stage.classList.add("stage--scene", "stage--flash");

      await sleep(180);
      if (runId !== sequenceId) return;
      await playBossEntrance(runId);
      if (runId !== sequenceId) return;

      if (activeCharacter.performance === "lightning") {
        await playLightningShow(runId);
        if (runId !== sequenceId) return;
      } else if (activeCharacter.performance === "claws") {
        await playHadesClawShow(runId);
        if (runId !== sequenceId) return;
      } else if (activeCharacter.performance === "bubbles") {
        await playMermaidBubbleShow(runId);
        if (runId !== sequenceId) return;
      } else {
        await playOrbDrops(runId);
        if (runId !== sequenceId) return;
        await sleep(650);
        if (runId !== sequenceId) return;
        await gatherOrbScores(runId);
        if (runId !== sequenceId) return;
      }

      await showFinalScoreRolling(prize, runId);
      if (runId !== sequenceId) return;
      stage.classList.add("stage--score-center");
      await sleep(820);
      if (runId !== sequenceId) return;

      playButton.disabled = false;
    }

    playButton.addEventListener("click", playPerformance);

    prizeInput.addEventListener("input", () => {
      prizeInput.value = cleanPrize(prizeInput.value);
    });

    presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        prizeInput.value = button.dataset.value;
        playPerformance();
      });
    });

    characterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setActiveCharacter(button.dataset.characterKey, true);
      });
    });

    window.addEventListener("resize", () => {
      resizeLightningCanvas();
      resizeClawCanvas();
      resizeBubbleCanvas();
      getSlots().forEach((slot) => setSlotDigit(slot, slot.dataset.value || "0"));
    });

    startLightningRenderer();
    setActiveCharacter(activeCharacterKey);
    buildSlots(cleanPrize(prizeInput.value).length);
    window.setTimeout(playPerformance, 500);
