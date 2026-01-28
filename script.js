const colours = ["red", "yellow", "green", "blue"];

let deck = [];
let discardPile = [];
let playerHand = [];
let aiHand = [];
let currentColour = null;
let currentPlayer = "player";
let wildCallback = null;
let gameOver = false;

let pendingDraw = 0;
let pendingDrawActive = false;

// DOM
const playerHandDiv = document.getElementById("player-hand");
const aiHandDiv = document.getElementById("ai-hand");
const discardDiv = document.getElementById("discard");
const deckDiv = document.getElementById("deck");
const messageDiv = document.getElementById("message");
const currentColourEl = document.getElementById("current-colour");
const colourPicker = document.getElementById("colour-picker");

const playerZingEl = document.getElementById("player-zing");
const aiZingEl = document.getElementById("ai-zing");

const playerCountEl = document.getElementById("player-count");
const aiCountEl = document.getElementById("ai-count");

const winOverlay = document.getElementById("win-overlay");
const winMessageEl = document.getElementById("win-message");
const restartBtn = document.getElementById("restart-btn");
const confettiContainer = document.getElementById("confetti-container");
const trophyEl = document.querySelector(".trophy");

/* Deck */
function createDeck() {
  deck = [];
  for (let c of colours) {
    for (let i = 0; i <= 9; i++) deck.push({ colour: c, value: i });
    ["skip","reverse","draw2"].forEach(v => {
      deck.push({ colour: c, value: v });
      deck.push({ colour: c, value: v });
    });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ colour: "black", value: "wild" });
    deck.push({ colour: "black", value: "wild4" });
  }
}

function shuffle() { deck.sort(() => Math.random() - 0.5); }

function dealCards() {
  playerHand = [];
  aiHand = [];
  for (let i = 0; i < 7; i++) {
    playerHand.push(deck.pop());
    aiHand.push(deck.pop());
  }
}

function startGame() {
  gameOver = false;
  pendingDraw = 0;
  pendingDrawActive = false;
  createDeck();
  shuffle();
  dealCards();

  const first = deck.pop();
  discardPile = [first];
  currentColour = first.colour === "black"
    ? colours[Math.floor(Math.random() * 4)]
    : first.colour;

  currentPlayer = "player";
  render();
}

/* Render */
function displayValue(v) {
  if (v === "draw2") return "+2";
  if (v === "wild4") return "+4";
  return v;
}

function render() {
  playerHandDiv.innerHTML = "";
  aiHandDiv.innerHTML = "";

  playerHand.forEach((c,i) => {
    const d = document.createElement("div");
    d.className = "card" +
      (c.colour !== "black" ? " " + c.colour : "") +
      (c.value === "wild" || c.value === "wild4" ? " wild4-card" : "");
    d.textContent = displayValue(c.value);
    d.onclick = () => playPlayerCard(i);
    playerHandDiv.appendChild(d);
  });

  aiHand.forEach(() => {
    const d = document.createElement("div");
    d.className = "card back";
    aiHandDiv.appendChild(d);
  });

  const top = discardPile.at(-1);
  discardDiv.className = "card" +
    (top.colour !== "black" ? " " + top.colour : "") +
    (top.value === "wild" || top.value === "wild4" ? " wild4-card" : "");
  discardDiv.textContent = displayValue(top.value);

  currentColourEl.textContent =
    `Current colour: ${currentColour.toUpperCase()}` +
    (pendingDrawActive ? ` | Pending draw: ${pendingDraw}` : "");

  playerCountEl.textContent = `Cards: ${playerHand.length}`;
  aiCountEl.textContent = `Cards: ${aiHand.length}`;

  playerZingEl.textContent = playerHand.length === 1 ? "ZING!" : "";
  aiZingEl.textContent = aiHand.length === 1 ? "ZING!" : "";
  playerZingEl.classList.toggle("active", playerHand.length === 1);
  aiZingEl.classList.toggle("active", aiHand.length === 1);

  if (!gameOver) {
    messageDiv.textContent =
      currentPlayer === "player" ? "Your turn" : "AI is thinking…";
  }
}

/* Rules */
function canPlay(card) {
  const top = discardPile.at(-1);
  if (pendingDrawActive)
    return card.value === "draw2" || card.value === "wild4";
  return card.colour === currentColour ||
         card.value === top.value ||
         card.colour === "black";
}

/* Player */
function playPlayerCard(i) {
  if (currentPlayer !== "player" || gameOver) return;
  const card = playerHand[i];
  if (!canPlay(card)) return;

  playerHand.splice(i,1);

  if (card.colour === "black") {
    colourPicker.style.display = "block";
    wildCallback = colour => finishPlay(card, colour);
  } else {
    finishPlay(card, card.colour);
  }
}

/* AI */
function aiTurn() {
  if (currentPlayer !== "ai" || gameOver) return;

  const idx = aiHand.findIndex(canPlay);
  if (idx === -1) {
    drawCards(aiHand, pendingDrawActive ? pendingDraw : 1);
    pendingDraw = 0;
    pendingDrawActive = false;
    currentPlayer = "player";
    render();
    return;
  }

  const card = aiHand.splice(idx,1)[0];
  const colour = card.colour === "black"
    ? colours[Math.floor(Math.random()*4)]
    : card.colour;

  finishPlay(card, colour);
}

/* Common */
function finishPlay(card, colour) {
  discardPile.push(card);
  currentColour = colour;

  if (card.value === "draw2") {
    pendingDraw += 2;
    pendingDrawActive = true;
  }
  if (card.value === "wild4") {
    pendingDraw += 4;
    pendingDrawActive = true;
  }

  const extra = card.value === "skip" || card.value === "reverse";
  currentPlayer = extra ? currentPlayer : (currentPlayer === "player" ? "ai" : "player");

  render();
  if (currentPlayer === "ai") setTimeout(aiTurn, 700);
}

function drawCards(hand, n) {
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) shuffle();
    hand.push(deck.pop());
  }
}

/* Wild picker */
document.querySelectorAll(".colour-btn").forEach(b => {
  b.onclick = () => {
    colourPicker.style.display = "none";
    wildCallback(b.dataset.colour);
    wildCallback = null;
  };
});

/* Deck click */
deckDiv.onclick = () => {
  if (currentPlayer !== "player" || gameOver) return;
  drawCards(playerHand, pendingDrawActive ? pendingDraw : 1);
  pendingDraw = 0;
  pendingDrawActive = false;
  currentPlayer = "ai";
  render();
  setTimeout(aiTurn, 700);
};

/* Win */
function checkWin() {
  if (playerHand.length === 0) endGame(true);
  if (aiHand.length === 0) endGame(false);
}

function endGame(playerWon) {
  gameOver = true;
  winOverlay.style.display = "flex";
  winMessageEl.textContent = playerWon ? "You Win!" : "You Lose!";
  trophyEl.style.display = playerWon ? "block" : "none";
}

restartBtn.onclick = startGame;

startGame();
