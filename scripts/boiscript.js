/* ================== Access ================== */
(function () {
    const PASSWORDS = [
        "password",
        "пароль"
    ];
    const KEY = "page_authenticated";
    if (sessionStorage.getItem(KEY) === "true") return;
    document.documentElement.style.display = "none";
    const input = prompt("Enter password:");

    if (PASSWORDS.includes(input)) {
        sessionStorage.setItem(KEY, "true");
        document.documentElement.style.display = "";
    } else {
        document.body.innerHTML = "<h1>Access denied</h1>";
        throw new Error("Unauthorized");
    }
})();
/* ================= Core ================= */
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const DPR = devicePixelRatio || 1;

const $ = id => document.getElementById(id);

const state = {
    circles: [],
    active: null,
    death: 0,
    bgReady: false,
    bgIndex: -1
};

/* ================= Constants ================= */
const K = {
    bgKey: "selectedBackground",
    namesKey: "initialCircleNames",
    charKey: "customInitialCharacters",
    eliteKey: "customEliteCharacters",
    defaultBg: "background/background.png",
    ext: ["png", "jpg", "jpeg", "webp"]
};
const LANG_KEY = "appLanguage";
let currentLang = "ru";

const translations = {
    ru: {
        bgPrev: "<- Задний План",
        bgNext: "Задний План ->",
        elementButton: "Элементы",
        addElite: "Добавить Элиту",
        enemiesPlus: "Враги +",
        enemiesMinus: "Враги -",
        alliesPlus: "Союзники +",
        alliesMinus: "Союзники -",
        addChar: "Добавить Персонаж",
        graveyard: "Кладбище",
        promptName: "Имя персонажа:",
        promptRename: "Введите новое имя:"
    },
    en: {
        bgPrev: "<- Background",
        bgNext: "Background ->",
        elementButton: "Elements",
        addElite: "Add Elite",
        enemiesPlus: "Enemies +",
        enemiesMinus: "Enemies -",
        alliesPlus: "Allies +",
        alliesMinus: "Allies -",
        addChar: "Add Character",
        graveyard: "Graveyard",
        promptName: "Character name:",
        promptRename: "Enter new name:"
    },
    ger: {
        bgPrev: "<- Hintergrund",
        bgNext: "Hintergrund ->",
        elementButton: "Elemente",
        addElite: "Elite hinzufügen",
        enemiesPlus: "Feinde +",
        enemiesMinus: "Feinde -",
        alliesPlus: "Verbündete +",
        alliesMinus: "Verbündete -",
        addChar: "Charakter hinzufügen",
        graveyard: "Friedhof",
        promptName: "Charaktername:",
        promptRename: "Neuen Namen eingeben:"
    },
    uk: {
        bgPrev: "<- Фон",
        bgNext: "Фон ->",
        elementButton: "Елементи",
        addElite: "Додати елітного",
        enemiesPlus: "Вороги +",
        enemiesMinus: "Вороги -",
        alliesPlus: "Союзники +",
        alliesMinus: "Союзники -",
        addChar: "Додати персонажа",
        graveyard: "Цвинтар",
        promptName: "Ім’я персонажа:",
        promptRename: "Введіть нове ім’я:"
    }
};
const colors = {
    red: { fill: "rgba(255,80,80,.3)", stroke: "rgba(180,40,40,.3)" },
    green: { fill: "rgba(80,255,80,.3)", stroke: "rgba(40,180,40,.3)" }
};

const bin = { x: 0, y: 0, w: 220, h: 220 };

/* ================= Elements ================= */
const ELEMENTS = [
    "tree",
    "wall_vertical",
    "wall_horizontal",
    "carriage",
    { name: "hole", width: 300, height: 300 },
];

const ELEMENT_CONFIG = {
    width: 140,     //px
    height: 100,    //px
    opacity: 0.9    //0–1
};

state.elements = [];
state.activeElement = null;

const elementMenu = document.createElement("div");

elementMenu.style.position = "fixed";
elementMenu.style.background = "#444";
elementMenu.style.padding = "8px";
elementMenu.style.borderRadius = "8px";
elementMenu.style.zIndex = "20";

elementMenu.style.display = "none";
elementMenu.style.flexDirection = "column";
elementMenu.style.gap = "6px";

document.body.appendChild(elementMenu);

function buildElementMenu() {
    elementMenu.innerHTML = "";

    ELEMENTS.forEach(elementDef => {
        const { name } = normalizeElement(elementDef);

        const btn = document.createElement("button");
        btn.textContent = name;

        btn.onclick = () => {
            addElement(elementDef); // pass full definition, not just name
            elementMenu.style.display = "none";
        };

        elementMenu.appendChild(btn);
    });
}

buildElementMenu();

/* ================= Background ================= */
const bg = new Image();
bg.onload = () => state.bgReady = true;
bg.onerror = () => state.bgReady = false;

const savedBg = localStorage.getItem(K.bgKey);
bg.src = savedBg || K.defaultBg;

if (savedBg) {
    const m = savedBg.match(/background(\d+)/);
    state.bgIndex = m ? +m[1] : -1;
}

const tryLoad = src => new Promise(r => {
    const i = new Image();
    i.onload = () => r(i);
    i.onerror = () => r(null);
    i.src = src;
});

async function findBg(start, step) {
    let i = start === -1 ? (step > 0 ? 1 : Infinity) : start + step;

    while (i >= 1) {
        for (const ext of K.ext) {
            const src = `background/background${i}.${ext}`;
            if (await tryLoad(src)) return { src, index: i };
        }
        i += step;
    }
}

async function cycleBg(step) {
    const f = await findBg(state.bgIndex, step);
    const src = f ? f.src : K.defaultBg;

    bg.src = src;
    state.bgIndex = f ? f.index : -1;

    localStorage.setItem(K.bgKey, src);
}

$("bgButton").onclick = () => cycleBg(1);
$("bgPrevButton").onclick = () => cycleBg(-1);

/* ================= Resize ================= */
function resize() {

    const w = innerWidth, h = innerHeight;

    canvas.width = w * DPR;
    canvas.height = h * DPR;

    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    bin.w = Math.min(220, w * .25);
    bin.h = Math.min(220, h * .35);
    bin.x = w - bin.w - 20;
    bin.y = (h - bin.h) / 2;
}

addEventListener("resize", resize);
resize();

/* ================= Entities ================= */
const make = (nx, ny, team, label, extra = {}) => ({
    nx, ny, r: 25, label, team, ...extra, ...colors[team]
});

const add = (...a) => state.circles.push(make(...a));

/* ================= Numbering ================= */
const nums = {
    red: { next: 1, reuse: [] },
    green: { next: 1, reuse: [] }
};
const nextNum = t => nums[t].reuse.shift() ?? nums[t].next++;

/* ================= Spawn ================= */
function spawn(team) {
    const y = team === "red" ? 0.15 : 0.65;
    const count = state.circles.filter(
        c => c.spawned && c.team === team
    ).length;
    const spacing = (40 + 10) / canvas.clientWidth;
    add(
        .3 + count * spacing,
        y,
        team,
        String(nextNum(team)),
        { spawned: true }
    );
}

function removeSpawn(team) {
    for (let i = state.circles.length - 1; i >= 0; i--) {
        const c = state.circles[i];
        if (c.spawned && c.team === team) {
            state.circles.splice(i, 1);
            nums[team].reuse.push(+c.label);
            nums[team].reuse.sort((a, b) => a - b);
            return;
        }
    }
}
/* ================= Storage ================= */
const load = k => JSON.parse(localStorage.getItem(k) || "null");
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
function saveAll() {
    const init = {}, chars = [], elites = [];
    for (const c of state.circles) {
        if (c.initial) init[c.id] = c.label;
        else if (c.team === "green" && !c.spawned)
            chars.push({ nx: c.nx, ny: c.ny, label: c.label, id: c.id });
        else if (c.elite)
            elites.push({ nx: c.nx, ny: c.ny, label: c.label, id: c.id });
    }
    save(K.namesKey, init);
    save(K.charKey, chars);
    save(K.eliteKey, elites);
}
/* ================= Controls ================= */
document
    .querySelectorAll('#mobsbuttons button[data-team]')
    .forEach(b => {
        b.onclick = () => {
            const { team, action } = b.dataset;
            action === "add" ? spawn(team) : removeSpawn(team);
        };
    });

$("characktersbuttons")
    .querySelector("button")
    .onclick = () => {
        const name = prompt(translations[currentLang].promptName, "New");
        if (!name) return;
        add(.25, .75, "green", name, { id: Date.now() });
        saveAll();
    };

$("addEliteButton").onclick = () => {

    const name = prompt("Elite name:", "New");
    if (!name) return;

    add(.55, .25, "red", name, { elite: true, id: Date.now() });
    saveAll();
};
/* ================= Interaction ================= */

const dist = (a, b, x, y) => Math.hypot(a - x, b - y);

canvas.onpointerdown = e => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;

    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        const x = el.nx * r.width;
        const y = el.ny * r.height;

        if (
            px >= x - el.w / 2 &&
            px <= x + el.w / 2 &&
            py >= y - el.h / 2 &&
            py <= y + el.h / 2
        ) {
            state.elements.splice(i, 1);
            state.elements.push(el);

            state.activeElement = {
                el,
                dx: px - x,
                dy: py - y
            };

            canvas.setPointerCapture(e.pointerId);
            return;
        }
    }

    for (let i = state.circles.length - 1; i >= 0; i--) {
        const c = state.circles[i];
        const cx = c.nx * r.width;
        const cy = c.ny * r.height;

        if (Math.hypot(px - cx, py - cy) <= c.r) {
            state.circles.splice(i, 1);
            state.circles.push(c);

            state.active = {
                c,
                dx: px - cx,
                dy: py - cy
            };

            canvas.setPointerCapture(e.pointerId);
            return;
        }
    }
};

canvas.onpointermove = e => {
    const r = canvas.getBoundingClientRect();
    if (state.activeElement) {
        const a = state.activeElement;

        a.el.nx = (e.clientX - r.left - a.dx) / r.width;
        a.el.ny = (e.clientY - r.top - a.dy) / r.height;
        return;
    }
    if (state.active) {
        const a = state.active;
        a.c.nx = (e.clientX - r.left - a.dx) / r.width;
        a.c.ny = (e.clientY - r.top - a.dy) / r.height;
    }
};

canvas.onpointerup = () => {

    // ===== DELETE ELEMENT =====
    if (state.activeElement) {
        const el = state.activeElement.el;

        const x = el.nx * (canvas.width / DPR);
        const y = el.ny * (canvas.height / DPR);

        if (
            x + el.w / 2 > bin.x && x - el.w / 2 < bin.x + bin.w &&
            y + el.h / 2 > bin.y && y - el.h / 2 < bin.y + bin.h
        ) {
            state.elements.splice(state.elements.indexOf(el), 1);
        }

        state.activeElement = null;
        return;
    }
    const a = state.active;
    if (a) {
        const c = a.c;
        const x = c.nx * (canvas.width / DPR);
        const y = c.ny * (canvas.height / DPR);
        if (
            !c.initial &&
            x + c.r > bin.x && x - c.r < bin.x + bin.w &&
            y + c.r > bin.y && y - c.r < bin.y + bin.h
        ) {
            state.circles.splice(state.circles.indexOf(c), 1);
            state.death++;
        }
    }
    saveAll();
    state.active = null;
};

$("elementButton").onclick = () => {
    const btn = $("elementButton");
    const rect = btn.getBoundingClientRect();

    if (elementMenu.style.display === "flex") {
        elementMenu.style.display = "none";
        return;
    }
    elementMenu.style.left = rect.left + "px";
    elementMenu.style.top = rect.bottom + 6 + "px";
    elementMenu.style.display = "flex";
};

function normalizeElement(element) {
    if (typeof element === "string") {
        return { name: element };
    }
    return element;
}

async function addElement(elementDef) {
    const { name, width, height, opacity } = normalizeElement(elementDef);

    const src = await resolveElementSrc(name);
    if (!src) {
        console.error("Element not found:", name);
        return;
    }

    const img = new Image();

    img.onload = () => {
        state.elements.push({
            img,
            nx: 0.5,
            ny: 0.5,
            w: width ?? ELEMENT_CONFIG.width,
            h: height ?? ELEMENT_CONFIG.height,
            opacity: opacity ?? ELEMENT_CONFIG.opacity
        });
    };

    img.src = src;
}

async function resolveElementSrc(name) {
    for (const ext of K.ext) {
        const src = `elements/${name}.${ext}`;
        const ok = await tryLoad(src);
        if (ok) return src;
    }
    return null;
}

/* ================= Layout ================= */
function layout(label) {
    label = String(label);
    const words = label.split(/\s+/).slice(0, 2);
    ctx.font = "bold 12px sans-serif";
    let max = 0;
    for (const w of words)
        max = Math.max(max, ctx.measureText(w).width);
    const lineH = 14;
    const r = Math.min(
        Math.max(Math.max(max, words.length * lineH) / 2 + 2, 18),
        40
    );
    return { r, words, lineH };
}
/* ================= Render ================= */
function draw() {
    const W = canvas.width / DPR;
    const H = canvas.height / DPR;
    ctx.clearRect(0, 0, W, H);

    if (state.bgReady) {
        ctx.drawImage(bg, 0, 0, W, H);
    }
    for (const el of state.elements) {
        if (!el.img || !el.img.complete || el.img.naturalWidth === 0) {
            continue;
        }

        const x = el.nx * W;
        const y = el.ny * H;

        ctx.globalAlpha = el.opacity;

        ctx.drawImage(
            el.img,
            x - el.w / 2,
            y - el.h / 2,
            el.w,
            el.h
        );
    }

    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(200,50,50,.15)";
    ctx.strokeStyle = "rgba(200,50,50,.6)";
    ctx.lineWidth = 3;

    ctx.fillRect(bin.x, bin.y, bin.w, bin.h);
    ctx.strokeRect(bin.x, bin.y, bin.w, bin.h);

    ctx.fillStyle = "#000";

    const centerX = bin.x + bin.w / 2;

    ctx.font = "bold 16px sans-serif";
    ctx.fillText(translations[currentLang].graveyard, centerX, bin.y + 20);

    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`💀 ${state.death}`, centerX, bin.y + 50);

    ctx.textAlign = "center";
    ctx.textBaseline = "center";

    for (const c of state.circles) {
        const x = c.nx * W;
        const y = c.ny * H;

        const L = layout(c.label);
        c.r = L.r;

        ctx.beginPath();
        ctx.arc(x, y, c.r, 0, Math.PI * 2);

        ctx.fillStyle = c.fill;
        ctx.strokeStyle = c.stroke;

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#000";
        ctx.font = "bold 12px sans-serif";

        const offset = L.lineH * 0.25;
        const start = y - (L.words.length - 1) * L.lineH / 2 + offset;

        L.words.forEach((w, i) =>
            ctx.fillText(w, x, start + i * L.lineH)
        );
    }
    requestAnimationFrame(draw);
}
/* ================= Initial Load ================= */
const initial = [
    [0.55, 0.75, "Wulrath"],
    [0.53, 0.80, "Asitburns"],
    [0.57, 0.80, "Asshunter"]
];

const savedLang = localStorage.getItem(LANG_KEY) || "ru";
$("abc").value = savedLang;
applyLanguage(savedLang);

const names = load(K.namesKey) || {};
initial.forEach(([x, y, n], i) =>
    add(x, y, "green", names[i] || n, { initial: true, id: i })
);

(load(K.eliteKey) || [])
    .forEach(c => add(c.nx, c.ny, "red", c.label, { elite: true, id: c.id }));

(load(K.charKey) || [])
    .forEach(c => add(c.nx, c.ny, "green", c.label, { id: c.id }));

draw();

/* ================= Rename ================= */
canvas.ondblclick = e => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;

    for (let i = state.circles.length - 1; i >= 0; i--) {
        const c = state.circles[i];
        if (c.spawned) continue;

        const cx = c.nx * r.width, cy = c.ny * r.height;

        if (dist(px, py, cx, cy) <= c.r) {
            const name = prompt(translations[currentLang].promptRename, c.label);

            if (name?.trim()) {
                c.label = name.trim();
                saveAll();
            }
            return;
        }
    }
};
/* ================= Language ================= */
function applyLanguage(lang) {
    const t = translations[lang];

    $("bgPrevButton").textContent = t.bgPrev;
    $("bgButton").textContent = t.bgNext;
    $("elementButton").textContent = t.elementButton;
    $("addEliteButton").textContent = t.addElite;

    const mobBtns = document.querySelectorAll('#mobsbuttons button[data-team]');
    mobBtns.forEach(b => {
        const { team, action } = b.dataset;
        if (team === "red" && action === "add") b.textContent = t.enemiesPlus;
        if (team === "red" && action === "remove") b.textContent = t.enemiesMinus;
        if (team === "green" && action === "add") b.textContent = t.alliesPlus;
        if (team === "green" && action === "remove") b.textContent = t.alliesMinus;
    });

    $("characktersbuttons").querySelector("button").textContent = t.addChar;
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
}

function languageChange() {
    const lang = $("abc").value;
    applyLanguage(lang);
}