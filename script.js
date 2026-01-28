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

const playerHandDiv   = document.getElementById("player-hand");
const aiHandDiv       = document.getElementById("ai-hand");
const discardDiv      = document.getElementById("discard");
const deckDiv         = document.getElementById("deck");
const messageDiv      = document.getElementById("message");
const currentColourEl = document.getElementById("current-colour");
const colourPicker    = document.getElementById("colour-picker");

const playerZingEl = document.getElementById("player-zing");
const aiZingEl     = document.getElementById("ai-zing");

const playerCountEl = document.getElementById("player-count");
const aiCountEl     = document.getElementById("ai-count");

const winOverlay   = document.getElementById("win-overlay");
const winMessageEl = document.getElementById("win-message");
const restartBtn   = document.getElementById("restart-btn");
const confettiContainer = document.getElementById("confetti-container");
const trophyEl = document.querySelector(".trophy");

/* ---------- DECK ---------- */
function createDeck() {
  deck = [];

  for (let colour of colours) {
    for (let i = 0; i <= 9; i++) deck.push({ colour, value: i });
    ["skip", "reverse", "draw2"].forEach(v => {
      deck.push({ colour, value: v });
      deck.push({ colour, value: v });
    });
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ colour: "black", value: "wild" });
    deck.push({ colour: "black", value: "wild4" });
  }
}

function shuffle() {
  deck.sort(() => Math.random() - 0.5);
}

function dealCards() {
  playerHand = [];
  aiHand = [];
  discardPile = [];
  for (let i = 0; i < 7; i++) {
    playerHand.push(deck.pop());
    aiHand.push(deck.pop());
  }
}

function startGame() {
  gameOver = false;
  pendingDraw = 0;
  pendingDrawActive = false;
  hideWinOverlay();

  createDeck();
  shuffle();
  dealCards();

  const first = deck.pop();
  discardPile.push(first);
  currentColour = first.colour === "black"
    ? colours[Math.floor(Math.random() * colours.length)]
    : first.colour;

  currentPlayer = "player";
  render();
}

/* ---------- RENDER ---------- */
function displayValue(value) {
  if (value === "draw2") return "+2";
  if (value === "wild4") return "+4";
  return value;
}

function render() {
  playerHandDiv.innerHTML = "";
  aiHandDiv.innerHTML = "";

  playerHand.forEach((card, index) => {
    const div = document.createElement("div");
    let classes = "card";
    if (card.colour !== "black") classes += ` ${card.colour}`;
    if (card.value === "wild" || card.value === "wild4") classes += " wild4-card";
    div.className = classes;
    div.textContent = displayValue(card.value);
    div.onclick = () => playPlayerCard(index);
    playerHandDiv.appendChild(div);
  });

  aiHand.forEach(() => {
    const div = document.createElement("div");
    div.className = "card back";
    aiHandDiv.appendChild(div);
  });

  const top = discardPile[discardPile.length - 1];
  let discardClasses = "card";
  if (top.colour !== "black") discardClasses += ` ${top.colour}`;
  if (top.value === "wild" || top.value === "wild4") discardClasses += " wild4-card";
  discardDiv.className = discardClasses;
  discardDiv.textContent = displayValue(top.value);

  currentColourEl.textContent =
    `Current colour: ${currentColour.toUpperCase()}` +
    (pendingDrawActive ? ` | Pending draw: ${pendingDraw}` : "");

  // ZING indicators
  playerZingEl.textContent = playerHand.length === 1 ? "ZING!" : "";
  aiZingEl.textContent     = aiHand.length === 1 ? "ZING!" : "";

  playerZingEl.classList.toggle("active", playerHand.length === 1);
  aiZingEl.classList.toggle("active", aiHand.length === 1);

  // Card counts
  playerCountEl.textContent = `Cards: ${playerHand.length}`;
  aiCountEl.textContent     = `Cards: ${aiHand.length}`;

  if (!gameOver) {
    messageDiv.textContent =
      pendingDrawActive
        ? currentPlayer === "player"
          ? `Your turn – play +2 / +4 or draw ${pendingDraw}`
          : "AI deciding..."
        : currentPlayer === "player"
          ? "Your turn"
          : "AI is thinking...";
  }
}

/* ---------- RULES ---------- */
function canPlay(card) {
  const top = discardPile[discardPile.length - 1];
  if (pendingDrawActive) return card.value === "draw2" || card.value === "wild4";
  return card.colour === currentColour || card.value === top.value || card.colour === "black";
}

function playPlayerCard(index) {
  if (gameOver || currentPlayer !== "player") return;
  const card = playerHand[index];
  if (!canPlay(card)) return;

  playerHand.splice(index, 1);

  if (card.colour === "black") {
    showColourPicker(colour => finishPlay(card, colour));
  } else {
    finishPlay(card, card.colour);
  }
}

function finishPlay(card, colour) {
  discardPile.push(card);
  currentColour = colour;

  if (card.value === "draw2") pendingDraw += 2;
  if (card.value === "wild4") pendingDraw += 4;
  if (card.value === "draw2" || card.value === "wild4") pendingDrawActive = true;

  const extraTurn = card.value === "skip" || card.value === "reverse";
  currentPlayer = extraTurn ? "player" : "ai";

  checkForWinner();
  render();
  if (currentPlayer === "ai") setTimeout(aiTurn, 800);
}

function aiTurn() {
  if (gameOver) return;

  const idx = aiHand.findIndex(canPlay);
  if (idx === -1) {
    drawCards(aiHand, pendingDrawActive ? pendingDraw : 1);
    pendingDraw = 0;
    pendingDrawActive = false;
    currentPlayer = "player";
    render();
    return;
  }

  const card = aiHand.splice(idx, 1)[0];
  const colour = card.colour === "black"
    ? colours[Math.floor(Math.random() * colours.length)]
    : card.colour;

  finishPlay(card, colour);
}

function drawCards(hand, n) {
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) reshuffle();
    hand.push(deck.pop());
  }
}

function reshuffle() {
  const top = discardPile.pop();
  deck = discardPile;
  discardPile = [top];
  shuffle();
}

/* ---------- WILD PICKER ---------- */
function showColourPicker(cb) {
  wildCallback = cb;
  colourPicker.style.display = "flex";
}

document.querySelectorAll(".colour-btn").forEach(btn => {
  btn.onclick = () => {
    colourPicker.style.display = "none";
    wildCallback(btn.dataset.colour);
    wildCallback = null;
  };
});

/* ---------- WIN ---------- */
function checkForWinner() {
  if (playerHand.length === 0) endGame(true);
  if (aiHand.length === 0) endGame(false);
}

function endGame(playerWon) {
  gameOver = true;
  winMessageEl.textContent = playerWon ? "You Win!" : "You Lose!";
  trophyEl.style.display = playerWon ? "block" : "none";
  winOverlay.style.display = "flex";
  if (playerWon) launchConfetti();
}

function hideWinOverlay() {
  winOverlay.style.display = "none";
  confettiContainer.innerHTML = "";
}

function launchConfetti() {
  for (let i = 0; i < 100; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "%";
    c.style.backgroundColor = colours[Math.floor(Math.random() * colours.length)];
    confettiContainer.appendChild(c);
  }
}

restartBtn.onclick = startGame;

startGame();
