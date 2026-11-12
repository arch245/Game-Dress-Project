// Packs every processed image into one text file (src/game/sprites.json) so the app never depends on binary assets.
const fs = require("fs"); const path = require("path");
const A = path.join(__dirname, "..", "src", "assets");
const uri = (f) => "data:image/webp;base64," + fs.readFileSync(f).toString("base64");
const out = { doll: uri(path.join(A, "doll.webp")), head: uri(path.join(A, "head.webp")), neck: uri(path.join(A, "neck.webp")), hand: uri(path.join(A, "hand.webp")), room: uri(path.join(A, "room.webp")), places: [], items: {} };
for (let i = 1; i <= 7; i++) out.places.push(uri(path.join(A, `place${i}.webp`)));
const P = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "game", "placements.json"), "utf8"));
for (const id of Object.keys(P.items)) out.items[id] = uri(path.join(A, "items", `${id}.webp`));
const file = path.join(__dirname, "..", "src", "game", "sprites.json");
fs.writeFileSync(file, JSON.stringify(out));
console.log("sprites.json", Object.keys(out.items).length, "items", Math.round(fs.statSync(file).size / 1024), "KB");
