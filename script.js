const colours = ["red", "yellow", "green", "blue"];

let deck = [];
let discardPile = [];
let playerHand = [];
let aiHand = [];
let currentColour = null;
let currentPlayer = "player";
let wildCallback = null;
let gameOver = false;

// draw stacking
let pendingDraw = 0;
let pendingDrawActive = false;

// DOM elements
const playerHandDiv   = document.getElementById("player-hand");
const aiHandDiv       = document.getElementById("ai-hand");
const discardDiv      = document.getElementById("discard");
const deckDiv         = document.getElementById("deck");
const messageDiv      = document.getElementById("message");
const currentColourEl = document.getElementById("current-colour");
const colourPicker    = document.getElementById("colour-picker");

const playerZingEl    = document.getElementById("player-zing");
const aiZingEl        = document.getElementById("ai-zing");

const playerCountEl   = document.getElementById("player-count");
const aiCountEl       = document.getElementById("ai-count");

const winOverlay      = document.getElementById("win-overlay");
const winMessageEl    = document.getElementById("win-message");
const restartBtn      = document.getElementById("restart-btn");
const confettiContainer = document.getElementById("confetti-container");
const trophyEl        = document.querySelector(".trophy");

/* ---------- DECK SETUP ---------- */
function createDeck() {
  deck = [];
  for (let colour of colours) {
    // number cards 0–9
    for (let i = 0; i <= 9; i++) {
      deck.push({ colour, value: i });
    }
    // action cards (x2 each): skip, reverse, draw2
    ["skip", "reverse", "draw2"].forEach(v => {
      deck.push({ colour, value: v });
      deck.push({ colour, value: v });
    });
  }
  // wilds and +4s
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

/* ---------- WIN OVERLAY HELPERS ---------- */
function hideWinOverlay() {
  winOverlay.style.display = "none";
  confettiContainer.innerHTML = "";
}

/* ---------- GAME START ---------- */
function startGame() {
  gameOver = false;
  pendingDraw = 0;
  pendingDrawActive = false;
  hideWinOverlay();

  createDeck();
  shuffle();
  dealCards();

  // Flip first card
  let first = deck.pop();
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

  // Player cards
  playerHand.forEach((card, index) => {
    const div = document.createElement("div");
    let classes = "card";

    if (card.colour !== "black") {
      classes += ` ${card.colour}`;
    }
    if (card.value === "wild" || card.value === "wild4") {
      classes += " wild4-card";
    }

    div.className = classes;
    div.textContent = displayValue(card.value);
    div.onclick = () => playPlayerCard(index);
    playerHandDiv.appendChild(div);
  });

  // AI cards (back)
  aiHand.forEach(() => {
    const div = document.createElement("div");
    div.className = "card back";
    aiHandDiv.appendChild(div);
  });

  // Discard pile
  const top = discardPile[discardPile.length - 1];
  let discardClasses = "card";
  if (top.colour !== "black") {
    discardClasses += ` ${top.colour}`;
  }
  if (top.value === "wild" || top.value === "wild4") {
    discardClasses += " wild4-card";
  }
  discardDiv.className = discardClasses;
  discardDiv.textContent = displayValue(top.value);

  // Status text & counts
  currentColourEl.textContent =
    `Current colour: ${currentColour.toUpperCase()}` +
    (pendingDrawActive ? ` | Pending draw: ${pendingDraw}` : "");

  playerCountEl.textContent = `Cards: ${playerHand.length}`;
  aiCountEl.textContent     = `Cards: ${aiHand.length}`;

  // ZING indicators
  const pZing = playerHand.length === 1;
  const aZing = aiHand.length === 1;

  playerZingEl.textContent = pZing ? "ZING!" : "";
  aiZingEl.textContent     = aZing ? "ZING!" : "";

  playerZingEl.classList.toggle("active", pZing);
  aiZingEl.classList.toggle("active", aZing);

  if (!gameOver) {
    messageDiv.textContent =
      currentPlayer === "player" ? "Your turn" : "AI is thinking...";
  }
}

/* ---------- RULES ---------- */

function canPlay(card) {
  const top = discardPile[discardPile.length - 1];

  // While under draw penalty, we have two modes depending on the top card:
  // 1) Stack started by +2 (top.value !== "wild4"):
  //    - ANY +2 (any colour)
  //    - ANY +4
  // 2) Top card is +4 (wild4):
  //    - ANY +4
  //    - +2 ONLY if it matches the CURRENT colour of the +4
  if (pendingDrawActive) {
    if (top.value === "wild4") {
      if (card.value === "wild4") return true;
      if (card.value === "draw2" && card.colour === currentColour) return true;
      return false;
    } else {
      // stack started with +2 (or still on +2)
      return card.value === "draw2" || card.value === "wild4";
    }
  }

  // Normal rule (no pending draw)
  return (
    card.colour === currentColour ||
    card.value === top.value ||
    card.colour === "black"
  );
}

/* ---------- COMMON CARD APPLY ---------- */

function applyCardPlay(card, chosenColour) {
  discardPile.push(card);
  currentColour = card.colour === "black" ? chosenColour : card.colour;

  if (card.value === "draw2") {
    pendingDraw += 2;
    pendingDrawActive = true;
  } else if (card.value === "wild4") {
    pendingDraw += 4;
    pendingDrawActive = true;
  }
}

function endOfTurn(card) {
  const extraTurn = card.value === "skip" || card.value === "reverse";
  if (!extraTurn) {
    currentPlayer = currentPlayer === "player" ? "ai" : "player";
  }
  checkForWinner();
  render();
  if (!gameOver && currentPlayer === "ai") {
    setTimeout(aiTurn, 800);
  }
}

/* ---------- PLAYER TURN ---------- */

function playPlayerCard(index) {
  if (gameOver || currentPlayer !== "player") return;

  const card = playerHand[index];

  // While under draw penalty, only +2 or +4 can be *considered*;
  // colour and wild rules are then enforced in canPlay().
  if (pendingDrawActive && card.value !== "draw2" && card.value !== "wild4") {
    return;
  }

  if (!canPlay(card)) return;

  playerHand.splice(index, 1);

  if (card.colour === "black") {
    showColourPicker(chosen => {
      applyCardPlay(card, chosen);
      endOfTurn(card);
    });
  } else {
    applyCardPlay(card, card.colour);
    endOfTurn(card);
  }
}

/* ---------- AI TURN ---------- */

function aiTurn() {
  if (gameOver || currentPlayer !== "ai") return;

  // Under draw penalty: AI tries to stack using same rules as player
  if (pendingDrawActive) {
    const idx = aiHand.findIndex(c => canPlay(c));
    if (idx !== -1) {
      const card = aiHand.splice(idx, 1)[0];
      const chosen =
        card.colour === "black"
          ? chooseBestColour(aiHand) || colours[Math.floor(Math.random() * colours.length)]
          : card.colour;
      applyCardPlay(card, chosen);
      endOfTurn(card);
    } else {
      // No valid stack: AI must draw all, then your turn
      drawCards(aiHand, pendingDraw);
      pendingDraw = 0;
      pendingDrawActive = false;
      currentPlayer = "player";
      checkForWinner();
      render();
    }
    return;
  }

  // Normal AI turn
  const playableIndex = aiHand.findIndex(canPlay);
  if (playableIndex === -1) {
    // No play: draw 1 then your turn
    drawCards(aiHand, 1);
    currentPlayer = "player";
    checkForWinner();
    render();
    return;
  }

  const card = aiHand.splice(playableIndex, 1)[0];
  const chosen =
    card.colour === "black"
      ? chooseBestColour(aiHand) || colours[Math.floor(Math.random() * colours.length)]
      : card.colour;

  applyCardPlay(card, chosen);
  endOfTurn(card);
}

/* ---------- DRAW & RESHUFFLE ---------- */

function drawCards(hand, count) {
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) reshuffle();
    if (deck.length === 0) return;
    hand.push(deck.pop());
  }
}

function reshuffle() {
  const top = discardPile.pop();
  deck = discardPile;
  discardPile = [top];
  shuffle();
}

/* ---------- WILD COLOUR PICKER ---------- */

function showColourPicker(onChoice) {
  wildCallback = onChoice;
  colourPicker.style.display = "flex";
}

document.querySelectorAll(".colour-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const colour = btn.getAttribute("data-colour");
    colourPicker.style.display = "none";
    if (wildCallback) {
      wildCallback(colour);
      wildCallback = null;
    }
  });
});

/* ---------- AI COLOUR CHOICE ---------- */

function chooseBestColour(hand) {
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  hand.forEach(card => {
    if (counts.hasOwnProperty(card.colour)) {
      counts[card.colour]++;
    }
  });

  let best = null;
  let bestCount = -1;
  for (let c of colours) {
    if (counts[c] > bestCount) {
      bestCount = counts[c];
      best = c;
    }
  }
  return bestCount > 0 ? best : null;
}

/* ---------- DECK CLICK (PLAYER DRAW) ---------- */

deckDiv.onclick = () => {
  if (gameOver || currentPlayer !== "player") return;

  if (pendingDrawActive) {
    // Under penalty: draw everything, then AI turn
    drawCards(playerHand, pendingDraw);
    pendingDraw = 0;
    pendingDrawActive = false;
  } else {
    // Normal: draw 1, then AI turn
    drawCards(playerHand, 1);
  }

  currentPlayer = "ai";
  checkForWinner();
  render();
  setTimeout(aiTurn, 800);
};

/* ---------- WIN LOGIC ---------- */

function checkForWinner() {
  if (playerHand.length === 0) {
    endGame("player");
  } else if (aiHand.length === 0) {
    endGame("ai");
  }
}

function endGame(winner) {
  gameOver = true;
  if (winner === "player") {
    winMessageEl.textContent = "You Win!";
    messageDiv.textContent = "You win!";
    trophyEl.style.display = "block";
    showWinOverlay();
    launchConfetti();
  } else {
    winMessageEl.textContent = "You Lose!";
    messageDiv.textContent = "AI wins!";
    trophyEl.style.display = "none";
    showWinOverlay();
  }
}

/* ---------- OVERLAY & CONFETTI ---------- */

function showWinOverlay() {
  winOverlay.style.display = "flex";
}

function launchConfetti() {
  confettiContainer.innerHTML = "";
  const pieces = 100;
  const coloursConf = ["#e74c3c","#f1c40f","#2ecc71","#3498db","#9b59b6"];
  for (let i = 0; i < pieces; i++) {
    const conf = document.createElement("div");
    conf.className = "confetti";
    conf.style.left = Math.random() * 100 + "%";
    conf.style.animationDuration = (3 + Math.random() * 2) + "s";
    conf.style.backgroundColor =
      coloursConf[Math.floor(Math.random() * coloursConf.length)];
    confettiContainer.appendChild(conf);
  }
}

/* ---------- RESTART ---------- */

restartBtn.addEventListener("click", () => {
  startGame();
});

/* ---------- START ---------- */

startGame();
