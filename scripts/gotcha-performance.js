const config = window.GotchaPerformanceConfig;
const orbDrops = config.orbDrops;
const orbMultiplierPools = config.orbMultiplierPools || {};
const ballAssets = config.ballAssets;
const shellAssets = config.shellAssets || {};
const bitmapFont = config.bitmapFont;
const openingScoreBitmapFont = config.openingScoreBitmapFont || null;
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
const betInput = document.querySelector("#betInput");
const oddInput = document.querySelector("#oddInput");
const thorLogBox = document.querySelector("#thorLogBox");
const playButton = document.querySelector("#playButton");
const musicToggleButton = document.querySelector("#musicToggleButton");
const spawnVersionButton = document.querySelector("#spawnVersionButton");
const presetButtons = document.querySelectorAll("[data-value]");
const characterButtons = document.querySelectorAll("[data-character-key]");
const thorSplitButtons = document.querySelectorAll("[data-thor-split-count]");
const thorBonusButtons = document.querySelectorAll("[data-thor-bonus-total-strikes]");
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
const thorGroundSound = config.audio.thorGround ? new Audio(config.audio.thorGround) : null;
if (thorGroundSound) {
  thorGroundSound.preload = "auto";
}
const activeThorGroundSounds = new Set();
const thorEntranceSound = config.audio.thorEntrance ? new Audio(config.audio.thorEntrance) : null;
if (thorEntranceSound) {
  thorEntranceSound.preload = "auto";
}
const thorEntranceNextSound = config.audio.thorEntranceNext ? new Audio(config.audio.thorEntranceNext) : null;
if (thorEntranceNextSound) {
  thorEntranceNextSound.preload = "auto";
}
const activeThorEntranceSounds = new Set();
const thorSpawnSound = config.audio.thorSpawn ? new Audio(config.audio.thorSpawn) : null;
if (thorSpawnSound) {
  thorSpawnSound.preload = "auto";
}
const activeThorSpawnSounds = new Set();
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
const thorMobHitEffectConfig = config.spineEffects?.thorMobHit || null;
const thorIntroFxConfig = config.spineEffects?.thorIntroFx || null;
const thorIntroEntryFxConfig = config.spineEffects?.thorIntroEntryFx || null;
const spineCharacterConfigs = config.spineCharacters || {};
const spineRenderDprLimit = 1;
const spineFxDprLimit = 1;
const spineCanvasSizeRefreshMs = 260;
const thorMobHitFrameIntervalMs = 1000 / 30;

let sequenceId = 0;
let activeCharacterKey = config.activeCharacter;
let activeCharacter = config.characters[activeCharacterKey];
let idleBossImage = activeCharacter.idleImage;
let pendingThorSplitCount = null;
let pendingThorBonusTotalStrikes = null;
let pendingThorSpawnVersion = false;
let activeThorSpawnRun = false;
let musicEnabled = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const thorSplitWeightTable = {
  6: [.08, .1, .12, .14, .18, .38],
  7: [.07, .08, .1, .12, .14, .19, .3],
  8: [.06, .07, .08, .1, .12, .17, .18, .22],
  9: [.05, .06, .07, .08, .1, .14, .15, .17, .18],
};

const thorOddSplitRules = [
  { min: 200, max: 500, label: "200~500x", splitCount: 6 },
  { min: 501, max: 1000, label: "501~1000x", splitCount: 7 },
  { min: 1001, max: 1500, label: "1001~1500x", splitCount: 8 },
  { min: 1501, max: 2200, label: "1501~2200x", splitCount: 9 },
];

const lightningTonePalettes = {
  blue: {
    outerShadow: "#0aa5ff",
    outerStroke: "18, 151, 255",
    coreShadow: "#75eeff",
    coreStroke: "178, 246, 255",
    spark: ["#45d7ff", "#7ff4ff"],
    circleStroke: "255, 188, 58",
    circleShadow: "#ff9a28",
  },
  purple: {
    outerShadow: "#b45cff",
    outerStroke: "151, 76, 255",
    coreShadow: "#f0c4ff",
    coreStroke: "238, 190, 255",
    spark: ["#a875ff", "#f0c4ff"],
    circleStroke: "180, 92, 255",
    circleShadow: "#b45cff",
  },
  gold: {
    outerShadow: "#ffae2a",
    outerStroke: "255, 176, 58",
    outerAlpha: .58,
    coreShadow: "#ffe18c",
    coreStroke: "255, 220, 112",
    coreAlpha: .26,
    spark: ["#ffb338", "#ffe38e"],
    circleStroke: "255, 174, 56",
    circleShadow: "#ff9518",
  },
  legacy: {
    outerShadow: "#00aaff",
    outerStroke: "42, 184, 255",
    coreShadow: "#ffffff",
    coreStroke: "255, 255, 255",
    spark: ["#ffbc35", "#ffffff"],
    circleStroke: "255, 188, 58",
    circleShadow: "#ff9a28",
  },
};

let lightningCanvasWidth = 0;
let lightningCanvasHeight = 0;
let lightningFrameId = 0;
const lightningBolts = [];
const lightningParticles = [];
const lightningCircles = [];
const activeLightningAssetEffects = new Set();
let thorMobHitEffectData = null;
let thorMobHitEffectPromise = null;
let thorIntroFxData = null;
let thorIntroFxPromise = null;
const thorIntroFxDataCache = new WeakMap();
const thorIntroFxPromiseCache = new WeakMap();
let activeThorIntroFx = null;
const activeThorScoreBackFx = [];
let thorScoreBackFxFrameId = 0;
const thorFxLogPrefix = "[雷神FX]";
const enableThorFxDebugLog = false;
let bossSpineCanvas = null;
let bossIntroFxCanvas = null;
let bossSpineLoopFadeCanvas = null;
let bossSpineGl = null;
let activeBossSpine = null;
let bossSpineFrameId = 0;
let bossSpineLoadId = 0;
let bossSpineIntroFadeTimer = 0;
let bossSpineLoopFadeTimer = 0;
let bossSpineAfterimageTimers = [];
const bossSpineDataCache = new Map();
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

function normalizeSpineAtlasText(text) {
      return String(text || "").replace(/^\s+/, "");
    }

function parseSpineAtlas(text) {
      text = normalizeSpineAtlasText(text);
      const atlas = {
        page: "",
        width: 0,
        height: 0,
        pages: {},
        regions: {},
      };
      const pageKeys = new Set(["size", "format", "filter", "repeat"]);
      let currentRegion = null;
      let currentPage = null;

      text.split(/\r?\n/).forEach((line) => {
        if (!line.trim()) {
          currentRegion = null;
          return;
        }

        const isIndented = /^\s/.test(line);
        const trimmed = line.trim();

        if (!isIndented && /\.(png|webp|jpe?g)$/i.test(trimmed)) {
          currentPage = {
            name: trimmed,
            width: 0,
            height: 0,
          };
          atlas.pages[trimmed] = currentPage;
          if (!atlas.page) atlas.page = trimmed;
          currentRegion = null;
          return;
        }

        const separator = trimmed.indexOf(":");
        if (!isIndented && separator > 0 && pageKeys.has(trimmed.slice(0, separator))) {
          const key = trimmed.slice(0, separator);
          const value = trimmed.slice(separator + 1).trim();
          if (key === "size" && currentPage) {
            const [width, height] = value.split(",").map((item) => Number(item.trim()));
            currentPage.width = width || 0;
            currentPage.height = height || 0;
            if (!atlas.width) atlas.width = currentPage.width;
            if (!atlas.height) atlas.height = currentPage.height;
          }
          currentRegion = null;
          return;
        }

        if (!isIndented) {
          currentRegion = {
            name: trimmed,
            rotate: false,
            xy: [0, 0],
            size: [0, 0],
            orig: [0, 0],
            offset: [0, 0],
            page: currentPage?.name || atlas.page,
          };
          atlas.regions[trimmed] = currentRegion;
          return;
        }

        if (!currentRegion || separator < 0) return;

        const key = trimmed.slice(0, separator);
        const value = trimmed.slice(separator + 1).trim();
        if (["xy", "size", "orig", "offset"].includes(key)) {
          currentRegion[key] = value.split(",").map((item) => Number(item.trim()));
        } else if (key === "rotate") {
          currentRegion.rotate = value === "true";
        }
      });

      return atlas;
    }

function readSpineColorAlpha(color, fallback = 1) {
      if (!color || color.length < 8) return fallback;
      const alpha = Number.parseInt(color.slice(6, 8), 16);
      return Number.isFinite(alpha) ? alpha / 255 : fallback;
    }

function getSpineKeyTime(key) {
      return Number(key?.time || 0);
    }

function sampleSpineAxisTimeline(keys = [], time, defaults) {
      if (!keys.length) return { ...defaults };

      let previous = { ...defaults, time: 0 };
      let next = null;

      for (const key of keys) {
        const keyTime = getSpineKeyTime(key);
        const value = {
          time: keyTime,
          x: Number.isFinite(key.x) ? key.x : defaults.x,
          y: Number.isFinite(key.y) ? key.y : defaults.y,
          curve: key.curve,
        };

        if (keyTime <= time) {
          previous = value;
        } else {
          next = value;
          break;
        }
      }

      if (!next || previous.curve === "stepped") {
        return { x: previous.x, y: previous.y };
      }

      const span = Math.max(.0001, next.time - previous.time);
      const progress = Math.max(0, Math.min(1, (time - previous.time) / span));
      return {
        x: previous.x + (next.x - previous.x) * progress,
        y: previous.y + (next.y - previous.y) * progress,
      };
    }

function sampleSpineColorAlpha(keys = [], time, fallback = 1) {
      if (!keys.length) return fallback;

      let previous = { time: 0, alpha: fallback, curve: "linear" };
      let next = null;

      for (const key of keys) {
        const value = {
          time: getSpineKeyTime(key),
          alpha: readSpineColorAlpha(key.color, fallback),
          curve: key.curve,
        };

        if (value.time <= time) {
          previous = value;
        } else {
          next = value;
          break;
        }
      }

      if (!next || previous.curve === "stepped") return previous.alpha;

      const span = Math.max(.0001, next.time - previous.time);
      const progress = Math.max(0, Math.min(1, (time - previous.time) / span));
      return previous.alpha + (next.alpha - previous.alpha) * progress;
    }

function getSpineAttachmentAtTime(keys = [], time, fallback = null) {
      let attachment = fallback;
      keys.forEach((key) => {
        if (getSpineKeyTime(key) <= time + .0001) {
          attachment = key.name || null;
        }
      });
      return attachment;
    }

function buildThorMobHitEffectData(skeleton, atlas, effectConfig) {
      const skeletonBounds = skeleton.skeleton || {};
      const bonesByName = Object.fromEntries((skeleton.bones || []).map((bone) => [bone.name, bone]));
      const animation = skeleton.animations?.[effectConfig.animation || "MobHit"] || {};
      const animationSlots = animation.slots || {};
      const animationBones = animation.bones || {};
      const top = (skeletonBounds.y || 0) + (skeletonBounds.height || 0);
      const width = skeletonBounds.width || 512;
      const height = skeletonBounds.height || 824;
      const originX = -(skeletonBounds.x || 0);

      function getBoneSetup(name) {
        const chain = [];
        let bone = bonesByName[name];
        while (bone) {
          chain.unshift(bone);
          bone = bone.parent ? bonesByName[bone.parent] : null;
        }

        return chain.reduce((pose, item) => ({
          x: pose.x + (item.x || 0) * pose.scaleX,
          y: pose.y + (item.y || 0) * pose.scaleY,
          scaleX: pose.scaleX * (item.scaleX ?? 1),
          scaleY: pose.scaleY * (item.scaleY ?? 1),
        }), { x: 0, y: 0, scaleX: 1, scaleY: 1 });
      }

      const slots = (skeleton.slots || []).map((slot) => ({
        name: slot.name,
        setupAttachment: slot.attachment || null,
        setupAlpha: readSpineColorAlpha(slot.color, 1),
        blend: slot.blend || "normal",
        boneName: slot.bone,
        boneSetup: getBoneSetup(slot.bone),
        boneTimeline: animationBones[slot.bone] || {},
        attachmentTimeline: animationSlots[slot.name]?.attachment || [],
        colorTimeline: animationSlots[slot.name]?.color || [],
      }));

      const duration = Math.max(
        .1,
        ...slots.flatMap((slot) => [
          ...slot.attachmentTimeline.map(getSpineKeyTime),
          ...slot.colorTimeline.map(getSpineKeyTime),
          ...(slot.boneTimeline.translate || []).map(getSpineKeyTime),
          ...(slot.boneTimeline.scale || []).map(getSpineKeyTime),
        ])
      );

      return {
        atlas,
        skeletonWidth: width,
        skeletonHeight: height,
        texture: effectConfig.texture,
        top,
        originX,
        scale: effectConfig.scale || .58,
        strongScale: effectConfig.strongScale || effectConfig.scale || .68,
        duration,
        slots,
      };
    }

async function loadThorMobHitEffect() {
      if (!thorMobHitEffectConfig) return null;
      if (thorMobHitEffectData) return thorMobHitEffectData;
      if (window.ThorMobHitEffectSource?.skeleton && window.ThorMobHitEffectSource?.atlas) {
        thorMobHitEffectData = buildThorMobHitEffectData(
          window.ThorMobHitEffectSource.skeleton,
          parseSpineAtlas(window.ThorMobHitEffectSource.atlas),
          thorMobHitEffectConfig
        );
        return thorMobHitEffectData;
      }
      if (!thorMobHitEffectPromise) {
        thorMobHitEffectPromise = Promise.all([
          fetch(thorMobHitEffectConfig.skeleton).then((response) => response.json()),
          fetch(thorMobHitEffectConfig.atlas).then((response) => response.text()),
        ])
          .then(([skeleton, atlasText]) => {
            thorMobHitEffectData = buildThorMobHitEffectData(
              skeleton,
              parseSpineAtlas(atlasText),
              thorMobHitEffectConfig
            );
            return thorMobHitEffectData;
          })
          .catch(() => {
            thorMobHitEffectPromise = null;
            return null;
          });
      }

      return thorMobHitEffectPromise;
    }

function createThorMobHitSlot(effect, slotData, effectData, effectScale) {
      const slot = document.createElement("div");
      const region = document.createElement("div");

      slot.className = "thor-mobhit-slot";
      if (slotData.blend === "additive") slot.classList.add("is-additive");
      region.className = "thor-mobhit-region";
      slot.append(region);
      effect.append(slot);

      return {
        slot,
        region,
        slotData,
        currentAttachment: "",
        update(time) {
          const translate = sampleSpineAxisTimeline(slotData.boneTimeline.translate, time, { x: 0, y: 0 });
          const scale = sampleSpineAxisTimeline(slotData.boneTimeline.scale, time, { x: 1, y: 1 });
          const boneX = slotData.boneSetup.x + translate.x;
          const boneY = slotData.boneSetup.y + translate.y;
          const attachment = getSpineAttachmentAtTime(slotData.attachmentTimeline, time, slotData.setupAttachment);
          const alpha = sampleSpineColorAlpha(slotData.colorTimeline, time, slotData.setupAlpha);

          slot.style.left = `${(effectData.originX + boneX) * effectScale}px`;
          slot.style.top = `${(effectData.top - boneY) * effectScale}px`;
          slot.style.opacity = alpha.toFixed(3);
          slot.style.transform = `translate(-50%, -50%) scale(${slotData.boneSetup.scaleX * scale.x}, ${slotData.boneSetup.scaleY * scale.y})`;

          if (attachment === this.currentAttachment) return;
          this.currentAttachment = attachment;

          const atlasRegion = attachment ? effectData.atlas.regions[attachment] : null;
          if (!atlasRegion) {
            slot.style.display = "none";
            return;
          }

          const [atlasX, atlasY] = atlasRegion.xy;
          const [regionWidth, regionHeight] = atlasRegion.size;
          const [originWidth, originHeight] = atlasRegion.orig;
          const [offsetX, offsetY] = atlasRegion.offset;
          const regionTop = originHeight - offsetY - regionHeight;

          slot.style.display = "";
          slot.style.width = `${originWidth * effectScale}px`;
          slot.style.height = `${originHeight * effectScale}px`;
          region.style.left = `${offsetX * effectScale}px`;
          region.style.top = `${regionTop * effectScale}px`;
          region.style.width = `${regionWidth * effectScale}px`;
          region.style.height = `${regionHeight * effectScale}px`;
          region.style.backgroundImage = `url("${effectData.texture}")`;
          region.style.backgroundSize = `${effectData.atlas.width * effectScale}px ${effectData.atlas.height * effectScale}px`;
          region.style.backgroundPosition = `-${atlasX * effectScale}px -${atlasY * effectScale}px`;
        },
      };
    }

function createThorMobHitEffect(point, strong = false, tone = "blue", options = {}) {
      const effectData = thorMobHitEffectData;
      if (!effectData) {
        void loadThorMobHitEffect();
        return false;
      }

      const viewportScale = Math.min(lightningCanvasWidth / 1120 || 1, lightningCanvasHeight / 630 || 1);
      const scaleMultiplier = Number(options.scaleMultiplier || 1);
      const effectScale = (strong ? effectData.strongScale : effectData.scale) * viewportScale * scaleMultiplier;
      const effect = document.createElement("div");

      effect.className = "thor-mobhit-effect";
      if (options.className) effect.classList.add(options.className);
      if (strong) effect.classList.add("is-strong");
      if (tone !== "blue") effect.classList.add(`is-${tone}`);
      setPoint(effect, point);
      if (Number.isFinite(options.fadeMs)) {
        effect.style.setProperty("--thor-mobhit-fade-ms", `${Math.max(180, options.fadeMs)}ms`);
      }
      if (Number.isFinite(options.zIndex)) {
        effect.style.zIndex = String(options.zIndex);
      }
      effect.style.width = `${effectData.skeletonWidth * effectScale}px`;
      effect.style.height = `${effectData.skeletonHeight * effectScale}px`;
      effect.style.transform = `translateX(-50%) translateY(-${effectData.top * effectScale}px)`;

      const slots = effectData.slots.map((slotData) => createThorMobHitSlot(effect, slotData, effectData, effectScale));
      const parent = options.layer === "underBoss" ? stage : scoreGatherLayer;
      if (options.layer === "underBoss") {
        effect.classList.add("is-under-boss");
        stage.insertBefore(effect, boss);
      } else {
        parent.append(effect);
      }
      activeLightningAssetEffects.add(effect);

      const startTime = performance.now();
      const lifetime = (effectData.duration + (Number.isFinite(options.extraLifetimeSec) ? options.extraLifetimeSec : .16)) * 1000;
      let lastRenderedAt = 0;

      function render(now) {
        if (!effect.isConnected) return;

        const elapsed = now - startTime;
        if (!lastRenderedAt || now - lastRenderedAt >= thorMobHitFrameIntervalMs || elapsed >= lifetime) {
          const time = Math.min(effectData.duration, elapsed / 1000);
          slots.forEach((slot) => slot.update(time));
          lastRenderedAt = now;
        }

        if (elapsed < lifetime) {
          requestAnimationFrame(render);
        } else {
          activeLightningAssetEffects.delete(effect);
          effect.remove();
        }
      }

      requestAnimationFrame(render);
      return true;
    }

function sampleSpineNumberTimeline(keys = [], time, property, fallback = 0, angle = false) {
      if (!keys.length) return fallback;

      let previous = {
        time: 0,
        value: fallback,
        curve: "linear",
      };
      let next = null;

      for (const key of keys) {
        const value = Number.isFinite(key[property]) ? key[property] : fallback;
        const item = {
          time: getSpineKeyTime(key),
          value,
          curve: key.curve,
        };

        if (item.time <= time) {
          previous = item;
        } else {
          next = item;
          break;
        }
      }

      if (!next || previous.curve === "stepped") return previous.value;

      const span = Math.max(.0001, next.time - previous.time);
      const progress = Math.max(0, Math.min(1, (time - previous.time) / span));
      let delta = next.value - previous.value;
      if (angle) {
        delta = ((delta + 180) % 360) - 180;
      }

      return previous.value + delta * progress;
    }

function sampleSpineTimelinePair(keys = [], time, fallbackX = 0, fallbackY = 0) {
      return {
        x: sampleSpineNumberTimeline(keys, time, "x", fallbackX),
        y: sampleSpineNumberTimeline(keys, time, "y", fallbackY),
      };
    }

function getSpineAnimationDuration(animation = {}) {
      let duration = 0;
      const containers = [
        animation.bones || {},
        animation.slots || {},
        animation.ik || {},
        animation.transform || {},
        animation.paths || {},
      ];

      containers.forEach((container) => {
        Object.values(container).forEach((timelines) => {
          Object.values(timelines || {}).forEach((keys) => {
            if (Array.isArray(keys)) {
              keys.forEach((key) => {
                duration = Math.max(duration, getSpineKeyTime(key));
              });
            }
          });
        });
      });

      (animation.drawOrder || animation.draworder || animation.events || []).forEach((key) => {
        duration = Math.max(duration, getSpineKeyTime(key));
      });

      return Math.max(.1, duration);
    }

function buildSpineCharacterData(skeleton, atlas, characterConfig) {
      const skeletonBounds = skeleton.skeleton || {};
      const bounds = {
        x: skeletonBounds.x || 0,
        y: skeletonBounds.y || 0,
        width: skeletonBounds.width || 1,
        height: skeletonBounds.height || 1,
      };
      const requestedAnimation = characterConfig.animation || "";
      const animationName = skeleton.animations?.[requestedAnimation]
        ? requestedAnimation
        : Object.keys(skeleton.animations || {}).find((name) => name.includes("Gacha_Loop"));
      const animation = skeleton.animations?.[animationName] || {};
      const animationBones = animation.bones || {};
      const animationSlots = animation.slots || {};
      const bones = (skeleton.bones || []).map((bone, index, list) => ({
        index,
        name: bone.name,
        parentIndex: bone.parent ? list.findIndex((item) => item.name === bone.parent) : -1,
        x: bone.x || 0,
        y: bone.y || 0,
        rotation: bone.rotation || 0,
        scaleX: bone.scaleX ?? 1,
        scaleY: bone.scaleY ?? 1,
        shearX: bone.shearX || 0,
        shearY: bone.shearY || 0,
        timeline: animationBones[bone.name] || {},
      }));
      const skinAttachments = (Array.isArray(skeleton.skins) ? skeleton.skins[0]?.attachments : skeleton.skins?.default) || {};

      const slots = (skeleton.slots || []).map((slot) => {
        const attachmentName = slot.attachment || "";
        const attachment = skinAttachments[slot.name]?.[attachmentName];
        const region = atlas.regions[attachmentName] || atlas.regions[attachment?.path];
        if (!attachment || !region || attachment.type !== "mesh") return null;

        return {
          name: slot.name,
          boneIndex: bones.findIndex((bone) => bone.name === slot.bone),
          blend: slot.blend || "normal",
          setupAlpha: readSpineColorAlpha(slot.color, 1),
          colorTimeline: animationSlots[slot.name]?.color || [],
          attachment,
          region,
        };
      }).filter(Boolean);

      return {
        atlas,
        animationName,
        bounds,
        bones,
        duration: getSpineAnimationDuration(animation),
        introAnimationName: characterConfig.introAnimation || "",
        introDurationMs: characterConfig.introDurationMs || 760,
        introDropDurationMs: characterConfig.introDropDurationMs || characterConfig.introStrikeLeadMs || 300,
        introDropHoldMs: characterConfig.introDropHoldMs || 0,
        introDropLift: characterConfig.introDropLift || 0,
        introDropOvershoot: characterConfig.introDropOvershoot || 0,
        introFadeMs: characterConfig.introFadeMs || 0,
        introHeightMatchBones: characterConfig.introHeightMatchBones || [],
        introImpactTime: characterConfig.introImpactTime ?? .2,
        introLoopFadeOutMs: characterConfig.introLoopFadeOutMs || 0,
        introLoopTailHoldMs: characterConfig.introLoopTailHoldMs || 0,
        introMixDuration: characterConfig.introMixDuration ?? .12,
        introScaleRecoverMs: characterConfig.introScaleRecoverMs || 0,
        introSoundTime: characterConfig.introSoundTime ?? null,
        introSlotVisibilityFix: characterConfig.introSlotVisibilityFix || null,
        introStartTime: characterConfig.introStartTime || 0,
        introStartScale: characterConfig.introStartScale || 1,
        introStrikeLeadMs: characterConfig.introStrikeLeadMs || 300,
        introTranslateScale: characterConfig.introTranslateScale || .4,
        moveAnimationName: characterConfig.moveAnimation || "",
        pages: Object.keys(atlas.pages || {}),
        paybackAnimationName: characterConfig.paybackAnimation || "",
        paybackDurationMs: characterConfig.paybackDurationMs || 0,
        renderScale: characterConfig.renderScale || 1,
        slots,
        spawnAnimationName: characterConfig.spawnAnimation || "",
        spawnDurationMs: characterConfig.spawnDurationMs || 0,
        spawnVersionAnimationScale: characterConfig.spawnVersionAnimationScale || 1,
        spawnVersionAnimationOffsetY: characterConfig.spawnVersionAnimationOffsetY || 0,
        spawnVersionPaybackStrikeLeadMs: characterConfig.spawnVersionPaybackStrikeLeadMs || 0,
        textureBase: characterConfig.textureBase || "",
      };
    }

function normalizeSpineTranslateScale(scale) {
      if (typeof scale === "number" && Number.isFinite(scale)) {
        return { x: scale, y: scale };
      }

      return {
        x: Number.isFinite(scale?.x) ? scale.x : 1,
        y: Number.isFinite(scale?.y) ? scale.y : 1,
      };
    }

function readSpineSkeletonDataWithScaledIntro(skeletonJson, data) {
      const introAnimation = data.introAnimationName
        ? data.skeleton.animations?.[data.introAnimationName]
        : null;

      if (!introAnimation?.bones) {
        return skeletonJson.readSkeletonData(data.skeleton);
      }

      const scale = normalizeSpineTranslateScale(data.introTranslateScale);
      const restoreFrames = [];
      Object.values(introAnimation.bones).forEach((timelines) => {
        if (!Array.isArray(timelines.translate)) return;
        timelines.translate.forEach((frame) => {
          const originalX = frame.x;
          const originalY = frame.y;
          let changed = false;
          if (typeof frame.x === "number") {
            frame.x *= scale.x;
            changed = true;
          }
          if (typeof frame.y === "number") {
            frame.y *= scale.y;
            changed = true;
          }
          if (changed) {
            restoreFrames.push(() => {
              if (typeof originalX === "number") frame.x = originalX;
              else delete frame.x;
              if (typeof originalY === "number") frame.y = originalY;
              else delete frame.y;
            });
          }
        });
      });

      const slotFix = data.introSlotVisibilityFix;
      if (slotFix?.until && introAnimation.slots) {
        const until = slotFix.until;
        Object.entries(introAnimation.slots).forEach(([slotName, timelines]) => {
          if (!Array.isArray(timelines?.color)) return;

          const alpha = slotFix.visibleToken && slotName.includes(slotFix.visibleToken)
            ? "ff"
            : slotFix.hiddenToken && slotName.includes(slotFix.hiddenToken)
              ? "00"
              : null;
          if (!alpha) return;

          timelines.color.forEach((frame) => {
            const time = frame.time || 0;
            if (time > until || typeof frame.color !== "string" || frame.color.length < 8) return;

            const originalColor = frame.color;
            frame.color = `${originalColor.slice(0, 6)}${alpha}`;
            restoreFrames.push(() => {
              frame.color = originalColor;
            });
          });
        });
      }

      try {
        return skeletonJson.readSkeletonData(data.skeleton);
      } finally {
        restoreFrames.forEach((restoreFrame) => restoreFrame());
      }
    }

async function loadSpineCharacterData(characterKey) {
      const characterConfig = spineCharacterConfigs[characterKey];
      if (!characterConfig) return null;
      if (bossSpineDataCache.has(characterKey)) return bossSpineDataCache.get(characterKey);

      const source = characterConfig.sourceGlobal ? window[characterConfig.sourceGlobal] : null;
      const loadPromise = source?.skeleton && source?.atlas
        ? Promise.resolve(source)
        : Promise.all([
          fetch(characterConfig.skeleton).then((response) => response.json()),
          fetch(characterConfig.atlas).then((response) => response.text()),
        ]).then(([skeleton, atlasText]) => ({ skeleton, atlas: atlasText }));

      const data = await loadPromise.then(({ skeleton, atlas: atlasText }) => {
        const normalizedAtlasText = normalizeSpineAtlasText(atlasText);
        return {
          ...buildSpineCharacterData(skeleton, parseSpineAtlas(normalizedAtlasText), characterConfig),
          skeleton,
          atlasText: normalizedAtlasText,
          textureDataUrls: characterConfig.textureGlobal ? (window[characterConfig.textureGlobal] || {}) : {},
        };
      });
      bossSpineDataCache.set(characterKey, data);
      return data;
    }

function ensureBossSpineCanvas() {
      if (bossSpineCanvas) return bossSpineCanvas;

      bossSpineCanvas = document.createElement("canvas");
      bossSpineCanvas.className = "boss-spine-canvas";
      boss.append(bossSpineCanvas);
      return bossSpineCanvas;
    }

function ensureBossIntroFxCanvas() {
      if (bossIntroFxCanvas) return bossIntroFxCanvas;

      bossIntroFxCanvas = document.createElement("canvas");
      bossIntroFxCanvas.className = "boss-intro-fx-canvas";
      boss.append(bossIntroFxCanvas);
      return bossIntroFxCanvas;
    }

function ensureBossSpineLoopFadeCanvas() {
      if (bossSpineLoopFadeCanvas) return bossSpineLoopFadeCanvas;

      bossSpineLoopFadeCanvas = document.createElement("canvas");
      bossSpineLoopFadeCanvas.className = "boss-spine-loop-fade-canvas";
      boss.append(bossSpineLoopFadeCanvas);
      return bossSpineLoopFadeCanvas;
    }

function clearBossSpineLoopFade() {
      window.clearTimeout(bossSpineLoopFadeTimer);
      bossSpineLoopFadeTimer = 0;

      if (!bossSpineLoopFadeCanvas) return;
      bossSpineLoopFadeCanvas.classList.remove("is-loop-fade-out");
      bossSpineLoopFadeCanvas.style.display = "none";
      const ctx = bossSpineLoopFadeCanvas.getContext("2d");
      ctx?.clearRect(0, 0, bossSpineLoopFadeCanvas.width, bossSpineLoopFadeCanvas.height);
    }

function stopBossSpineCharacter() {
      bossSpineLoadId += 1;
      disposeThorIntroFx();
      clearBossSpineLoopFade();
      clearBossSpineAfterimages();
      boss.classList.remove("boss--spine");
      bossImage.style.display = "";
      if (bossSpineFrameId) {
        cancelAnimationFrame(bossSpineFrameId);
        bossSpineFrameId = 0;
      }
      if (activeBossSpine?.dispose) {
        resetBossSpineIntroScale(activeBossSpine.runtime);
        activeBossSpine.dispose();
      }
      activeBossSpine = null;
      window.clearTimeout(bossSpineIntroFadeTimer);
      bossSpineIntroFadeTimer = 0;
      if (bossSpineGl && bossSpineCanvas) {
        bossSpineGl.viewport(0, 0, bossSpineCanvas.width, bossSpineCanvas.height);
        bossSpineGl.clearColor(0, 0, 0, 0);
        bossSpineGl.clear(bossSpineGl.COLOR_BUFFER_BIT);
      }
      if (bossSpineCanvas) {
        bossSpineCanvas.classList.remove("is-intro-fade-in");
        bossSpineCanvas.style.display = "none";
      }
    }

function loadSpinePageImagesFromList(pages, textureBase = "", textureDataUrls = {}, options = {}) {
      const pageNames = [...new Set((pages || []).map((pageName) => String(pageName || "").trim()).filter(Boolean))];
      const entries = pageNames.map((pageName) => {
        const image = new Image();
        const embeddedSrc = textureDataUrls?.[pageName];
        const src = embeddedSrc || (options.allowUrlFallback === false
          ? ""
          : new URL(`${textureBase}${pageName}`, document.baseURI).href);
        if (!src) {
          return Promise.resolve([pageName, null]);
        }
        image.src = src;
        return new Promise((resolve) => {
          if (image.complete && image.naturalWidth) {
            resolve([pageName, image]);
            return;
          }
          image.addEventListener("load", () => resolve([pageName, image]), { once: true });
          image.addEventListener("error", () => resolve([pageName, null]), { once: true });
        });
      });

      return Promise.all(entries).then((loaded) => new Map(loaded.filter(([, image]) => image)));
    }

function loadSpinePageImages(data) {
      return loadSpinePageImagesFromList(data.pages, data.textureBase, data.textureDataUrls);
    }

function logThorFx(message, details) {
      if (!enableThorFxDebugLog) return;
      if (details === undefined) {
        console.info(`${thorFxLogPrefix} ${message}`);
        return;
      }
      console.info(`${thorFxLogPrefix} ${message}`, details);
    }

function warnThorFx(message, details) {
      if (details === undefined) {
        console.warn(`${thorFxLogPrefix} ${message}`);
        return;
      }
      console.warn(`${thorFxLogPrefix} ${message}`, details);
    }

async function loadThorIntroFxData(fxConfig = thorIntroFxConfig) {
      if (!fxConfig) return null;
      if (thorIntroFxDataCache.has(fxConfig)) return thorIntroFxDataCache.get(fxConfig);

      if (!thorIntroFxPromiseCache.has(fxConfig)) {
        const source = fxConfig.sourceGlobal ? window[fxConfig.sourceGlobal] : null;
        const loadPromise = source?.skeleton && source?.atlas
          ? Promise.resolve(source)
          : Promise.all([
            fetch(fxConfig.skeleton).then((response) => response.json()),
            fetch(fxConfig.atlas).then((response) => response.text()),
          ]).then(([skeleton, atlas]) => ({ skeleton, atlas }));

        const promise = loadPromise
          .then(async ({ skeleton, atlas: atlasText, textures }) => {
            const normalizedAtlasText = normalizeSpineAtlasText(atlasText);
            const atlas = parseSpineAtlas(normalizedAtlasText);
            const hasEmbeddedTextures = textures && Object.keys(textures).length > 0;
            const pageNames = Object.keys(atlas.pages || {});
            const images = await loadSpinePageImagesFromList(
              pageNames,
              fxConfig.textureBase || "",
              textures || {},
              { allowUrlFallback: !hasEmbeddedTextures }
            );
            const loadedImageNames = [...images.keys()];
            logThorFx("FX data loaded", {
              sourceGlobal: fxConfig.sourceGlobal || "",
              animations: Object.keys(skeleton?.animations || {}),
              atlasPages: pageNames,
              embeddedTextures: Object.keys(textures || {}),
              loadedImages: loadedImageNames,
              hasEmbeddedTextures,
            });
            if (loadedImageNames.length !== pageNames.length) {
              warnThorFx("FX missing atlas page images", {
                atlasPages: pageNames,
                loadedImages: loadedImageNames,
              });
            }

            const data = {
              skeleton,
              atlasText: normalizedAtlasText,
              images,
              animationName: fxConfig.animation || "",
              hiddenSlotNames: fxConfig.hiddenSlots || [],
              opacity: fxConfig.opacity ?? .92,
              scale: fxConfig.scale || 1,
              offsetX: fxConfig.offsetX || 0,
              offsetY: fxConfig.offsetY || 0,
            };
            thorIntroFxDataCache.set(fxConfig, data);
            if (fxConfig === thorIntroFxConfig) {
              thorIntroFxData = data;
            }
            return data;
          })
          .catch((error) => {
            warnThorFx("FX data failed to load", error);
            thorIntroFxPromiseCache.delete(fxConfig);
            if (fxConfig === thorIntroFxConfig) {
              thorIntroFxPromise = null;
            }
            return null;
          });
        thorIntroFxPromiseCache.set(fxConfig, promise);
        if (fxConfig === thorIntroFxConfig) {
          thorIntroFxPromise = promise;
        }
      }

      return thorIntroFxPromiseCache.get(fxConfig);
    }
function showBossSpineFallback(canvas) {
      boss.classList.remove("boss--spine");
      bossImage.style.display = "none";
      if (canvas) {
        canvas.style.display = "none";
      }
    }

function resolveCanvasRenderSize(canvas, cache, now, options = {}) {
      const fallbackWidth = Number(options.fallbackWidth || 640);
      const fallbackHeight = Number(options.fallbackHeight || 930);
      const refreshMs = Number(options.refreshMs || spineCanvasSizeRefreshMs);
      const shouldRefresh = !cache.width
        || !cache.height
        || now - (cache.checkedAt || 0) >= refreshMs;

      if (shouldRefresh) {
        const rect = canvas.getBoundingClientRect();
        cache.width = rect.width || canvas.clientWidth || fallbackWidth;
        cache.height = rect.height || canvas.clientHeight || fallbackHeight;
        cache.checkedAt = now;
      }

      const dpr = Math.min(Number(options.dprLimit || 1), window.devicePixelRatio || 1);
      const targetWidth = Math.max(1, Math.round(cache.width * dpr));
      const targetHeight = Math.max(1, Math.round(cache.height * dpr));
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      return {
        width: cache.width,
        height: cache.height,
        targetWidth,
        targetHeight,
      };
    }

function createBossSpineRuntime(data, images) {
      const spineRuntime = window.spine;
      if (!spineRuntime?.webgl?.GLTexture) return null;

      bossSpineGl = bossSpineGl || bossSpineCanvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      });
      if (!bossSpineGl) return null;

      const gl = bossSpineGl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const getPageImage = (pagePath) => {
        const normalized = String(pagePath || "").replace(/\\/g, "/");
        return images.get(pagePath) || images.get(normalized) || images.get(normalized.split("/").pop());
      };
      const atlas = new spineRuntime.TextureAtlas(data.atlasText, (pagePath) => {
        const image = getPageImage(pagePath);
        if (!image) {
          throw new Error(`Missing Spine atlas page: ${pagePath}`);
        }
        const texture = new spineRuntime.webgl.GLTexture(gl, image);
        return texture;
      });
      const atlasLoader = new spineRuntime.AtlasAttachmentLoader(atlas);
      const skeletonJson = new spineRuntime.SkeletonJson(atlasLoader);
      const skeletonData = readSpineSkeletonDataWithScaledIntro(skeletonJson, data);
      const requestedAnimation = data.animationName || "";
      const animationName = skeletonData.findAnimation(requestedAnimation)
        ? requestedAnimation
        : skeletonData.animations.find((animation) => animation.name.includes("Gacha_Loop"))?.name;
      const introAnimationName = data.introAnimationName && skeletonData.findAnimation(data.introAnimationName)
        ? data.introAnimationName
        : "";

      if (!animationName) {
        throw new Error("Fish_20101 Gacha loop animation was not found.");
      }

      const skeleton = new spineRuntime.Skeleton(skeletonData);
      skeleton.setToSetupPose();
      skeleton.updateWorldTransform();

      const offset = new spineRuntime.Vector2();
      const size = new spineRuntime.Vector2();
      skeleton.getBounds(offset, size, []);

      const animationStateData = new spineRuntime.AnimationStateData(skeletonData);
      const animationState = new spineRuntime.AnimationState(animationStateData);
      animationState.setAnimation(0, animationName, true);

      const shader = spineRuntime.webgl.Shader.newTwoColoredTextured(gl);
      const batcher = new spineRuntime.webgl.PolygonBatcher(gl, true);
      const mvp = new spineRuntime.webgl.Matrix4();
      const renderer = new spineRuntime.webgl.SkeletonRenderer(gl, true);
      renderer.premultipliedAlpha = false;

      return {
        gl,
        shader,
        batcher,
        mvp,
        renderer,
        skeleton,
        animationState,
        bounds: { offset, size },
        introAnimationName,
        introDrop: null,
        introDropDurationMs: data.introDropDurationMs || data.introStrikeLeadMs || 300,
        introDropHoldMs: data.introDropHoldMs || 0,
        introDropLift: data.introDropLift || 0,
        introDropOvershoot: data.introDropOvershoot || 0,
        introFadeMs: data.introFadeMs || 0,
        introHeightMatch: null,
        introHeightMatchBones: data.introHeightMatchBones || [],
        introImpactTime: data.introImpactTime ?? .2,
        introLoopFadeOutMs: data.introLoopFadeOutMs || 0,
        introLoopTailHoldMs: data.introLoopTailHoldMs || 0,
        introMixDuration: data.introMixDuration ?? .12,
        introScaleMatch: null,
        introScaleRecoverMs: data.introScaleRecoverMs || 0,
        introSoundTime: data.introSoundTime,
        introStartTime: data.introStartTime || 0,
        introStartScale: data.introStartScale || 1,
        introDurationMs: data.introDurationMs || 760,
        introStrikeLeadMs: data.introStrikeLeadMs || 300,
        loopAnimationName: animationName,
        moveAnimationName: data.moveAnimationName || "",
        paybackAnimationName: data.paybackAnimationName || "",
        paybackDurationMs: data.paybackDurationMs || 0,
        renderScale: data.renderScale || 1,
        spawnAnimationName: data.spawnAnimationName || "",
        spawnDurationMs: data.spawnDurationMs || 0,
        currentAnimationScale: 1,
        currentAnimationOffsetY: 0,
        spawnVersionAnimationScale: data.spawnVersionAnimationScale || 1,
        spawnVersionAnimationOffsetY: data.spawnVersionAnimationOffsetY || 0,
        spawnVersionPaybackStrikeLeadMs: data.spawnVersionPaybackStrikeLeadMs || 0,
        canvasSizeCache: { width: 0, height: 0, checkedAt: 0 },
        renderIntervalMs: data.renderFps ? 1000 / Math.max(1, Number(data.renderFps)) : 0,
        lastRenderedAt: 0,
        lastTime: 0,
        introTimer: 0,
        introSoundTimer: 0,
        introToken: 0,
        dispose() {
          window.clearTimeout(this.introTimer);
          window.clearTimeout(this.introSoundTimer);
          this.introHeightMatch = null;
          this.introScaleMatch = null;
          atlas.dispose?.();
          batcher.dispose?.();
          shader.dispose?.();
        },
      };
    }

function disposeThorIntroFx() {
      if (activeThorIntroFx?.dispose) {
        activeThorIntroFx.dispose();
      }
      activeThorIntroFx = null;
      if (bossIntroFxCanvas) {
        bossIntroFxCanvas.style.display = "none";
      }
    }

function createThorIntroFxRuntime(data, durationMs, options = {}) {
      const spineRuntime = window.spine;
      const canvas = options.canvas || ensureBossIntroFxCanvas();
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      });
      if (!gl || !spineRuntime?.webgl?.GLTexture) {
        warnThorFx("建立FX失敗：WebGL或Spine runtime不可用", {
          hasGl: Boolean(gl),
          hasSpineTexture: Boolean(spineRuntime?.webgl?.GLTexture),
          canvasClass: canvas.className,
        });
        return null;
      }
      canvas.style.display = "block";
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const getPageImage = (pagePath) => {
        const normalized = String(pagePath || "").replace(/\\/g, "/");
        return data.images.get(pagePath) || data.images.get(normalized) || data.images.get(normalized.split("/").pop());
      };
      const atlas = new spineRuntime.TextureAtlas(data.atlasText, (pagePath) => {
        const image = getPageImage(pagePath);
        if (!image) {
          warnThorFx("建立FX失敗：找不到atlas貼圖頁", {
            pagePath,
            availableImages: [...data.images.keys()],
          });
          throw new Error(`Missing Thor intro FX atlas page: ${pagePath}`);
        }
        return new spineRuntime.webgl.GLTexture(gl, image);
      });
      const atlasLoader = new spineRuntime.AtlasAttachmentLoader(atlas);
      const skeletonJson = new spineRuntime.SkeletonJson(atlasLoader);
      const skeletonData = skeletonJson.readSkeletonData(data.skeleton);
      const requestedAnimationName = options.animationName || data.animationName || "";
      const animationName = requestedAnimationName && skeletonData.findAnimation(requestedAnimationName)
        ? requestedAnimationName
        : skeletonData.animations[0]?.name;

      if (!animationName) {
        warnThorFx("建立FX失敗：找不到可播放動畫", {
          requestedAnimationName,
          availableAnimations: skeletonData.animations.map((item) => item.name),
        });
        atlas.dispose?.();
        return null;
      }

      const animation = skeletonData.findAnimation(animationName);
      const sourceDuration = Math.max(.01, animation?.duration || .5);
      const skeleton = new spineRuntime.Skeleton(skeletonData);
      skeleton.setToSetupPose();
      skeleton.updateWorldTransform();
      const offset = new spineRuntime.Vector2();
      const size = new spineRuntime.Vector2();
      skeleton.getBounds(offset, size, []);

      const animationStateData = new spineRuntime.AnimationStateData(skeletonData);
      const animationState = new spineRuntime.AnimationState(animationStateData);
      const runtimeDurationMs = Math.max(120, durationMs);
      animationState.timeScale = options.loop ? (options.timeScale || 1) : sourceDuration / (runtimeDurationMs / 1000);
      const entry = animationState.setAnimation(0, animationName, Boolean(options.loop));
      entry.animationStart = 0;
      entry.animationEnd = sourceDuration;
      entry.trackEnd = options.loop ? Number.MAX_VALUE : sourceDuration;
      entry.mixDuration = 0;

      const shader = spineRuntime.webgl.Shader.newTwoColoredTextured(gl);
      const batcher = new spineRuntime.webgl.PolygonBatcher(gl, true);
      const mvp = new spineRuntime.webgl.Matrix4();
      const renderer = new spineRuntime.webgl.SkeletonRenderer(gl, true);
      renderer.premultipliedAlpha = false;
      const debugLabel = options.label || (options.canvas ? "分數襯底FX" : "主角同步FX");
      logThorFx("建立FX動畫Runtime", {
        label: debugLabel,
        requestedAnimationName,
        actualAnimationName: animationName,
        durationMs: runtimeDurationMs,
        loop: Boolean(options.loop),
        canvasClass: canvas.className,
        hiddenSlotNames: options.hiddenSlotNames || data.hiddenSlotNames || [],
        offsetX: options.offsetX ?? data.offsetX ?? 0,
        offsetY: options.offsetY ?? data.offsetY ?? 0,
        opacity: options.opacity ?? data.opacity ?? .92,
        scale: options.scale ?? data.scale ?? 1,
      });

      return {
        atlas,
        batcher,
        bounds: { offset, size },
        canvas,
        gl,
        hiddenSlotNames: options.hiddenSlotNames || data.hiddenSlotNames || [],
        mvp,
        renderer,
        shader,
        skeleton,
        animationState,
        durationMs: runtimeDurationMs,
        animationName,
        debugLabel,
        fadeOutMs: Math.max(0, options.fadeOutMs || 0),
        hasRendered: false,
        hasViewLogged: false,
        canvasSizeCache: { width: 0, height: 0, checkedAt: 0 },
        lastTime: 0,
        offsetX: options.offsetX ?? data.offsetX ?? 0,
        offsetY: options.offsetY ?? data.offsetY ?? 0,
        opacity: options.opacity ?? data.opacity ?? .92,
        scale: options.scale ?? data.scale ?? 1,
        useOwnView: options.useOwnView === true,
        viewPadding: options.viewPadding ?? data.viewPadding ?? 1.16,
        startedAt: performance.now(),
        dispose() {
          atlas.dispose?.();
          batcher.dispose?.();
          shader.dispose?.();
        },
      };
    }

function playThorIntroFx(durationMs, token, options = {}) {
      const fxConfig = options.fxConfig || thorIntroFxConfig;
      if (!fxConfig) {
        logThorFx("Skip intro FX: no config");
        return;
      }
      if (!options.force && fxConfig.enabled === false) {
        logThorFx("Skip intro FX: disabled");
        return;
      }
      if (!activeBossSpine?.runtime) {
        logThorFx("Skip intro FX: no Spine runtime");
        return;
      }
      logThorFx("Start intro FX", {
        durationMs,
        token,
        mode: options.mode || "default",
        force: Boolean(options.force),
        sourceGlobal: fxConfig.sourceGlobal || "",
      });

      void loadThorIntroFxData(fxConfig).then((data) => {
        const runtime = activeBossSpine?.runtime;
        if (!data || !runtime || runtime.introToken !== token) {
          logThorFx("Intro FX skipped after load", {
            hasData: Boolean(data),
            hasRuntime: Boolean(runtime),
            expectedToken: token,
            currentToken: runtime?.introToken,
          });
          return;
        }

        const isOpeningFx = options.mode === "opening";
        const runtimeOptions = isOpeningFx
          ? {
            label: "intro FX",
            hiddenSlotNames: fxConfig.openingHiddenSlots || data.hiddenSlotNames,
            offsetX: fxConfig.openingOffsetX ?? data.offsetX,
            offsetY: fxConfig.openingOffsetY ?? data.offsetY,
            opacity: fxConfig.openingOpacity ?? data.opacity,
            scale: fxConfig.openingScale ?? data.scale,
            useOwnView: true,
            viewPadding: fxConfig.openingViewPadding ?? 1.16,
          }
          : { label: "intro FX" };
        let fxRuntime = null;
        try {
          fxRuntime = createThorIntroFxRuntime(data, durationMs, runtimeOptions);
        } catch (error) {
          warnThorFx("Intro FX runtime failed", error);
        }
        if (!fxRuntime || activeBossSpine?.runtime !== runtime || runtime.introToken !== token) {
          logThorFx("Intro FX runtime discarded", {
            hasFxRuntime: Boolean(fxRuntime),
            expectedToken: token,
            currentToken: runtime.introToken,
          });
          return;
        }

        disposeThorIntroFx();
        activeThorIntroFx = fxRuntime;
        logThorFx("Intro FX started", {
          animationName: fxRuntime.animationName,
          durationMs: fxRuntime.durationMs,
          canvasClass: fxRuntime.canvas.className,
        });
      });
    }

function playThorIntroFxOnly(options = {}) {
      const runtime = activeBossSpine?.runtime;
      if (!runtime) {
        logThorFx("Skip intro-only FX: no Spine runtime");
        return 0;
      }

      const fxConfig = options.fxConfig || thorIntroEntryFxConfig || thorIntroFxConfig;
      const durationMs = Math.max(120, options.durationMs || runtime.introDurationMs || 760);
      const introLead = Math.max(0, Number.isFinite(options.strikeLeadMs)
        ? options.strikeLeadMs
        : (runtime.introStrikeLeadMs || 300));
      playThorIntroFx(durationMs, runtime.introToken, {
        fxConfig,
        force: true,
        mode: options.mode || "opening",
      });
      return introLead;
    }
function updateThorIntroFx(runtime, elapsed, now) {
      const fx = activeThorIntroFx;
      if (!fx) return null;

      const age = now - fx.startedAt;
      if (age >= fx.durationMs) {
        disposeThorIntroFx();
        return null;
      }

      fx.animationState.update(elapsed);
      fx.animationState.apply(fx.skeleton);
      fx.hiddenSlotNames.forEach((slotName) => {
        const slot = fx.skeleton.findSlot(slotName);
        if (slot) slot.setAttachment(null);
      });
      fx.skeleton.x = fx.offsetX;
      fx.skeleton.y = (runtime.skeleton?.y || 0) + fx.offsetY;
      fx.skeleton.scaleX = fx.scale;
      fx.skeleton.scaleY = fx.scale;
      if (fx.skeleton.color) {
        fx.skeleton.color.a = fx.opacity;
      }
      fx.skeleton.updateWorldTransform();
      if (!fx.hasRendered) {
        fx.hasRendered = true;
        logThorFx("主角同步FX進入渲染幀", {
          animationName: fx.animationName,
          ageMs: Math.round(age),
          canvasClass: fx.canvas.className,
          opacity: fx.opacity,
          scale: fx.scale,
          offsetX: fx.offsetX,
          offsetY: fx.offsetY,
        });
      }
      return fx;
    }

function disposeThorScoreBackFx(fx) {
      if (!fx) return;
      fx.dispose?.();
      fx.canvas?.remove();
    }

function clearThorScoreBackFx() {
      activeThorScoreBackFx.splice(0).forEach(disposeThorScoreBackFx);
      if (thorScoreBackFxFrameId) {
        cancelAnimationFrame(thorScoreBackFxFrameId);
        thorScoreBackFxFrameId = 0;
      }
    }

function renderThorScoreBackFx(now) {
      for (let index = activeThorScoreBackFx.length - 1; index >= 0; index -= 1) {
        const fx = activeThorScoreBackFx[index];
        const age = now - fx.startedAt;
        if (age >= fx.durationMs || !fx.canvas.isConnected) {
          activeThorScoreBackFx.splice(index, 1);
          disposeThorScoreBackFx(fx);
          continue;
        }

        const { targetWidth, targetHeight } = resolveCanvasRenderSize(fx.canvas, fx.canvasSizeCache, now, {
          dprLimit: spineFxDprLimit,
          fallbackWidth: 220,
          fallbackHeight: 140,
        });

        const elapsed = fx.lastTime ? Math.min((now / 1000) - fx.lastTime, .05) : 0;
        fx.lastTime = now / 1000;
        const fadeOutMs = Math.max(0, fx.fadeOutMs || 0);
        const fadeAlpha = fadeOutMs > 0
          ? Math.max(0, Math.min(1, (fx.durationMs - age) / fadeOutMs))
          : 1;
        fx.canvas.style.opacity = String(fadeAlpha);
        fx.animationState.update(elapsed);
        fx.animationState.apply(fx.skeleton);
        fx.hiddenSlotNames.forEach((slotName) => {
          const slot = fx.skeleton.findSlot(slotName);
          if (slot) slot.setAttachment(null);
        });
        fx.skeleton.x = fx.offsetX;
        fx.skeleton.y = fx.offsetY;
        fx.skeleton.scaleX = fx.scale;
        fx.skeleton.scaleY = fx.scale;
        if (fx.skeleton.color) {
          fx.skeleton.color.a = fx.opacity;
        }
        fx.skeleton.updateWorldTransform();

        const gl = fx.gl;
        const spineRuntime = window.spine;
        const offset = fx.bounds.offset;
        const size = fx.bounds.size;
        const centerX = offset.x + size.x / 2;
        const centerY = offset.y + size.y / 2;
        const padding = Math.max(.2, fx.viewPadding || 1.16);
        const viewScale = Math.max(size.x / targetWidth, size.y / targetHeight) * padding;
        const viewWidth = targetWidth * viewScale;
        const viewHeight = targetHeight * viewScale;

        gl.viewport(0, 0, targetWidth, targetHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        fx.mvp.ortho2d(centerX - viewWidth / 2, centerY - viewHeight / 2, viewWidth, viewHeight);
        fx.shader.bind();
        fx.shader.setUniformi(spineRuntime.webgl.Shader.SAMPLER, 0);
        fx.shader.setUniform4x4f(spineRuntime.webgl.Shader.MVP_MATRIX, fx.mvp.values);
        fx.batcher.begin(fx.shader);
        fx.renderer.draw(fx.batcher, fx.skeleton);
        fx.batcher.end();
        fx.shader.unbind();
        if (!fx.hasRendered) {
          fx.hasRendered = true;
          logThorFx("分數襯底FX進入渲染幀", {
            label: fx.debugLabel,
            animationName: fx.animationName,
            canvasClass: fx.canvas.className,
            width: targetWidth,
            height: targetHeight,
            opacity: fx.opacity,
            scale: fx.scale,
            offsetX: fx.offsetX,
            offsetY: fx.offsetY,
          });
        }
      }

      thorScoreBackFxFrameId = activeThorScoreBackFx.length
        ? requestAnimationFrame(renderThorScoreBackFx)
        : 0;
    }

function startThorScoreBackFxRenderer() {
      if (!thorScoreBackFxFrameId) {
        thorScoreBackFxFrameId = requestAnimationFrame(renderThorScoreBackFx);
      }
    }

function shouldCreateThorScoreBackFx(point) {
      if (!thorIntroFxConfig || activeThorSpawnRun || activeCharacterKey !== "god10101") return false;
      if (activeCharacter.legacyLightning || point.legacyLightning) return false;
      const maxStrike = Number(thorIntroFxConfig.scoreLoopMaxStrike ?? 6);
      const strikeNumber = Number(point.configuredStrikeNumber);
      return Number.isFinite(strikeNumber) && strikeNumber > 0 && strikeNumber <= maxStrike;
    }

function createThorScoreBackFx(point, runId) {
      const strikeNumber = Number(point.configuredStrikeNumber);
      if (!shouldCreateThorScoreBackFx(point)) {
        if (activeCharacterKey === "god10101") {
          logThorFx("略過分數襯底FX", {
            strikeNumber,
            activeThorSpawnRun,
            legacyLightning: Boolean(activeCharacter.legacyLightning || point.legacyLightning),
            score: point.score,
          });
        }
        return;
      }

      const scoreX = Number(point.scoreX ?? point.x);
      const scoreY = Number(point.scoreY ?? point.y);
      const strong = isStrongLightningPoint(point);
      const screenOffsetY = Number(thorIntroFxConfig.scoreLoopScreenOffsetY || 0);
      const scorePoint = {
        x: Number.isFinite(scoreX) ? scoreX : 50,
        y: Number.isFinite(scoreY) ? scoreY - (strong ? 6.5 : 5.5) + screenOffsetY : 50,
      };
      const canvas = document.createElement("canvas");
      canvas.className = "thor-score-back-fx";
      setPoint(canvas, scorePoint);
      canvas.style.setProperty("--score-fx-width", `${Number(thorIntroFxConfig.scoreLoopWidth || 230)}px`);
      canvas.style.setProperty("--score-fx-height", `${Number(thorIntroFxConfig.scoreLoopHeight || 150)}px`);
      scoreGatherLayer.append(canvas);
      logThorFx("準備建立分數襯底FX", {
        strikeNumber,
        score: point.score,
        scorePoint,
        canvasClass: canvas.className,
      });

      void loadThorIntroFxData().then((data) => {
        if (!data || runId !== sequenceId || !canvas.isConnected) {
          logThorFx("分數襯底FX取消建立：資料或runId不一致", {
            strikeNumber,
            hasData: Boolean(data),
            expectedRunId: runId,
            currentRunId: sequenceId,
            canvasConnected: canvas.isConnected,
          });
          canvas.remove();
          return;
        }

        let fxRuntime = null;
        try {
          fxRuntime = createThorIntroFxRuntime(data, thorIntroFxConfig.scoreLoopDurationMs || 5000, {
            animationName: thorIntroFxConfig.scoreLoopAnimation || "Fish_20101_Gacha_Loop",
            canvas,
            label: `第${strikeNumber}次開分分數襯底FX`,
            hiddenSlotNames: thorIntroFxConfig.scoreLoopHiddenSlots || data.hiddenSlotNames,
            loop: true,
            offsetX: thorIntroFxConfig.scoreLoopOffsetX ?? 0,
            offsetY: thorIntroFxConfig.scoreLoopOffsetY ?? -26,
            opacity: thorIntroFxConfig.scoreLoopOpacity ?? .78,
            scale: thorIntroFxConfig.scoreLoopScale ?? 1,
            viewPadding: thorIntroFxConfig.scoreLoopViewPadding ?? 1.16,
            fadeOutMs: thorIntroFxConfig.scoreLoopFadeOutMs ?? 0,
          });
        } catch (error) {
          warnThorFx("分數襯底FX建立失敗", error);
        }

        if (!fxRuntime || runId !== sequenceId || !canvas.isConnected) {
          logThorFx("分數襯底FX取消套用", {
            strikeNumber,
            hasFxRuntime: Boolean(fxRuntime),
            expectedRunId: runId,
            currentRunId: sequenceId,
            canvasConnected: canvas.isConnected,
          });
          disposeThorScoreBackFx(fxRuntime);
          canvas.remove();
          return;
        }

        activeThorScoreBackFx.push(fxRuntime);
        startThorScoreBackFxRenderer();
        logThorFx("分數襯底FX已開始", {
          strikeNumber,
          animationName: fxRuntime.animationName,
          durationMs: fxRuntime.durationMs,
          canvasClass: fxRuntime.canvas.className,
        });
      });
    }

async function startBossSpineCharacter(characterKey) {
      const loadId = bossSpineLoadId + 1;
      bossSpineLoadId = loadId;
      disposeThorIntroFx();
      clearBossSpineAfterimages();
      if (bossSpineFrameId) {
        cancelAnimationFrame(bossSpineFrameId);
        bossSpineFrameId = 0;
      }
      if (activeBossSpine?.dispose) {
        activeBossSpine.dispose();
      }
      activeBossSpine = null;

      const canvas = ensureBossSpineCanvas();
      canvas.style.display = "block";
      boss.classList.add("boss--spine");
      bossImage.style.display = "none";

      const data = await loadSpineCharacterData(characterKey).catch(() => null);
      if (!data || loadId !== bossSpineLoadId) return;
      const images = await loadSpinePageImages(data);
      if (loadId !== bossSpineLoadId) return;

      let runtime = null;
      try {
        runtime = createBossSpineRuntime(data, images);
      } catch (error) {
        console.warn(error);
      }
      if (!runtime) {
        showBossSpineFallback(canvas);
        return;
      }

      activeBossSpine = {
        data,
        runtime,
        startedAt: performance.now(),
        dispose: () => runtime.dispose(),
      };

      if (!bossSpineFrameId) {
        bossSpineFrameId = requestAnimationFrame(renderBossSpineCharacter);
      }
    }

function playBossSpineIntroFade(durationMs) {
      if (!bossSpineCanvas || !durationMs) return;

      window.clearTimeout(bossSpineIntroFadeTimer);
      bossSpineCanvas.style.setProperty("--boss-spine-intro-fade-ms", `${durationMs}ms`);
      bossSpineCanvas.classList.remove("is-intro-fade-in");
      void bossSpineCanvas.offsetWidth;
      bossSpineCanvas.classList.add("is-intro-fade-in");

      bossSpineIntroFadeTimer = window.setTimeout(() => {
        bossSpineCanvas?.classList.remove("is-intro-fade-in");
        bossSpineIntroFadeTimer = 0;
      }, durationMs + 80);
    }

function clearBossSpineAfterimages() {
      bossSpineAfterimageTimers.forEach((timer) => window.clearTimeout(timer));
      bossSpineAfterimageTimers = [];
      boss.classList.remove("is-intro-impact-pulse");
      boss.querySelectorAll(".boss-spine-afterimage").forEach((element) => element.remove());
    }

function createBossSpineAfterimageLayer(settings = {}, layerIndex = 0, token = 0) {
      const runtime = activeBossSpine?.runtime;
      if (!bossSpineCanvas || !runtime || runtime.introToken !== token || !bossSpineCanvas.width || !bossSpineCanvas.height) {
        return false;
      }

      const overlay = document.createElement("canvas");
      overlay.className = "boss-spine-afterimage";
      overlay.width = bossSpineCanvas.width;
      overlay.height = bossSpineCanvas.height;
      const durationMs = Math.max(120, Number(settings.durationMs || 320));
      const scale = Math.max(1.02, Number(settings.scale || 1.42) + layerIndex * .035);
      const midScale = 1 + (scale - 1) * .68;
      const opacity = Math.max(0, Math.min(1, Number(settings.opacity ?? .42) * (1 - layerIndex * .16)));
      const midOpacity = opacity * .46;
      const blur = Math.max(0, Number(settings.blur ?? 3.2) + layerIndex * .8);
      const y = Number(settings.y ?? 0);
      const endY = Number.isFinite(settings.endY) ? Number(settings.endY) : y;
      overlay.style.setProperty("--afterimage-duration", `${durationMs}ms`);
      overlay.style.setProperty("--afterimage-scale", scale.toFixed(3));
      overlay.style.setProperty("--afterimage-mid-scale", midScale.toFixed(3));
      overlay.style.setProperty("--afterimage-opacity", opacity.toFixed(3));
      overlay.style.setProperty("--afterimage-mid-opacity", midOpacity.toFixed(3));
      overlay.style.setProperty("--afterimage-blur", `${blur.toFixed(2)}px`);
      overlay.style.setProperty("--afterimage-y", `${y.toFixed(2)}%`);
      overlay.style.setProperty("--afterimage-end-y", `${endY.toFixed(2)}%`);

      const ctx = overlay.getContext("2d");
      try {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.drawImage(bossSpineCanvas, 0, 0, overlay.width, overlay.height);
      } catch (error) {
        overlay.remove();
        console.warn("[雷神殘影] 無法擷取 Spine 畫面，已略過殘影", error);
        return false;
      }

      boss.append(overlay);
      const removeTimer = window.setTimeout(() => overlay.remove(), durationMs + 120);
      bossSpineAfterimageTimers.push(removeTimer);
      return true;
    }

function playBossSpineIntroImpactAfterimage(settings = {}, token = 0) {
      if (!settings?.enabled || activeCharacterKey !== "god10101" || !bossSpineCanvas) return;

      const pulseMs = Math.max(120, Number(settings.pulseMs || 260));
      const pulseScale = Math.max(1, Number(settings.pulseScale || 1.055));
      boss.style.setProperty("--intro-impact-pulse-ms", `${pulseMs}ms`);
      boss.style.setProperty("--intro-impact-pulse-scale", pulseScale.toFixed(3));
      boss.classList.remove("is-intro-impact-pulse");
      void boss.offsetWidth;
      boss.classList.add("is-intro-impact-pulse");
      const pulseTimer = window.setTimeout(() => boss.classList.remove("is-intro-impact-pulse"), pulseMs + 80);
      bossSpineAfterimageTimers.push(pulseTimer);

      const layers = Math.max(1, Math.min(4, Math.round(Number(settings.layers || 3))));
      const intervalMs = Math.max(0, Number(settings.intervalMs || 34));
      for (let index = 0; index < layers; index += 1) {
        const timer = window.setTimeout(() => {
          if (activeBossSpine?.runtime?.introToken === token) {
            createBossSpineAfterimageLayer(settings, index, token);
          }
        }, index * intervalMs);
        bossSpineAfterimageTimers.push(timer);
      }
    }

function getBossSpineAfterimageVisualMs(settings = {}) {
      if (!settings?.enabled) return 0;

      const pulseMs = Math.max(120, Number(settings.pulseMs || 260));
      const durationMs = Math.max(120, Number(settings.durationMs || 320));
      const layers = Math.max(1, Math.min(4, Math.round(Number(settings.layers || 3))));
      const intervalMs = Math.max(0, Number(settings.intervalMs || 34));
      return Math.max(pulseMs, durationMs + (layers - 1) * intervalMs);
    }

function scheduleBossSpineIntroImpactAfterimage(settings = {}, token = 0, delayMs = 0) {
      if (!settings?.enabled) return 0;

      const timer = window.setTimeout(() => {
        if (activeBossSpine?.runtime?.introToken === token) {
          playBossSpineIntroImpactAfterimage(settings, token);
        }
      }, Math.max(0, delayMs));
      bossSpineAfterimageTimers.push(timer);
      return timer;
    }

function playBossSpineLoopFadeOut(durationMs) {
      if (!bossSpineCanvas || !durationMs || !bossSpineCanvas.width || !bossSpineCanvas.height) return;

      const overlay = ensureBossSpineLoopFadeCanvas();
      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      window.clearTimeout(bossSpineLoopFadeTimer);
      overlay.width = bossSpineCanvas.width;
      overlay.height = bossSpineCanvas.height;
      overlay.style.setProperty("--boss-spine-loop-fade-ms", `${durationMs}ms`);
      overlay.classList.remove("is-loop-fade-out");
      overlay.style.display = "block";

      try {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        ctx.drawImage(bossSpineCanvas, 0, 0, overlay.width, overlay.height);
      } catch (error) {
        overlay.style.display = "none";
        return;
      }

      void overlay.offsetWidth;
      overlay.classList.add("is-loop-fade-out");
      bossSpineLoopFadeTimer = window.setTimeout(() => {
        overlay.classList.remove("is-loop-fade-out");
        overlay.style.display = "none";
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        bossSpineLoopFadeTimer = 0;
      }, durationMs + 80);
    }

function createBossSpineIntroHeightMatch(runtime, startTime, sourceDuration, durationMs, token) {
      const animation = activeBossSpine?.data?.skeleton?.animations?.[runtime.introAnimationName];
      const boneNames = runtime.introHeightMatchBones || [];
      if (!animation || !boneNames.length) return null;

      const items = boneNames.map((boneName) => {
        const translateKeys = animation.bones?.[boneName]?.translate;
        if (!Array.isArray(translateKeys) || !translateKeys.length) return null;

        const firstY = sampleSpineNumberTimeline(translateKeys, startTime, "y", 0);
        const lastKey = translateKeys[translateKeys.length - 1];
        const targetSourceTime = Math.max(startTime, Math.min(startTime + sourceDuration, getSpineKeyTime(lastKey)));
        const targetY = sampleSpineNumberTimeline(translateKeys, targetSourceTime, "y", firstY);

        if (!Number.isFinite(firstY) || !Number.isFinite(targetY) || Math.abs(firstY - targetY) < .5) {
          return null;
        }

        return {
          boneName,
          endSourceTime: targetSourceTime,
          targetY,
          translateKeys,
        };
      }).filter(Boolean);

      if (!items.length) return null;

      return {
        durationMs,
        items,
        sourceDuration,
        startTime,
        startedAt: performance.now(),
        token,
      };
    }

function applyBossSpineIntroHeightMatch(runtime, now) {
      const match = runtime?.introHeightMatch;
      if (!match || match.token !== runtime.introToken) return;

      const elapsedMs = Math.max(0, now - match.startedAt);
      const sourceProgress = Math.max(0, Math.min(1, elapsedMs / Math.max(1, match.durationMs)));
      const sourceTime = match.startTime + match.sourceDuration * sourceProgress;
      let hasActiveCorrection = false;

      match.items.forEach((item) => {
        if (sourceTime > item.endSourceTime) return;

        const bone = runtime.skeleton.findBone(item.boneName);
        if (!bone) return;

        const animatedY = sampleSpineNumberTimeline(item.translateKeys, sourceTime, "y", item.targetY);
        const correctionY = item.targetY - animatedY;
        if (Math.abs(correctionY) < .01) return;

        bone.y += correctionY;
        hasActiveCorrection = true;
      });

      if (!hasActiveCorrection && sourceTime >= Math.max(...match.items.map((item) => item.endSourceTime))) {
        runtime.introHeightMatch = null;
      }
    }

function createBossSpineIntroScaleMatch(runtime, token) {
      const startScale = Number(runtime.introStartScale);
      const recoverMs = Number(runtime.introScaleRecoverMs);
      if (!Number.isFinite(startScale) || !Number.isFinite(recoverMs) || startScale <= 0 || startScale >= 1 || recoverMs <= 0) {
        return null;
      }

      return {
        recoverMs,
        startScale,
        startedAt: performance.now(),
        token,
      };
    }

function setBossSpineAnimationScale(runtime, scale = 1) {
      if (!runtime?.skeleton) return;
      const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
      runtime.currentAnimationScale = nextScale;
      runtime.skeleton.scaleX = nextScale;
      runtime.skeleton.scaleY = nextScale;
    }

function setBossSpineAnimationOffsetY(runtime, offsetY = 0) {
      if (!runtime) return;
      runtime.currentAnimationOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
    }

function resetBossSpineIntroScale(runtime) {
      if (!runtime?.skeleton) return;
      setBossSpineAnimationScale(runtime, runtime.currentAnimationScale || 1);
      runtime.introScaleMatch = null;
    }

function applyBossSpineIntroScaleMatch(runtime, now) {
      const match = runtime?.introScaleMatch;
      if (!match || match.token !== runtime.introToken) {
        return;
      }

      const progress = Math.max(0, Math.min(1, (now - match.startedAt) / Math.max(1, match.recoverMs)));
      const eased = progress * progress * (3 - 2 * progress);
      const scale = match.startScale + (1 - match.startScale) * eased;
      runtime.skeleton.scaleX = scale;
      runtime.skeleton.scaleY = scale;

      if (progress >= 1) {
        resetBossSpineIntroScale(runtime);
      }
    }

function holdBossSpineLoopTailPose(runtime, loopAnimation) {
      const tailStart = Math.max(0, loopAnimation.duration - 1 / 30);
      runtime.animationState.timeScale = 0;
      const tailEntry = runtime.animationState.setAnimation(0, runtime.loopAnimationName, false);
      tailEntry.animationStart = tailStart;
      tailEntry.animationEnd = loopAnimation.duration;
      tailEntry.trackEnd = Math.max(.001, loopAnimation.duration - tailStart);
      tailEntry.mixDuration = 0;
      runtime.animationState.update(0);
      runtime.animationState.apply(runtime.skeleton);
      runtime.skeleton.updateWorldTransform();
      runtime.lastTime = performance.now() / 1000;
    }

function getBossSpineIntroTotalMs(runtime, options = {}) {
      if (!runtime?.introAnimationName || !runtime.skeleton?.data) return 0;

      const introAnimation = runtime.skeleton.data.findAnimation(runtime.introAnimationName);
      if (!introAnimation) return 0;

      const endTime = introAnimation.duration;
      const requestedStartTime = Number.isFinite(options.startTime)
        ? options.startTime
        : (Number.isFinite(options.startProgress)
          ? endTime * Math.max(0, Math.min(.98, options.startProgress))
          : (runtime.introStartTime || 0));
      const startTime = Math.max(0, Math.min(requestedStartTime, Math.max(0, endTime - .01)));
      const sourceDuration = Math.max(.01, endTime - startTime);
      const baseDurationMs = Number.isFinite(options.durationMs)
        ? options.durationMs
        : (runtime.introDurationMs || sourceDuration * 1000);
      const durationMs = Math.max(120, options.scaleDurationToRange
        ? baseDurationMs * (sourceDuration / Math.max(.01, endTime))
        : baseDurationMs);
      const loopTailHoldMs = options.useLoopTailHold === false ? 0 : Math.max(0, runtime.introLoopTailHoldMs || 0);
      return loopTailHoldMs + durationMs;
    }

function getBossSpineAnimationTotalMs(runtime, animationName, durationMs = 0) {
      if (!runtime?.skeleton?.data || !animationName) return 0;

      const animation = runtime.skeleton.data.findAnimation(animationName);
      if (!animation) return 0;

      return Math.max(120, durationMs || animation.duration * 1000);
    }

function playBossSpineOneShot(animationName, options = {}) {
      const runtime = activeBossSpine?.runtime;
      if (!runtime?.skeleton?.data || !animationName) return 0;

      const animation = runtime.skeleton.data.findAnimation(animationName);
      if (!animation) return 0;

      const sourceDuration = Math.max(.01, animation.duration || .01);
      const durationMs = Math.max(120, options.durationMs || sourceDuration * 1000);
      const token = runtime.introToken + 1;
      runtime.introToken = token;
      window.clearTimeout(runtime.introTimer);
      window.clearTimeout(runtime.introSoundTimer);
      window.clearTimeout(runtime.introAfterimageTimer);
      runtime.introHeightMatch = null;
      runtime.introScaleMatch = null;
      clearBossSpineAfterimages();
      const animationScale = Number.isFinite(options.animationScale) && options.animationScale > 0
        ? options.animationScale
        : (runtime.currentAnimationScale || 1);
      const returnAnimationScale = Number.isFinite(options.returnAnimationScale) && options.returnAnimationScale > 0
        ? options.returnAnimationScale
        : 1;
      const animationOffsetY = Number.isFinite(options.animationOffsetY)
        ? options.animationOffsetY
        : (runtime.currentAnimationOffsetY || 0);
      const returnAnimationOffsetY = Number.isFinite(options.returnAnimationOffsetY)
        ? options.returnAnimationOffsetY
        : 0;
      setBossSpineAnimationScale(runtime, animationScale);
      setBossSpineAnimationOffsetY(runtime, animationOffsetY);
      disposeThorIntroFx();

      if (options.playLoopFade) {
        playBossSpineLoopFadeOut(options.loopFadeMs ?? runtime.introLoopFadeOutMs ?? 0);
      }

      runtime.animationState.timeScale = sourceDuration / (durationMs / 1000);
      const entry = runtime.animationState.setAnimation(0, animationName, false);
      entry.animationStart = 0;
      entry.animationEnd = sourceDuration;
      entry.trackEnd = sourceDuration;
      entry.mixDuration = options.mixDuration ?? .08;
      runtime.animationState.update(0);
      runtime.animationState.apply(runtime.skeleton);
      runtime.skeleton.updateWorldTransform();
      runtime.lastTime = performance.now() / 1000;

      const returnAfterMs = Number.isFinite(options.returnAfterMs)
        ? Math.max(0, Math.min(durationMs, options.returnAfterMs))
        : durationMs;
      runtime.introTimer = window.setTimeout(() => {
        if (!activeBossSpine?.runtime || activeBossSpine.runtime !== runtime || runtime.introToken !== token) {
          return;
        }
        runtime.animationState.timeScale = 1;
        setBossSpineAnimationScale(runtime, returnAnimationScale);
        setBossSpineAnimationOffsetY(runtime, returnAnimationOffsetY);
        const returnAnimationName = options.returnAnimationName || runtime.loopAnimationName;
        const loopEntry = runtime.animationState.setAnimation(0, returnAnimationName, true);
        loopEntry.mixDuration = options.returnMixDuration ?? .12;
      }, returnAfterMs);

      return durationMs;
    }

function playBossSpineIntroOnce(options = {}) {
      const runtime = activeBossSpine?.runtime;
      if (!runtime?.introAnimationName || !runtime.skeleton?.data) return 0;

      const introAnimation = runtime.skeleton.data.findAnimation(runtime.introAnimationName);
      const loopAnimation = runtime.skeleton.data.findAnimation(runtime.loopAnimationName);
      if (!introAnimation || !loopAnimation) return 0;

      const endTime = introAnimation.duration;
      const requestedStartTime = Number.isFinite(options.startTime)
        ? options.startTime
        : (Number.isFinite(options.startProgress)
          ? endTime * Math.max(0, Math.min(.98, options.startProgress))
          : (runtime.introStartTime || 0));
      const startTime = Math.max(0, Math.min(requestedStartTime, Math.max(0, endTime - .01)));
      const sourceDuration = Math.max(.01, endTime - startTime);
      const baseDurationMs = Number.isFinite(options.durationMs)
        ? options.durationMs
        : (runtime.introDurationMs || sourceDuration * 1000);
      const durationMs = Math.max(120, options.scaleDurationToRange
        ? baseDurationMs * (sourceDuration / Math.max(.01, endTime))
        : baseDurationMs);
      const loopTailHoldMs = options.useLoopTailHold === false ? 0 : Math.max(0, runtime.introLoopTailHoldMs || 0);
      const introFxConfig = options.introFxConfig || thorIntroFxConfig;
      const shouldPlayFx = Boolean(options.forceFx) || (options.playFx !== false && introFxConfig?.enabled !== false);
      const shouldPlayLoopFade = options.playLoopFade !== false;
      const shouldPlaySound = options.playSound !== false;
      const shouldUseHeightMatch = options.useHeightMatch !== false;
      const shouldUseScaleMatch = options.useScaleMatch !== false;
      const token = runtime.introToken + 1;
      runtime.introToken = token;
      window.clearTimeout(runtime.introTimer);
      window.clearTimeout(runtime.introSoundTimer);
      window.clearTimeout(runtime.introAfterimageTimer);
      clearBossSpineAfterimages();
      setBossSpineAnimationScale(runtime, 1);
      setBossSpineAnimationOffsetY(runtime, 0);
      disposeThorIntroFx();

      const impactTime = Math.max(startTime, Math.min(runtime.introImpactTime ?? startTime, endTime));
      const computedLead = Math.round(((impactTime - startTime) / sourceDuration) * durationMs);
      const introLead = Math.max(0, Number.isFinite(options.strikeLeadMs)
        ? options.strikeLeadMs
        : (Number.isFinite(runtime.introStrikeLeadMs) ? runtime.introStrikeLeadMs : computedLead));
      const soundTime = Number.isFinite(runtime.introSoundTime)
        ? Math.max(startTime, Math.min(runtime.introSoundTime, endTime))
        : endTime;
      const soundLead = Math.max(0, Math.min(durationMs, Math.round(((soundTime - startTime) / sourceDuration) * durationMs)));

      function startIntro() {
        if (!activeBossSpine?.runtime || activeBossSpine.runtime !== runtime || runtime.introToken !== token) {
          return;
        }

        if (shouldPlayLoopFade) {
          playBossSpineLoopFadeOut(options.loopFadeMs ?? runtime.introLoopFadeOutMs ?? 0);
        }
        playBossSpineIntroFade(runtime.introFadeMs || 0);
        runtime.animationState.timeScale = sourceDuration / (durationMs / 1000);
        runtime.introHeightMatch = shouldUseHeightMatch
          ? createBossSpineIntroHeightMatch(runtime, startTime, sourceDuration, durationMs, token)
          : null;
        runtime.introScaleMatch = shouldUseScaleMatch ? createBossSpineIntroScaleMatch(runtime, token) : null;
        const entry = runtime.animationState.setAnimation(0, runtime.introAnimationName, false);
        entry.animationStart = startTime;
        entry.animationEnd = endTime;
        entry.trackEnd = sourceDuration;
        entry.mixDuration = options.mixDuration ?? runtime.introMixDuration ?? .12;
        runtime.animationState.update(0);
        runtime.animationState.apply(runtime.skeleton);
        applyBossSpineIntroHeightMatch(runtime, performance.now());
        applyBossSpineIntroScaleMatch(runtime, performance.now());
        runtime.skeleton.updateWorldTransform();
        runtime.lastTime = performance.now() / 1000;
        if (shouldPlayFx) {
          playThorIntroFx(durationMs, token, {
            fxConfig: introFxConfig,
            force: Boolean(options.forceFx),
            mode: options.fxMode || (options.forceFx ? "opening" : "default"),
          });
        }

        runtime.introDrop = runtime.introDropLift > 0
          ? {
            durationMs: Math.max(120, runtime.introDropDurationMs || introLead + 180, introLead + 120),
            holdMs: runtime.introDropHoldMs || 0,
            impactMs: introLead,
            lift: runtime.introDropLift,
            overshoot: runtime.introDropOvershoot || 0,
            startedAt: performance.now(),
          }
          : null;

        if (shouldPlaySound) {
          runtime.introSoundTimer = window.setTimeout(() => {
            if (!activeBossSpine?.runtime || activeBossSpine.runtime !== runtime || runtime.introToken !== token) {
              return;
            }
            playThorGroundSound();
          }, soundLead);
        }

        const afterimageSettings = options.afterimage === null
          ? null
          : (options.afterimage || runtime.introAfterimage);
        if (afterimageSettings?.enabled) {
          const tailLeadMs = Math.max(0, Number(afterimageSettings.tailLeadMs ?? 160));
          const afterimageDelayMs = Math.max(0, durationMs - tailLeadMs);
          runtime.introAfterimageTimer = scheduleBossSpineIntroImpactAfterimage(afterimageSettings, token, afterimageDelayMs);
        }

        runtime.introTimer = window.setTimeout(() => {
          if (!activeBossSpine?.runtime || activeBossSpine.runtime !== runtime || runtime.introToken !== token) {
            return;
          }
          runtime.introHeightMatch = null;
          setBossSpineAnimationScale(runtime, 1);
          setBossSpineAnimationOffsetY(runtime, 0);
          resetBossSpineIntroScale(runtime);
          runtime.animationState.timeScale = 1;
          const loopEntry = runtime.animationState.setAnimation(0, runtime.loopAnimationName, true);
          loopEntry.mixDuration = options.returnMixDuration ?? .12;
        }, durationMs);
      }

      if (loopTailHoldMs > 0) {
        holdBossSpineLoopTailPose(runtime, loopAnimation);
        runtime.introTimer = window.setTimeout(startIntro, loopTailHoldMs);
        return loopTailHoldMs + introLead;
      }

      startIntro();

      return introLead;
    }

function getBossSpineIntroDropOffset(runtime, now) {
      const drop = runtime?.introDrop;
      if (!drop) return 0;

      const elapsed = Math.max(0, now - drop.startedAt);
      const impactMs = Math.max(60, drop.impactMs || drop.durationMs);
      const holdMs = Math.min(drop.holdMs || 0, Math.max(0, impactMs - 60));
      const durationMs = Math.max(impactMs + 80, drop.durationMs || impactMs + 160);

      if (elapsed < holdMs) {
        return drop.lift;
      }

      if (elapsed < impactMs) {
        const progress = (elapsed - holdMs) / Math.max(1, impactMs - holdMs);
        const eased = progress * progress * progress;
        return drop.lift + (drop.overshoot - drop.lift) * eased;
      }

      if (elapsed < durationMs) {
        const progress = (elapsed - impactMs) / Math.max(1, durationMs - impactMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        return drop.overshoot * (1 - eased);
      }

      if (elapsed >= durationMs) {
        runtime.introDrop = null;
        return 0;
      }

      return 0;
    }

function updateSpineBoneWorld(data, time) {
      const radians = Math.PI / 180;
      const worldBones = [];

      for (const bone of data.bones) {
        const translate = sampleSpineTimelinePair(bone.timeline.translate, time, 0, 0);
        const scale = sampleSpineTimelinePair(bone.timeline.scale, time, 1, 1);
        const shear = sampleSpineTimelinePair(bone.timeline.shear, time, 0, 0);
        const rotation = bone.rotation + sampleSpineNumberTimeline(bone.timeline.rotate, time, "angle", 0, true);
        const x = bone.x + translate.x;
        const y = bone.y + translate.y;
        const scaleX = bone.scaleX * scale.x;
        const scaleY = bone.scaleY * scale.y;
        const shearX = bone.shearX + shear.x;
        const shearY = bone.shearY + shear.y;
        const rotationX = (rotation + shearX) * radians;
        const rotationY = (rotation + 90 + shearY) * radians;
        const la = Math.cos(rotationX) * scaleX;
        const lc = Math.sin(rotationX) * scaleX;
        const lb = Math.cos(rotationY) * scaleY;
        const ld = Math.sin(rotationY) * scaleY;
        const parent = bone.parentIndex >= 0 ? worldBones[bone.parentIndex] : null;

        if (!parent) {
          worldBones.push({
            a: la,
            b: lb,
            c: lc,
            d: ld,
            x,
            y,
          });
          continue;
        }

        worldBones.push({
          a: parent.a * la + parent.b * lc,
          b: parent.a * lb + parent.b * ld,
          c: parent.c * la + parent.d * lc,
          d: parent.c * lb + parent.d * ld,
          x: parent.a * x + parent.b * y + parent.x,
          y: parent.c * x + parent.d * y + parent.y,
        });
      }

      return worldBones;
    }

function computeWeightedMeshVertices(attachment, slot, worldBones) {
      const sourceVertices = attachment.vertices || [];
      const vertexCount = (attachment.uvs || []).length / 2;
      const points = new Array(vertexCount);
      let cursor = 0;

      for (let index = 0; index < vertexCount; index += 1) {
        const boneCount = sourceVertices[cursor++];
        let x = 0;
        let y = 0;

        for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
          const world = worldBones[sourceVertices[cursor++]];
          const localX = sourceVertices[cursor++];
          const localY = sourceVertices[cursor++];
          const weight = sourceVertices[cursor++];
          x += (world.a * localX + world.b * localY + world.x) * weight;
          y += (world.c * localX + world.d * localY + world.y) * weight;
        }

        points[index] = { x, y };
      }

      return points;
    }

function getSpineSourcePoint(region, u, v) {
      const [x, y] = region.xy;
      const [width, height] = region.size;

      if (region.rotate) {
        return {
          x: x + v * width,
          y: y + (1 - u) * height,
        };
      }

      return {
        x: x + u * width,
        y: y + v * height,
      };
    }

function drawTexturedTriangle(ctx, image, sourceA, sourceB, sourceC, targetA, targetB, targetC) {
      const denominator = sourceA.x * (sourceB.y - sourceC.y)
        + sourceB.x * (sourceC.y - sourceA.y)
        + sourceC.x * (sourceA.y - sourceB.y);

      if (Math.abs(denominator) < .0001) return;

      const a = (targetA.x * (sourceB.y - sourceC.y)
        + targetB.x * (sourceC.y - sourceA.y)
        + targetC.x * (sourceA.y - sourceB.y)) / denominator;
      const b = (targetA.y * (sourceB.y - sourceC.y)
        + targetB.y * (sourceC.y - sourceA.y)
        + targetC.y * (sourceA.y - sourceB.y)) / denominator;
      const c = (targetA.x * (sourceC.x - sourceB.x)
        + targetB.x * (sourceA.x - sourceC.x)
        + targetC.x * (sourceB.x - sourceA.x)) / denominator;
      const d = (targetA.y * (sourceC.x - sourceB.x)
        + targetB.y * (sourceA.x - sourceC.x)
        + targetC.y * (sourceB.x - sourceA.x)) / denominator;
      const e = (targetA.x * (sourceB.x * sourceC.y - sourceC.x * sourceB.y)
        + targetB.x * (sourceC.x * sourceA.y - sourceA.x * sourceC.y)
        + targetC.x * (sourceA.x * sourceB.y - sourceB.x * sourceA.y)) / denominator;
      const f = (targetA.y * (sourceB.x * sourceC.y - sourceC.x * sourceB.y)
        + targetB.y * (sourceC.x * sourceA.y - sourceA.x * sourceC.y)
        + targetC.y * (sourceA.x * sourceB.y - sourceB.x * sourceA.y)) / denominator;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(targetA.x, targetA.y);
      ctx.lineTo(targetB.x, targetB.y);
      ctx.lineTo(targetC.x, targetC.y);
      ctx.closePath();
      ctx.clip();
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    }

function renderSpineMeshSlot(ctx, slot, worldBones, images, projectPoint) {
      const image = images.get(slot.region.page);
      if (!image) return;

      const worldVertices = computeWeightedMeshVertices(slot.attachment, slot, worldBones);
      const screenVertices = worldVertices.map(projectPoint);
      const uvs = slot.attachment.uvs || [];
      const sourceVertices = Array.from({ length: uvs.length / 2 }, (_, index) => (
        getSpineSourcePoint(slot.region, uvs[index * 2], uvs[index * 2 + 1])
      ));
      const alpha = sampleSpineColorAlpha(slot.colorTimeline, activeBossSpine.currentTime, slot.setupAlpha);

      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = slot.blend === "additive" ? "lighter" : "source-over";

      for (let index = 0; index < slot.attachment.triangles.length; index += 3) {
        const a = slot.attachment.triangles[index];
        const b = slot.attachment.triangles[index + 1];
        const c = slot.attachment.triangles[index + 2];
        drawTexturedTriangle(
          ctx,
          image,
          sourceVertices[a],
          sourceVertices[b],
          sourceVertices[c],
          screenVertices[a],
          screenVertices[b],
          screenVertices[c]
        );
      }

      ctx.restore();
    }

function renderBossSpineCharacter(now) {
      if (!activeBossSpine?.runtime || !bossSpineCanvas) {
        bossSpineFrameId = 0;
        return;
      }

      const runtime = activeBossSpine.runtime;
      if (runtime.renderIntervalMs && runtime.lastRenderedAt && now - runtime.lastRenderedAt < runtime.renderIntervalMs) {
        bossSpineFrameId = requestAnimationFrame(renderBossSpineCharacter);
        return;
      }
      runtime.lastRenderedAt = now;

      const { targetWidth, targetHeight } = resolveCanvasRenderSize(
        bossSpineCanvas,
        runtime.canvasSizeCache,
        now,
        {
          dprLimit: spineRenderDprLimit,
          fallbackWidth: 640,
          fallbackHeight: 930,
        }
      );
      const spineRuntime = window.spine;
      const gl = runtime.gl;
      const elapsed = runtime.lastTime ? Math.min((now / 1000) - runtime.lastTime, .05) : 0;
      runtime.lastTime = now / 1000;

      gl.viewport(0, 0, targetWidth, targetHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      runtime.animationState.update(elapsed);
      runtime.animationState.apply(runtime.skeleton);
      applyBossSpineIntroHeightMatch(runtime, now);
      applyBossSpineIntroScaleMatch(runtime, now);
      if (!runtime.introScaleMatch) {
        setBossSpineAnimationScale(runtime, runtime.currentAnimationScale || 1);
      }
      runtime.skeleton.y = (runtime.currentAnimationOffsetY || 0) + getBossSpineIntroDropOffset(runtime, now);
      runtime.skeleton.updateWorldTransform();

      const offset = runtime.bounds.offset;
      const size = runtime.bounds.size;
      const centerX = offset.x + size.x / 2;
      const centerY = offset.y + size.y / 2;
      const padding = 1.08 / Math.max(runtime.renderScale, .1);
      const viewScale = Math.max(size.x / targetWidth, size.y / targetHeight) * padding;
      const viewWidth = targetWidth * viewScale;
      const viewHeight = targetHeight * viewScale;
      runtime.mvp.ortho2d(centerX - viewWidth / 2, centerY - viewHeight / 2, viewWidth, viewHeight);

      runtime.shader.bind();
      runtime.shader.setUniformi(spineRuntime.webgl.Shader.SAMPLER, 0);
      runtime.shader.setUniform4x4f(spineRuntime.webgl.Shader.MVP_MATRIX, runtime.mvp.values);
      runtime.batcher.begin(runtime.shader);
      runtime.renderer.draw(runtime.batcher, runtime.skeleton);
      runtime.batcher.end();
      runtime.shader.unbind();

      const thorIntroFx = updateThorIntroFx(runtime, elapsed, now);
      if (thorIntroFx) {
        const fxCanvas = thorIntroFx.canvas;
        if (fxCanvas.width !== targetWidth || fxCanvas.height !== targetHeight) {
          fxCanvas.width = targetWidth;
          fxCanvas.height = targetHeight;
        }
        thorIntroFx.gl.viewport(0, 0, targetWidth, targetHeight);
        thorIntroFx.gl.clearColor(0, 0, 0, 0);
        thorIntroFx.gl.clear(thorIntroFx.gl.COLOR_BUFFER_BIT);
        let fxCenterX = centerX;
        let fxCenterY = centerY;
        let fxViewWidth = viewWidth;
        let fxViewHeight = viewHeight;
        if (thorIntroFx.useOwnView) {
          const fxOffset = thorIntroFx.bounds.offset;
          const fxSize = thorIntroFx.bounds.size;
          fxCenterX = fxOffset.x + fxSize.x / 2;
          fxCenterY = fxOffset.y + fxSize.y / 2;
          const fxPadding = Math.max(.2, thorIntroFx.viewPadding || 1.16);
          const fxViewScale = Math.max(fxSize.x / targetWidth, fxSize.y / targetHeight) * fxPadding;
          fxViewWidth = targetWidth * fxViewScale;
          fxViewHeight = targetHeight * fxViewScale;
        }
        if (!thorIntroFx.hasViewLogged) {
          thorIntroFx.hasViewLogged = true;
          logThorFx("主角同步FX取景位置", {
            animationName: thorIntroFx.animationName,
            useOwnView: thorIntroFx.useOwnView,
            centerX: Math.round(fxCenterX),
            centerY: Math.round(fxCenterY),
            viewWidth: Math.round(fxViewWidth),
            viewHeight: Math.round(fxViewHeight),
            scale: thorIntroFx.scale,
            offsetX: thorIntroFx.offsetX,
            offsetY: thorIntroFx.offsetY,
          });
        }
        thorIntroFx.mvp.ortho2d(fxCenterX - fxViewWidth / 2, fxCenterY - fxViewHeight / 2, fxViewWidth, fxViewHeight);
        thorIntroFx.shader.bind();
        thorIntroFx.shader.setUniformi(spineRuntime.webgl.Shader.SAMPLER, 0);
        thorIntroFx.shader.setUniform4x4f(spineRuntime.webgl.Shader.MVP_MATRIX, thorIntroFx.mvp.values);
        thorIntroFx.batcher.begin(thorIntroFx.shader);
        thorIntroFx.renderer.draw(thorIntroFx.batcher, thorIntroFx.skeleton);
        thorIntroFx.batcher.end();
        thorIntroFx.shader.unbind();
      }

      bossSpineFrameId = requestAnimationFrame(renderBossSpineCharacter);
    }

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
      constructor(x, y, strong = false, tone = "blue") {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = Math.min(lightningCanvasWidth * (strong ? .16 : .12), strong ? 230 : 180);
        this.rotation = Math.random() * Math.PI;
        this.alpha = 1;
        this.life = strong ? 58 : 44;
        this.strong = strong;
        this.palette = lightningTonePalettes[tone] || lightningTonePalettes.blue;
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
        lightningCtx.strokeStyle = `rgba(${this.palette.circleStroke}, ${this.alpha})`;
        lightningCtx.lineWidth = this.strong ? 4 : 3;
        lightningCtx.shadowBlur = this.strong ? 24 : 18;
        lightningCtx.shadowColor = this.palette.circleShadow;

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
      constructor(x, y, strong = false, tone = "blue") {
        this.x = x;
        this.y = y;
        this.legacy = tone === "legacy";
        const angle = Math.random() * Math.PI * 2;
        const speed = (strong ? 7 : 5) + Math.random() * (strong ? 13 : 9);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - (strong ? 8 : 5);
        this.gravity = strong ? .88 : .72;
        this.friction = .91;
        this.life = 1;
        this.decay = .04 + Math.random() * .045;
        const palette = lightningTonePalettes[tone] || lightningTonePalettes.blue;
        this.color = Math.random() > .45 ? palette.spark[0] : palette.spark[1];
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
        lightningCtx.globalCompositeOperation = this.legacy ? "lighter" : "screen";
        lightningCtx.fillStyle = this.color;
        if (!this.legacy) {
          lightningCtx.globalAlpha = this.life * (this.strong ? .82 : .7);
        }
        lightningCtx.shadowBlur = this.legacy
          ? (this.strong ? 12 : 9)
          : (this.strong ? 9 : 7);
        lightningCtx.shadowColor = this.color;
        lightningCtx.beginPath();
        lightningCtx.arc(this.x, this.y, (this.strong ? 3.4 : 2.7) * this.life, 0, Math.PI * 2);
        lightningCtx.fill();
        lightningCtx.restore();
      }
    }

class LightningBolt {
      constructor(startX, startY, endX, endY, strong = false, tone = "blue") {
        this.segments = [];
        this.legacy = tone === "legacy";
        this.alpha = this.legacy ? (strong ? 1.42 : 1.2) : (strong ? .98 : .84);
        this.strong = strong;
        this.palette = lightningTonePalettes[tone] || lightningTonePalettes.blue;
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
        lightningCtx.shadowBlur = this.legacy
          ? (this.strong ? 34 : 26)
          : (this.strong ? 24 : 18);
        lightningCtx.shadowColor = this.palette.outerShadow;
        lightningCtx.strokeStyle = `rgba(${this.palette.outerStroke}, ${this.alpha * (this.legacy ? 1 : (this.palette.outerAlpha ?? .78))})`;
        lightningCtx.lineWidth = this.legacy
          ? (this.strong ? 10 : 7)
          : (this.strong ? 8 : 5.6);
        lightningCtx.lineCap = "round";
        lightningCtx.beginPath();
        this.segments.forEach((segment) => {
          lightningCtx.moveTo(segment.x1, segment.y1);
          lightningCtx.lineTo(segment.x2, segment.y2);
        });
        lightningCtx.stroke();

        lightningCtx.shadowBlur = this.legacy
          ? (this.strong ? 12 : 9)
          : (this.strong ? 7 : 5);
        lightningCtx.shadowColor = this.palette.coreShadow;
        lightningCtx.strokeStyle = `rgba(${this.palette.coreStroke}, ${this.alpha * (this.legacy ? 1 : (this.palette.coreAlpha ?? .46))})`;
        lightningCtx.lineWidth = this.legacy
          ? (this.strong ? 3.2 : 2.4)
          : (this.strong ? 2.1 : 1.55);
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

      if (lightningCircles.length || lightningBolts.length || lightningParticles.length) {
        lightningFrameId = requestAnimationFrame(renderLightning);
      } else {
        lightningFrameId = 0;
      }
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
      activeLightningAssetEffects.forEach((effect) => effect.remove());
      activeLightningAssetEffects.clear();
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

function percentValue(value, fallback) {
      const parsed = Number.parseFloat(String(value ?? ""));
      return Number.isFinite(parsed) ? parsed : fallback;
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

function lightningScoreValue(point) {
      const value = Number(String(point.text || point.score || "").replace(/\D/g, ""));
      return Number.isFinite(value) ? value : 0;
    }

function isStrongLightningPoint(point) {
      if (activeCharacter.legacyLightning || point.legacyLightning) {
        return Boolean(point.strong);
      }
      return lightningScoreValue(point) > 1000 || Boolean(point.strong);
    }

function lightningScoreDepth(point) {
      const y = Number(point.scoreY ?? point.y);
      const depth = clampNumber((Number.isFinite(y) ? y : 62) - 40, 0, 44) / 44;
      return {
        opacity: .9 + depth * .1,
        popScale: 1.08 + depth * .14,
        scale: .92 + depth * .18,
        shadowAlpha: .5 + depth * .28,
        shadowLift: 3.2 + depth * 2.4,
      };
    }

function createLightningScore(point, runId) {
      createThorScoreBackFx(point, runId);
      const score = document.createElement("div");
      const strong = isStrongLightningPoint(point);
      const depth = lightningScoreDepth(point);
      const isThorModernLightning = activeCharacterKey === "god10101" && !activeCharacter.legacyLightning && !point.legacyLightning;
      const isBonusScore = isThorModernLightning && Number(point.configuredStrikeNumber) >= 7;
      const scoreFont = isThorModernLightning && openingScoreBitmapFont ? openingScoreBitmapFont : null;
      const hasExplicitScorePosition = Number.isFinite(Number(point.scoreX)) || Number.isFinite(Number(point.scoreY));
      const scoreX = Number(point.scoreX ?? point.x);
      const scoreY = Number(point.scoreY ?? point.y);
      const scorePoint = {
        x: Number.isFinite(scoreX) ? scoreX : 50,
        y: Number.isFinite(scoreY) ? scoreY - (hasExplicitScorePosition ? 0 : (strong ? 6.5 : 5.5)) : 50,
      };

      score.className = "lightning-score is-visible";
      if (strong) score.classList.add("is-strong");
      if (isBonusScore) score.classList.add("is-bonus-score");
      setPoint(score, scorePoint);
      score.dataset.text = point.text || "";
      score.dataset.scoreValue = String(lightningScoreValue(point));
      score.dataset.strikeNumber = Number.isFinite(Number(point.configuredStrikeNumber))
        ? String(point.configuredStrikeNumber)
        : "";
      score.dataset.textScale = String(point.textScale || (strong ? .82 : .7));
      if (!activeCharacter.legacyLightning && !point.legacyLightning) {
        score.style.setProperty("--score-depth-opacity", depth.opacity.toFixed(3));
        score.style.setProperty("--score-depth-pop", depth.popScale.toFixed(3));
        score.style.setProperty("--score-depth-scale", depth.scale.toFixed(3));
        score.style.setProperty("--score-shadow-alpha", depth.shadowAlpha.toFixed(3));
        score.style.setProperty("--score-shadow-lift", `${depth.shadowLift.toFixed(1)}px`);
      }
      setBitmapText(score, point.text || "x0", point.textScale || (strong ? .82 : .7), {
        font: scoreFont || undefined,
        opening: true,
      });
      scoreGatherLayer.append(score);
      return score;
    }

function lightningScoreByStrikeNumber(strikeNumber) {
      return scoreGatherLayer.querySelector(`.lightning-score[data-strike-number="${strikeNumber}"]`);
    }

function lightningScoreElementValue(score) {
      const value = Number(score?.dataset?.scoreValue || String(score?.dataset?.text || "").replace(/\D/g, ""));
      return Number.isFinite(value) ? value : 0;
    }

function setLightningScoreValue(score, value, scaleMultiplier = null) {
      if (!score) return;
      const text = String(Math.max(0, Math.round(value)));
      const scale = scaleMultiplier !== null && Number.isFinite(Number(scaleMultiplier))
        ? Number(scaleMultiplier)
        : Number(score.dataset.textScale || .6);
      const font = score.classList.contains("is-bonus-score") && openingScoreBitmapFont
        ? openingScoreBitmapFont
        : undefined;
      score.dataset.text = text;
      score.dataset.scoreValue = text;
      setBitmapText(score, text, scale, {
        font,
        opening: true,
      });
    }

function animateLightningScoreToAnchor(score, anchor, runId, durationMs = 520) {
      return new Promise((resolve) => {
        if (!score || !anchor || runId !== sequenceId || !score.isConnected || !anchor.isConnected) {
          resolve(false);
          return;
        }

        const scoreRect = score.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const dx = anchorRect.left + anchorRect.width / 2 - (scoreRect.left + scoreRect.width / 2);
        const dy = anchorRect.top + anchorRect.height / 2 - (scoreRect.top + scoreRect.height / 2);

        score.style.setProperty("--merge-dx", `${dx}px`);
        score.style.setProperty("--merge-dy", `${dy}px`);
        score.style.setProperty("--merge-duration", `${durationMs}ms`);
        score.classList.remove("is-visible");
        void score.offsetWidth;
        score.classList.add("is-merging-to-anchor");

        window.setTimeout(() => {
          if (runId !== sequenceId) {
            resolve(false);
            return;
          }
          score.remove();
          resolve(true);
        }, durationMs);
      });
    }

function rollLightningScoreValue(score, fromValue, toValue, durationMs, runId, scaleMultiplier = .56) {
      return new Promise((resolve) => {
        if (!score || runId !== sequenceId || !score.isConnected) {
          resolve(false);
          return;
        }

        const startedAt = performance.now();
        const start = Number(fromValue) || 0;
        const target = Number(toValue) || 0;
        const step = Math.abs(target - start) >= 100 ? 10 : 1;

        function tick(now) {
          if (runId !== sequenceId || !score.isConnected) {
            resolve(false);
            return;
          }

          const progress = Math.min(1, (now - startedAt) / Math.max(1, durationMs));
          const eased = 1 - Math.pow(1 - progress, 3);
          const rawValue = start + (target - start) * eased;
          const roundedValue = progress >= 1 ? target : Math.floor(rawValue / step) * step;
          setLightningScoreValue(score, roundedValue, scaleMultiplier);

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve(true);
          }
        }

        requestAnimationFrame(tick);
      });
    }

function playThorBonusBoostRoll(point, runId) {
      if (activeCharacterKey !== "god10101" || activeCharacter.legacyLightning || runId !== sequenceId) return;
      const targetStrikeNumber = Number(point.bonusBoostTargetStrike);
      const boostAmount = Math.max(0, Math.round(Number(point.bonusBoostAmount) || 0));
      if (!Number.isFinite(targetStrikeNumber) || boostAmount <= 0) return;

      const targetScore = lightningScoreByStrikeNumber(targetStrikeNumber);
      if (!targetScore) return;

      const startValue = lightningScoreElementValue(targetScore);
      const endValue = startValue + boostAmount;
      targetScore.classList.add("is-boost-rolling", "is-bonus-score");
      void rollLightningScoreValue(targetScore, startValue, endValue, 820, runId, Number(targetScore.dataset.textScale || .7))
        .then(() => {
          window.setTimeout(() => targetScore.classList.remove("is-boost-rolling"), 260);
        });
    }

async function playThorBonusScoreMerge(runId) {
      if (activeCharacterKey !== "god10101" || activeCharacter.legacyLightning) return false;

      const seventhScore = lightningScoreByStrikeNumber(7);
      const eighthScore = lightningScoreByStrikeNumber(8);
      const ninthScore = lightningScoreByStrikeNumber(9);
      if (!seventhScore || !eighthScore || !ninthScore) return false;

      ninthScore.classList.add("is-merge-anchor");
      const mergeSources = [seventhScore, eighthScore];
      const startTotal = lightningScoreElementValue(ninthScore);
      const mergedTotal = mergeSources.reduce((sum, score) => sum + lightningScoreElementValue(score), startTotal);
      const moved = await Promise.all(mergeSources.map((score) => (
        animateLightningScoreToAnchor(score, ninthScore, runId, 640)
      )));
      if (!moved.every(Boolean) || runId !== sequenceId) return false;

      const rollDurationMs = 1500;
      ninthScore.style.setProperty("--merge-roll-duration", `${rollDurationMs}ms`);
      ninthScore.classList.remove("is-merge-settling", "is-merge-rolling");
      void ninthScore.offsetWidth;
      ninthScore.classList.add("is-merge-rolling");
      const rolled = await rollLightningScoreValue(ninthScore, startTotal, mergedTotal, rollDurationMs, runId, .56);
      if (!rolled || runId !== sequenceId) return false;

      ninthScore.classList.remove("is-merge-rolling");
      ninthScore.classList.add("is-merge-settling");
      await sleep(420);
      if (runId !== sequenceId) return false;
      ninthScore.classList.remove("is-merge-settling");
      ninthScore.style.removeProperty("--merge-roll-duration");
      return true;
    }

function createLightningStrikeFlash(point, strong = false, tone = "blue") {
      const flash = document.createElement("div");
      flash.className = "lightning-strike-flash";
      if (strong) flash.classList.add("is-strong");
      if (tone !== "blue") flash.classList.add(`is-${tone}`);
      setPoint(flash, point);
      scoreGatherLayer.append(flash);
      window.setTimeout(() => flash.remove(), 380);
    }

function randomizeLightningPoint(point) {
      const jitter = activeCharacter.lightningJitter;
      if (!jitter || point.noJitter) return point;

      const xRange = Number(point.optionalChance) > 0
        ? (jitter.optionalX ?? jitter.x)
        : jitter.x;
      const yRange = Number(point.optionalChance) > 0
        ? (jitter.optionalY ?? jitter.y)
        : jitter.y;
      const offsetX = Number(xRange) ? (Math.random() * 2 - 1) * Number(xRange) : 0;
      const offsetY = Number(yRange) ? (Math.random() * 2 - 1) * Number(yRange) : 0;

      return {
        ...point,
        x: clampNumber(Number(point.x) + offsetX, 4, 96),
        y: clampNumber(Number(point.y) + offsetY, 8, 92),
      };
    }

function lightningToneForPoint(point) {
      if (activeCharacter.legacyLightning || point.legacyLightning) return "legacy";
      if (Number.isFinite(Number(point.bonusBoostTargetStrike))) return "gold";
      if (typeof point.optionalChance !== "number") return "blue";

      const value = lightningScoreValue(point);
      if (value >= 4000) return "gold";
      if (value >= 2000) return "purple";
      return "blue";
    }

function triggerThorFinalShock() {
      stage.classList.remove("stage--lightning-shake", "stage--thor-final-shock");
      void stage.offsetWidth;
      stage.classList.add("stage--thor-final-shock");
      window.setTimeout(() => stage.classList.remove("stage--thor-final-shock"), 720);
    }

function triggerLightningStrike(point, runId) {
      const strikePoint = randomizeLightningPoint(point);
      const tone = lightningToneForPoint(strikePoint);
      const { x, y } = stagePointToCanvas(strikePoint);
      const strong = isStrongLightningPoint(strikePoint);
      const boltCount = strong ? 2 : 1;
      const particleCount = strong ? 24 : 16;
      const scoreDigits = String(strikePoint.text || "").replace(/\D/g, "").length;
      const shouldShake = scoreDigits >= 4;
      const isThorBonusBoostStrike = Number.isFinite(Number(strikePoint.bonusBoostTargetStrike));
      const isModernThorStrike = activeCharacterKey === "god10101"
        && !activeCharacter.legacyLightning
        && !strikePoint.legacyLightning;
      const isThorFinalStrike = activeCharacterKey === "god10101"
        && !activeCharacter.legacyLightning
        && Number(strikePoint.configuredStrikeNumber) === 9;

      if (isThorFinalStrike) {
        triggerThorFinalShock();
      } else if (shouldShake) {
        stage.classList.remove("stage--lightning-shake");
        void stage.offsetWidth;
        stage.classList.add("stage--lightning-shake");
        window.setTimeout(() => stage.classList.remove("stage--lightning-shake"), strong ? 240 : 180);
      }

      const usedMobHitEffect = isModernThorStrike && createThorMobHitEffect(strikePoint, strong, tone);
      if (!usedMobHitEffect && !isModernThorStrike) {
        lightningCircles.push(new LightningMagicCircle(x, y, strong, tone));
      }
      if (strikePoint.localFlash && !usedMobHitEffect && !isModernThorStrike) {
        createLightningStrikeFlash(strikePoint, strong, tone);
      }

      if (!isModernThorStrike) {
        for (let index = 0; index < boltCount; index += 1) {
          const spread = strong ? 420 : 300;
          const startX = x + (Math.random() - .5) * spread;
          lightningBolts.push(new LightningBolt(startX, -lightningCanvasHeight * .26, x, y, strong, tone));
        }

        for (let index = 0; index < particleCount; index += 1) {
          lightningParticles.push(new LightningSpark(x, y, strong, tone));
        }
        startLightningRenderer();
      }

      if (runId === sequenceId && isThorBonusBoostStrike) {
        window.setTimeout(() => playThorBonusBoostRoll(strikePoint, runId), 120);
      } else if (runId === sequenceId) {
        createLightningScore(strikePoint, runId);
      }

      playGotchaHitLargeSound();
    }

function triggerThorIntroMobHitFx(settings = {}, runId = sequenceId) {
      if (activeCharacterKey !== "god10101" || settings.enabled === false || runId !== sequenceId) return;

      startLightningRenderer();
      const style = activeCharacter.style || {};
      const point = {
        x: clampNumber(percentValue(settings.x ?? style.impactX, 50) + Number(settings.pointOffsetX || 0), 4, 96),
        y: clampNumber(percentValue(settings.y ?? style.impactY, 72) + Number(settings.pointOffsetY || 0), 8, 94),
        noJitter: true,
      };
      const tone = settings.tone || "darkBlue";
      const strong = settings.strong !== false;

      stage.classList.remove("stage--lightning-shake");
      void stage.offsetWidth;
      stage.classList.add("stage--lightning-shake");
      window.setTimeout(() => stage.classList.remove("stage--lightning-shake"), strong ? 240 : 180);

      const created = createThorMobHitEffect(point, strong, tone, {
        className: "is-intro",
        extraLifetimeSec: Number.isFinite(settings.extraLifetimeSec) ? settings.extraLifetimeSec : .22,
        fadeMs: Number.isFinite(settings.fadeMs) ? settings.fadeMs : 820,
        layer: settings.layer,
        scaleMultiplier: Number(settings.scaleMultiplier || 1),
        zIndex: Number.isFinite(settings.zIndex) ? settings.zIndex : (settings.layer === "underBoss" ? 7 : 23),
      });
      if (!created) {
        void loadThorMobHitEffect().then(() => {
          if (runId === sequenceId) {
            createThorMobHitEffect(point, strong, tone, {
              className: "is-intro",
              extraLifetimeSec: Number.isFinite(settings.extraLifetimeSec) ? settings.extraLifetimeSec : .22,
              fadeMs: Number.isFinite(settings.fadeMs) ? settings.fadeMs : 820,
              layer: settings.layer,
              scaleMultiplier: Number(settings.scaleMultiplier || 1),
              zIndex: Number.isFinite(settings.zIndex) ? settings.zIndex : (settings.layer === "underBoss" ? 7 : 23),
            });
          }
        });
      }
      if (settings.playSound !== false) {
        playGotchaHitLargeSound();
      }
    }

function scheduleThorIntroMobHitFx(settings = {}, runId = sequenceId) {
      if (!settings || settings.enabled === false) return;
      const delayMs = Math.max(0, Number(settings.delayMs || 0));
      window.setTimeout(() => triggerThorIntroMobHitFx(settings, runId), delayMs);
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
      updateThorLogBox(null);

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
      const bossImageUrl = new URL(idleBossImage, document.baseURI).href;
      boss.style.setProperty("--boss-image-url", `url("${bossImageUrl.replace(/"/g, '\\"')}")`);
      stage.style.setProperty("--boss-impact-x", style.impactX || "50%");
      stage.style.setProperty("--boss-impact-y", style.impactY || "52%");
      bossImage.src = idleBossImage;
      if (activeCharacter.spineCharacter) {
        void startBossSpineCharacter(activeCharacter.spineCharacter);
      } else {
        stopBossSpineCharacter();
      }
    }

function cleanPrize(value) {
      const digits = String(value).replace(/\D/g, "").slice(0, 8);
      return digits || "0";
    }

function cleanDecimalInput(value, integerLimit = 8, decimalLimit = 3) {
      const raw = String(value ?? "").replace(/[^\d.]/g, "");
      const dotIndex = raw.indexOf(".");
      const integerText = (dotIndex >= 0 ? raw.slice(0, dotIndex) : raw).replace(/\D/g, "").slice(0, integerLimit);

      if (dotIndex < 0) {
        return integerText;
      }

      const decimalText = raw.slice(dotIndex + 1).replace(/\D/g, "").slice(0, decimalLimit);
      return `${integerText || "0"}.${decimalText}`;
    }

function readPositiveInputValue(input) {
      if (!input) return null;
      const value = Number.parseFloat(String(input.value || ""));
      return Number.isFinite(value) && value > 0 ? value : null;
    }

function computedPrizeFromBetOdd() {
      const bet = readPositiveInputValue(betInput);
      const odd = readPositiveInputValue(oddInput);
      if (bet === null || odd === null) return null;
      return cleanPrize(String(Math.max(0, Math.round(bet * odd))));
    }

function syncPrizeFromBetOdd() {
      const computedPrize = computedPrizeFromBetOdd();
      if (computedPrize !== null) {
        prizeInput.value = computedPrize;
      }
    }

function setThorLogField(field, text) {
      const target = thorLogBox?.querySelector(`[data-log-field="${field}"]`);
      if (target) target.textContent = text;
    }

function formatThorOddValue(odd) {
      const value = Number(odd);
      if (!Number.isFinite(value)) return "";
      return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    }

function updateThorLogBox(decision = null) {
      if (!thorLogBox) return;

      if (!decision) {
        thorLogBox.classList.add("is-inactive");
        setThorLogField("oddRange", "-");
        setThorLogField("bonusState", "-");
        setThorLogField("bonusCount", "-");
        return;
      }

      const totalStrikeCount = Number(decision.totalStrikeCount || decision.splitCount || 6);
      const bonusCount = Math.max(0, totalStrikeCount - 6);
      const oddText = formatThorOddValue(decision.odd);
      const rangeText = decision.rangeLabel
        ? `${decision.rangeLabel}${oddText ? ` / ${oddText}` : ""}`
        : oddText
        ? `未命中 / ${oddText}`
        : "未填 ODD";
      const bonusState = bonusCount > 0 ? "有" : "無";
      const sourceText = decision.sourceLabel || (decision.forced ? "手動" : "ODD級距");

      thorLogBox.classList.remove("is-inactive");
      setThorLogField("oddRange", rangeText);
      setThorLogField("bonusState", `${bonusState} / ${sourceText}`);
      setThorLogField("bonusCount", `${bonusCount}次 / 共${totalStrikeCount}次`);
    }

function resolveRunTotals() {
      const bet = readPositiveInputValue(betInput);
      const odd = readPositiveInputValue(oddInput);
      let prize = computedPrizeFromBetOdd();

      if (prize === null) {
        prize = cleanPrize(prizeInput.value);
      }

      prizeInput.value = prize;

      return {
        bet,
        odd: odd ?? (bet !== null && Number(prize) > 0 ? Number(prize) / bet : null),
        prize,
        totalWin: Number(prize),
      };
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
      const scaleBoost = Number.isFinite(font.scaleBoost)
        ? font.scaleBoost
        : font === highOpenBitmapFont
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
      clearThorScoreBackFx();
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

    function shuffleArray(items) {
      const shuffled = [...items];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      return shuffled;
    }

    function shuffleOpeningLightningPositions(sourceStrikes, character) {
      const positionCount = Number(character.openingLightningPositionCount ?? 0);
      if (!character.shuffleOpeningLightningPositions || positionCount <= 1) {
        return sourceStrikes;
      }

      const eligibleIndexes = [];
      for (let index = 0; index < sourceStrikes.length && eligibleIndexes.length < positionCount; index += 1) {
        const strike = sourceStrikes[index];
        if (strike.pause || typeof strike.optionalChance === "number") continue;
        eligibleIndexes.push(index);
      }

      if (eligibleIndexes.length <= 1) return sourceStrikes;

      const positions = eligibleIndexes.map((index) => {
        const strike = sourceStrikes[index];
        return {
          x: strike.x,
          y: strike.y,
          scoreX: strike.scoreX,
          scoreY: strike.scoreY,
        };
      });
      const shuffledPositions = shuffleArray(positions);
      const isSameOrder = shuffledPositions.every((position, index) => (
        position.x === positions[index].x
        && position.y === positions[index].y
        && position.scoreX === positions[index].scoreX
        && position.scoreY === positions[index].scoreY
      ));

      if (isSameOrder) {
        shuffledPositions.push(shuffledPositions.shift());
      }

      return sourceStrikes.map((strike, strikeIndex) => {
        const positionIndex = eligibleIndexes.indexOf(strikeIndex);
        if (positionIndex < 0) return strike;

        const { x, y, scoreX, scoreY } = shuffledPositions[positionIndex];
        return {
          ...strike,
          x,
          y,
          scoreX,
          scoreY,
        };
      });
    }

    function isModernThorOddsSplit(character) {
      return character?.thorScoring === "oddsSplit";
    }

    function normalizeThorSplitCount(value) {
      if (!Number.isFinite(value)) return null;
      return Math.max(6, Math.min(9, Math.round(value)));
    }

    function normalizeThorBonusTotalStrikes(value) {
      if (!Number.isFinite(value)) return null;
      return Math.max(9, Math.min(11, Math.round(value)));
    }

    function thorOddRuleForValue(oddValue) {
      return Number.isFinite(oddValue)
        ? thorOddSplitRules.find((entry) => oddValue >= entry.min && oddValue <= entry.max)
        : null;
    }

    function createThorSplitDecision(odd, forcedSplitCount = null) {
      const oddValue = Number(odd);
      const normalizedForcedSplitCount = normalizeThorSplitCount(forcedSplitCount);
      const rule = thorOddRuleForValue(oddValue);
      const rangeLabel = rule ? rule.label : "";

      if (normalizedForcedSplitCount !== null) {
        return {
          odd: Number.isFinite(oddValue) ? oddValue : null,
          rangeLabel,
          splitCount: normalizedForcedSplitCount,
          forced: true,
        };
      }

      if (!rule) {
        return {
          odd: Number.isFinite(oddValue) ? oddValue : null,
          rangeLabel,
          splitCount: 6,
          forced: false,
        };
      }

      return {
        odd: oddValue,
        rangeLabel,
        splitCount: rule.splitCount,
        forced: false,
      };
    }

    function thorWeightsForSplitCount(splitCount) {
      const weights = thorSplitWeightTable[splitCount] || thorSplitWeightTable[6];
      const baseWeights = shuffleArray(weights.slice(0, Math.min(6, weights.length)));
      const bonusWeights = weights.slice(6);
      return [...baseWeights, ...bonusWeights].slice(0, splitCount);
    }

    function calculateThorSplitScores(totalWin, splitCount) {
      const targetTotal = Math.max(0, Math.round(Number(totalWin) || 0));
      const normalizedSplitCount = normalizeThorSplitCount(splitCount) || 6;
      const weights = thorWeightsForSplitCount(normalizedSplitCount);
      const scores = [];
      let frontScoreTotal = 0;

      for (let index = 0; index < normalizedSplitCount - 1; index += 1) {
        const score = Math.floor(targetTotal * (weights[index] || 0));
        scores.push(score);
        frontScoreTotal += score;
      }

      scores.push(Math.max(0, targetTotal - frontScoreTotal));
      return scores;
    }

    function nonPauseStrikeByNumber(sourceStrikes, strikeNumber) {
      let currentStrikeNumber = 0;
      for (const strike of sourceStrikes) {
        if (strike.pause) continue;
        currentStrikeNumber += 1;
        if (currentStrikeNumber === strikeNumber) return strike;
      }
      return null;
    }

    function withdrawThorBoostPool(scores, amount) {
      let remaining = Math.max(0, Math.round(amount));
      const donorIndexes = [8, 7, 6];

      donorIndexes.forEach((index) => {
        if (remaining <= 0) return;
        const floorValue = 100;
        const available = Math.max(0, Number(scores[index] || 0) - floorValue);
        const taken = Math.min(available, remaining);
        scores[index] -= taken;
        remaining -= taken;
      });

      return Math.max(0, Math.round(amount) - remaining);
    }

    function createThorBonusBoostPlan(scores, sourceStrikes, totalWin, totalStrikeCount) {
      const normalizedTotalStrikes = normalizeThorBonusTotalStrikes(totalStrikeCount);
      const extraCount = normalizedTotalStrikes ? Math.max(0, normalizedTotalStrikes - 9) : 0;
      if (!extraCount) return [];

      const targetIndexes = Array.from({ length: 6 }, (_, index) => index)
        .sort((left, right) => scores[left] - scores[right] || left - right)
        .slice(0, extraCount);
      if (!targetIndexes.length) return [];

      const desiredPool = Math.max(extraCount * 100, Math.floor(Number(totalWin || 0) * (extraCount === 1 ? .045 : .075)));
      const donorTotal = scores.slice(6, 9).reduce((total, score) => total + Number(score || 0), 0);
      const pool = withdrawThorBoostPool(scores, Math.min(desiredPool, Math.floor(donorTotal * .34)));
      if (pool <= 0) return [];

      const boostAmounts = extraCount === 1
        ? [pool]
        : [Math.floor(pool * .45), pool - Math.floor(pool * .45)];

      return targetIndexes.map((targetIndex, index) => {
        const targetStrikeNumber = targetIndex + 1;
        const template = nonPauseStrikeByNumber(sourceStrikes, targetStrikeNumber) || {};
        const boostAmount = Math.max(0, boostAmounts[index] || 0);

        return {
          ...template,
          text: String(boostAmount),
          configuredStrikeNumber: 10 + index,
          thorSplitCount: 9,
          bonusBoostTargetStrike: targetStrikeNumber,
          bonusBoostAmount: boostAmount,
          delay: 120,
          hold: 500,
          localFlash: true,
          noJitter: true,
          strong: true,
          textScale: .64,
        };
      }).filter((strike) => strike.bonusBoostAmount > 0);
    }

    function createModernThorLightningStrikePlan(character, options = {}) {
      const baseStrikes = character.lightningStrikes || [];
      const sourceStrikes = shuffleOpeningLightningPositions(baseStrikes, character);
      const bonusTotalStrikes = normalizeThorBonusTotalStrikes(options.bonusTotalStrikes);
      const forcedSplitCount = bonusTotalStrikes ? 9 : normalizeThorSplitCount(options.forceSplitCount);
      const splitDecision = createThorSplitDecision(options.odd, forcedSplitCount);
      const splitCount = splitDecision.splitCount;
      const scores = calculateThorSplitScores(options.totalWin, splitCount);
      const bonusBoostStrikes = createThorBonusBoostPlan(scores, sourceStrikes, options.totalWin, bonusTotalStrikes);
      const plannedStrikes = [];
      let configuredStrikeNumber = 0;

      if (bonusTotalStrikes) {
        splitDecision.totalStrikeCount = splitCount + bonusBoostStrikes.length;
        splitDecision.sourceLabel = "加碼版";
      }

      sourceStrikes.forEach((strike) => {
        if (strike.pause) {
          if (splitCount > configuredStrikeNumber) {
            plannedStrikes.push({ ...strike });
          }
          return;
        }

        configuredStrikeNumber += 1;
        if (configuredStrikeNumber > splitCount) return;

        const plannedStrike = {
          ...strike,
          text: String(scores[configuredStrikeNumber - 1] ?? 0),
          configuredStrikeNumber,
          thorSplitCount: splitCount,
        };
        delete plannedStrike.optionalChance;
        plannedStrikes.push(plannedStrike);
      });

      if (bonusBoostStrikes.length) {
        plannedStrikes.push({ pause: 200, playThorGroundSound: true });
        plannedStrikes.push(...bonusBoostStrikes);
      }

      updateThorLogBox(splitDecision);

      return plannedStrikes;
    }

    function createLightningStrikePlan(character = activeCharacter, options = {}) {
      if (isModernThorOddsSplit(character)) {
        return createModernThorLightningStrikePlan(character, options);
      }

      const baseStrikes = character.lightningStrikes || orbDrops.map((point) => ({
        x: point.x,
        y: point.y,
        text: point.multiplier,
      }));
      const sourceStrikes = shuffleOpeningLightningPositions(baseStrikes, character);
      const plannedStrikes = [];
      const optionalDecisions = [];
      const forcedSplitCount = Number.isFinite(options.forceSplitCount)
        ? Math.max(6, Math.min(9, Math.round(options.forceSplitCount)))
        : null;
      let configuredStrikeNumber = 0;

      sourceStrikes.forEach((strike) => {
        if (!strike.pause) {
          configuredStrikeNumber += 1;
        }

        const plannedStrike = { ...strike, configuredStrikeNumber: strike.pause ? null : configuredStrikeNumber };
        if (typeof strike.optionalChance !== "number") {
          plannedStrikes.push(plannedStrike);
          return;
        }

        const roll = forcedSplitCount === null ? Math.random() : null;
        const willShow = forcedSplitCount === null
          ? roll < strike.optionalChance
          : configuredStrikeNumber <= forcedSplitCount;
        optionalDecisions.push({
          configuredStrike: configuredStrikeNumber,
          score: strike.text || "",
          chance: strike.optionalChance,
          roll: roll === null ? "forced" : Number(roll.toFixed(3)),
          show: willShow,
        });

        if (willShow) {
          plannedStrikes.push(plannedStrike);
        }
      });

      if (enableThorFxDebugLog && optionalDecisions.length) {
        console.info("[雷神落雷預判] 第 7/8/9 道加碼開分判定");
        console.table(optionalDecisions.map((decision) => ({
          "設定道次": decision.configuredStrike,
          "分數": decision.score,
          "機率": `${Math.round(decision.chance * 100)}%`,
          "隨機值": decision.roll,
          "是否出現": decision.show ? "會" : "不會",
        })));
        console.info(
          `[雷神落雷預判] 會出現的加碼開分：${
            optionalDecisions.filter((decision) => decision.show).map((decision) => `第 ${decision.configuredStrike} 道:${decision.score}`).join("、") || "沒有"
          }`
        );
      }

      return plannedStrikes;
    }

    async function playLightningShow(runId, plannedStrikes = null, options = {}) {
      clearOrbShow();
      startLightningRenderer();
      if (activeCharacterKey === "god10101" && !activeCharacter.legacyLightning) {
        try {
          await loadThorMobHitEffect();
        } catch (error) {
          console.warn(error);
        }
        if (runId !== sequenceId) return;
      }
      if (activeCharacterKey === "god10101" && !options.thorSpawnVersion && thorIntroFxConfig) {
        void loadThorIntroFxData();
      }
      const strikes = plannedStrikes || createLightningStrikePlan();
      let triggeredStrikeCount = 0;
      let hasPlayedLightningSpineIntro = false;
      let hasPlayedOpeningPayback = false;

      for (const strike of strikes) {
        if (strike.pause) {
          if (strike.playThorGroundSound && activeCharacterKey === "god10101") {
            playThorGroundSound();
          }
          await sleep(strike.pause);
          if (runId !== sequenceId) return;
          continue;
        }

        const strikeDelay = strike.delay ?? 90;
        const nextStrikeNumber = triggeredStrikeCount + 1;
        const introStrikeNumber = activeCharacter.lightningSpineIntroStrike;
        const shouldPlaySpineIntro = !hasPlayedLightningSpineIntro
          && activeCharacter.spineCharacter
          && Number.isFinite(introStrikeNumber)
          && nextStrikeNumber === introStrikeNumber;

        if (shouldPlaySpineIntro) {
          const plannedLead = activeBossSpine?.runtime?.introStrikeLeadMs || 0;
          if (plannedLead > 0 && strikeDelay > plannedLead) {
            await sleep(strikeDelay - plannedLead);
            if (runId !== sequenceId) return;
          }

          const introLead = options.thorSpawnVersion
            ? playBossSpineIntroOnce({
              loopFadeMs: 0,
              mixDuration: 0,
              playLoopFade: false,
              returnMixDuration: .06,
              scaleDurationToRange: true,
              startProgress: .6,
              strikeLeadMs: 90,
              useScaleMatch: false,
              useHeightMatch: true,
            })
            : playThorIntroFxOnly({
              durationMs: activeBossSpine?.runtime?.introDurationMs || 760,
              mode: "opening",
            });
          hasPlayedLightningSpineIntro = introLead > 0;
          await sleep(Math.max(introLead, plannedLead > 0 && strikeDelay > plannedLead ? plannedLead : strikeDelay));
        } else {
          await sleep(strikeDelay);
        }
        if (runId !== sequenceId) return;

        if (options.thorSpawnVersion && activeCharacterKey === "god10101" && !hasPlayedOpeningPayback && nextStrikeNumber <= 6) {
          const runtime = activeBossSpine?.runtime;
          const spawnVersionScale = runtime?.spawnVersionAnimationScale || 1;
          const spawnVersionOffsetY = runtime?.spawnVersionAnimationOffsetY || 0;
          const paybackStrikeLeadMs = Math.max(0, runtime?.spawnVersionPaybackStrikeLeadMs || 0);
          const paybackTotalMs = runtime?.paybackAnimationName
            ? getBossSpineAnimationTotalMs(runtime, runtime.paybackAnimationName, runtime.paybackDurationMs)
            : 0;
          const paybackReturnMs = Math.max(0, paybackTotalMs - paybackStrikeLeadMs);
          const paybackMs = runtime?.paybackAnimationName
            ? playBossSpineOneShot(runtime.paybackAnimationName, {
              durationMs: paybackTotalMs,
              mixDuration: 0,
              animationScale: spawnVersionScale,
              animationOffsetY: spawnVersionOffsetY,
              returnAfterMs: paybackReturnMs,
              returnAnimationName: runtime.moveAnimationName || runtime.loopAnimationName,
              returnAnimationScale: spawnVersionScale,
              returnAnimationOffsetY: spawnVersionOffsetY,
              returnMixDuration: 0,
            })
            : 0;
          hasPlayedOpeningPayback = paybackMs > 0;
          if (paybackMs > 0) {
            await sleep(paybackReturnMs);
            if (runId !== sequenceId) return;
          }
        }

        triggeredStrikeCount += 1;
        if (enableThorFxDebugLog && typeof strike.optionalChance === "number") {
          console.info(
            `[雷神落雷播放] 實際第 ${triggeredStrikeCount} 道，設定第 ${strike.configuredStrikeNumber} 道，分數 ${strike.text || ""}`
          );
        }
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
      const scoreBackFx = [...scoreGatherLayer.querySelectorAll(".thor-score-back-fx")];

      scores.forEach((score) => {
        score.classList.add("is-gathering");
      });
      scoreBackFx.forEach((fx) => {
        fx.classList.add("is-gathering");
      });

      await sleep(760);
      if (runId !== sequenceId) return;
      scores.forEach((score) => score.remove());
      clearThorScoreBackFx();
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

    function stopThorGroundSound() {
      if (!thorGroundSound) return;
      thorGroundSound.pause();
      thorGroundSound.currentTime = 0;
      activeThorGroundSounds.forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      activeThorGroundSounds.clear();
    }

    function stopThorEntranceSound() {
      if (!thorEntranceSound) return;
      thorEntranceSound.pause();
      thorEntranceSound.currentTime = 0;
      if (thorEntranceNextSound) {
        thorEntranceNextSound.pause();
        thorEntranceNextSound.currentTime = 0;
      }
      activeThorEntranceSounds.forEach((sound) => {
        window.clearTimeout(sound._thorEntranceNextTimer);
        sound.pause();
        sound.currentTime = 0;
      });
      activeThorEntranceSounds.clear();
    }

    function stopThorSpawnSound() {
      if (!thorSpawnSound) return;
      thorSpawnSound.pause();
      thorSpawnSound.currentTime = 0;
      activeThorSpawnSounds.forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      activeThorSpawnSounds.clear();
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

    function playThorGroundSound() {
      if (!thorGroundSound) return;
      const sound = thorGroundSound.cloneNode();
      sound.preload = "auto";
      activeThorGroundSounds.add(sound);
      sound.addEventListener("ended", () => activeThorGroundSounds.delete(sound), { once: true });
      const playPromise = sound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
          activeThorGroundSounds.delete(sound);
        });
      }
    }

    function playThorEntranceSound(options = {}) {
      if (!thorEntranceSound) return;
      const token = sequenceId;
      const sound = thorEntranceSound.cloneNode();
      sound.preload = "auto";
      sound.currentTime = 0;
      activeThorEntranceSounds.add(sound);
      let hasReportedTransitionMs = false;

      const playNextSound = () => {
        if (token !== sequenceId || !thorEntranceNextSound) return;
        const nextSound = thorEntranceNextSound.cloneNode();
        nextSound.preload = "auto";
        nextSound.currentTime = 0;
        activeThorEntranceSounds.add(nextSound);
        nextSound.addEventListener("ended", () => activeThorEntranceSounds.delete(nextSound), { once: true });
        const nextPlayPromise = nextSound.play();
        if (nextPlayPromise) {
          nextPlayPromise.catch(() => {
            // Browsers may block sound before the first user gesture.
            activeThorEntranceSounds.delete(nextSound);
          });
        }
      };
      const transitionToNext = () => {
        window.clearTimeout(sound._thorEntranceNextTimer);
        sound._thorEntranceNextTimer = 0;
        activeThorEntranceSounds.delete(sound);
        sound.pause();
        sound.currentTime = 0;
        playNextSound();
      };
      const scheduleEarlyTransition = () => {
        const earlyMs = Math.max(0, Number(config.audio.thorEntranceEarlyNextMs || 0));
        const durationMs = Number.isFinite(sound.duration) ? sound.duration * 1000 : 0;
        if (!earlyMs || !durationMs || sound._thorEntranceNextTimer) return;
        const transitionMs = Math.max(0, durationMs - earlyMs);
        sound._thorEntranceNextTimer = window.setTimeout(transitionToNext, transitionMs);
        if (!hasReportedTransitionMs && typeof options.onTransitionMs === "function") {
          hasReportedTransitionMs = true;
          options.onTransitionMs(transitionMs, durationMs);
        }
      };

      sound.addEventListener("loadedmetadata", scheduleEarlyTransition, { once: true });
      sound.addEventListener("ended", transitionToNext, { once: true });
      const playPromise = sound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
          window.clearTimeout(sound._thorEntranceNextTimer);
          activeThorEntranceSounds.delete(sound);
        });
      }
      scheduleEarlyTransition();
    }

    function playThorSpawnSound() {
      if (!thorSpawnSound) return;
      const sound = thorSpawnSound.cloneNode();
      sound.preload = "auto";
      activeThorSpawnSounds.add(sound);
      sound.addEventListener("ended", () => activeThorSpawnSounds.delete(sound), { once: true });
      const playPromise = sound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
          activeThorSpawnSounds.delete(sound);
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
      if (!musicEnabled) {
        bgmSound.pause();
        return;
      }
      bgmSound.volume = bgmNormalVolume;
      const playPromise = bgmSound.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Browsers may block sound before the first user gesture.
        });
      }
    }

    function duckBackgroundMusic() {
      if (!musicEnabled) return;
      bgmSound.volume = bgmDuckedVolume;
    }

    function restoreBackgroundMusic() {
      if (!musicEnabled) return;
      bgmSound.volume = bgmNormalVolume;
    }

    gotchaSound.addEventListener("ended", restoreBackgroundMusic);

    function updateMusicToggleButton() {
      if (!musicToggleButton) return;
      musicToggleButton.textContent = musicEnabled ? "音樂開" : "音樂關";
      musicToggleButton.classList.toggle("is-on", musicEnabled);
      musicToggleButton.setAttribute("aria-pressed", String(musicEnabled));
    }

    function setMusicEnabled(enabled) {
      musicEnabled = Boolean(enabled);
      updateMusicToggleButton();
      if (musicEnabled) {
        playBackgroundMusic();
      } else {
        bgmSound.pause();
      }
    }

    function resetStage(prize) {
      stopGotchaSound();
      stopGotchaIntroSound();
      stopGotchaHitLargeSound();
      stopThorGroundSound();
      stopThorEntranceSound();
      stopThorSpawnSound();
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

    async function ensureBossSpineReadyForEntrance(runId) {
      if (!activeCharacter.spineCharacter) return false;
      if (!activeBossSpine?.runtime) {
        await startBossSpineCharacter(activeCharacter.spineCharacter);
      }

      return runId === sequenceId && Boolean(activeBossSpine?.runtime);
    }

    async function playBossEntrance(runId, options = {}) {
      const entrance = activeCharacter.entrance || {};
      const dropDuration = entrance.dropDuration || 560;
      const landHold = entrance.landHold ?? 260;
      const hitDuration = entrance.hitDuration || 420;
      const isSlam = entrance.type === "slam";

      stage.classList.remove("stage--flash", "stage--hit");
      bossImage.src = idleBossImage;

      if (options.thorSpawnVersion && activeCharacter.spineCharacter) {
        const isReady = await ensureBossSpineReadyForEntrance(runId);
        if (runId !== sequenceId) return;
        if (isReady) {
          stage.classList.add("stage--landed");
          const runtime = activeBossSpine.runtime;
          const spawnAnimationName = runtime.spawnAnimationName || runtime.loopAnimationName;
          const spawnVersionScale = runtime.spawnVersionAnimationScale || 1;
          const spawnVersionOffsetY = runtime.spawnVersionAnimationOffsetY || 0;
          const spawnMs = playBossSpineOneShot(spawnAnimationName, {
            durationMs: getBossSpineAnimationTotalMs(runtime, spawnAnimationName, runtime.spawnDurationMs),
            mixDuration: 0,
            animationScale: spawnVersionScale,
            animationOffsetY: spawnVersionOffsetY,
            returnAnimationName: runtime.moveAnimationName || runtime.loopAnimationName,
            returnAnimationScale: spawnVersionScale,
            returnAnimationOffsetY: spawnVersionOffsetY,
            returnMixDuration: 0,
          });
          if (entrance.playSound !== false) {
            playThorSpawnSound();
          }
          await sleep(Math.max(0, spawnMs));
          return;
        }
      }

      if (entrance.type === "spineIntro" && activeCharacter.spineCharacter) {
        const isReady = await ensureBossSpineReadyForEntrance(runId);
        if (runId !== sequenceId) return;
        if (isReady) {
          const entranceIntroFxConfig = entrance.introFx === "thorIntroEntryFx"
            ? thorIntroEntryFxConfig
            : thorIntroFxConfig;
          if (entrance.introMobHitFx?.enabled !== false) {
            try {
              await loadThorMobHitEffect();
            } catch (error) {
              console.warn(error);
            }
            if (runId !== sequenceId) return;
          }
          if (entrance.playFx !== false) {
            try {
              await loadThorIntroFxData(entranceIntroFxConfig);
            } catch (error) {
              console.warn(error);
            }
            if (runId !== sequenceId) return;
          }
          const totalMs = getBossSpineIntroTotalMs(activeBossSpine.runtime, { useLoopTailHold: false });
          const afterimageSettings = entrance.introAfterimage || {};
          const shouldSyncAfterimageToEntranceAudio = Boolean(
            afterimageSettings.enabled
            && entrance.playSound !== false
            && Number.isFinite(Number(afterimageSettings.endBeforeThorEntranceNextMs))
          );
          playBossSpineIntroOnce({
            forceFx: Boolean(entrance.playFx),
            fxMode: "opening",
            introFxConfig: entranceIntroFxConfig,
            playFx: Boolean(entrance.playFx),
            playLoopFade: false,
            playSound: false,
            useHeightMatch: false,
            useLoopTailHold: false,
            useScaleMatch: true,
            afterimage: shouldSyncAfterimageToEntranceAudio ? null : entrance.introAfterimage,
          });
          const introToken = activeBossSpine.runtime.introToken;
          stage.classList.add("stage--landed");
          scheduleThorIntroMobHitFx(entrance.introMobHitFx, runId);
          if (entrance.playSound !== false) {
            playThorSpawnSound();
            playThorEntranceSound(shouldSyncAfterimageToEntranceAudio
              ? {
                onTransitionMs: (transitionMs) => {
                  if (!afterimageSettings.enabled || runId !== sequenceId) return;
                  const visualMs = getBossSpineAfterimageVisualMs(afterimageSettings);
                  const endBeforeMs = Math.max(0, Number(afterimageSettings.endBeforeThorEntranceNextMs || 0));
                  const startDelayMs = Math.max(0, transitionMs - endBeforeMs - visualMs);
                  const runtime = activeBossSpine?.runtime;
                  if (!runtime || runtime.introToken !== introToken) return;
                  window.clearTimeout(runtime.introAfterimageTimer);
                  runtime.introAfterimageTimer = scheduleBossSpineIntroImpactAfterimage(afterimageSettings, introToken, startDelayMs);
                },
              }
              : undefined);
          }
          const afterimageReleaseMs = afterimageSettings.enabled
            ? Math.max(0,
              totalMs
              - Math.max(0, Number(afterimageSettings.tailLeadMs ?? 160))
              + getBossSpineAfterimageVisualMs(afterimageSettings)
              + Math.max(0, Number(afterimageSettings.releaseBufferMs || 40))
            )
            : 0;
          const releaseMs = Number.isFinite(entrance.timelineReleaseMs)
            ? Math.max(entrance.timelineReleaseMs, afterimageReleaseMs)
            : totalMs + landHold;
          const maxReleaseMs = afterimageReleaseMs > 0
            ? Math.max(totalMs + landHold, afterimageReleaseMs)
            : totalMs + landHold;
          await sleep(Math.max(0, Math.min(maxReleaseMs, releaseMs)));
          return;
        }
      }

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
      console.clear();
      const runTotals = resolveRunTotals();
      const prize = runTotals.prize;
      resetStage(prize);
      const forcedBonusTotalStrikes = activeCharacterKey === "god10101" ? pendingThorBonusTotalStrikes : null;
      const forcedSplitCount = activeCharacterKey === "god10101" && !forcedBonusTotalStrikes ? pendingThorSplitCount : null;
      const useThorSpawnVersion = activeCharacterKey === "god10101" && pendingThorSpawnVersion;
      activeThorSpawnRun = useThorSpawnVersion;
      pendingThorSplitCount = null;
      pendingThorBonusTotalStrikes = null;
      pendingThorSpawnVersion = false;
      const lightningStrikePlan = activeCharacter.performance === "lightning"
        ? createLightningStrikePlan(activeCharacter, {
          bonusTotalStrikes: forcedBonusTotalStrikes,
          forceSplitCount: forcedSplitCount,
          odd: runTotals.odd,
          totalWin: runTotals.totalWin,
        })
        : null;
      playBackgroundMusic();
      playButton.disabled = true;
      if (spawnVersionButton) spawnVersionButton.disabled = true;

      await sleep(420);
      if (runId !== sequenceId) return;
      stage.classList.add("stage--scene", "stage--flash");

      await sleep(180);
      if (runId !== sequenceId) return;
      await playBossEntrance(runId, { thorSpawnVersion: useThorSpawnVersion });
      if (runId !== sequenceId) return;

      if (activeCharacter.performance === "lightning") {
        await playLightningShow(runId, lightningStrikePlan, { thorSpawnVersion: useThorSpawnVersion });
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
      if (spawnVersionButton) spawnVersionButton.disabled = false;
      activeThorSpawnRun = false;
    }

    playButton.addEventListener("click", () => {
      pendingThorSplitCount = null;
      pendingThorBonusTotalStrikes = null;
      pendingThorSpawnVersion = false;
      activeThorSpawnRun = false;
      playPerformance();
    });

    musicToggleButton?.addEventListener("click", () => {
      setMusicEnabled(!musicEnabled);
    });

    if (spawnVersionButton) {
      spawnVersionButton.addEventListener("click", () => {
        pendingThorSplitCount = null;
        pendingThorBonusTotalStrikes = null;
        pendingThorSpawnVersion = true;
        setActiveCharacter("god10101", false);
        playPerformance();
      });
    }

    prizeInput.addEventListener("input", () => {
      prizeInput.value = cleanPrize(prizeInput.value);
      updateThorLogBox(null);
    });

    betInput?.addEventListener("input", () => {
      betInput.value = cleanDecimalInput(betInput.value);
      syncPrizeFromBetOdd();
      updateThorLogBox(null);
    });

    oddInput?.addEventListener("input", () => {
      oddInput.value = cleanDecimalInput(oddInput.value);
      syncPrizeFromBetOdd();
      updateThorLogBox(null);
    });

    presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        pendingThorSplitCount = null;
        pendingThorBonusTotalStrikes = null;
        pendingThorSpawnVersion = false;
        if (betInput) betInput.value = "";
        if (oddInput) oddInput.value = "";
        prizeInput.value = button.dataset.value;
        playPerformance();
      });
    });

    characterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        pendingThorSplitCount = null;
        pendingThorBonusTotalStrikes = null;
        pendingThorSpawnVersion = false;
        setActiveCharacter(button.dataset.characterKey, true);
      });
    });

    thorSplitButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const splitCount = Number(button.dataset.thorSplitCount);
        if (!Number.isFinite(splitCount)) return;
        pendingThorSplitCount = splitCount;
        pendingThorBonusTotalStrikes = null;
        pendingThorSpawnVersion = false;
        setActiveCharacter("god10101", false);
        playPerformance();
      });
    });

    thorBonusButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const totalStrikes = Number(button.dataset.thorBonusTotalStrikes);
        if (!Number.isFinite(totalStrikes)) return;
        pendingThorSplitCount = null;
        pendingThorBonusTotalStrikes = normalizeThorBonusTotalStrikes(totalStrikes);
        pendingThorSpawnVersion = false;
        setActiveCharacter("god10101", false);
        playPerformance();
      });
    });

    window.addEventListener("resize", () => {
      resizeLightningCanvas();
      resizeClawCanvas();
      resizeBubbleCanvas();
      getSlots().forEach((slot) => setSlotDigit(slot, slot.dataset.value || "0"));
    });

    void loadThorMobHitEffect();
    void loadThorIntroFxData();
    startLightningRenderer();
    setActiveCharacter(activeCharacterKey);
    updateMusicToggleButton();
    buildSlots(cleanPrize(prizeInput.value).length);
    window.setTimeout(playPerformance, 500);
