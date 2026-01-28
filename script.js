const colours = ["red", "yellow", "green", "blue"];

let deck = [];
let discardPile = [];
let playerHand = [];
let aiHand = [];
let currentColour = null;
let currentPlayer = "player"; // "player" or "ai"
let wildCallback = null;
let gameOver = false;

// stacking for Draw cards (Draw 2 and Wild +4)
let pendingDraw = 0;        // total cards to draw
let pendingDrawActive = false;

const playerHandDiv   = document.getElementById("player-hand");
const aiHandDiv       = document.getElementById("ai-hand");
const discardDiv      = document.getElementById("discard");
const deckDiv         = document.getElementById("deck");
const messageDiv      = document.getElementById("message");
const currentColourEl = document.getElementById("current-colour");
const colourPicker    = document.getElementById("colour-picker");
const playerUnoEl     = document.getElementById("player-uno");
const aiUnoEl         = document.getElementById("ai-uno");
const winOverlay      = document.getElementById("win-overlay");
const winMessageEl    = document.getElementById("win-message");
const restartBtn      = document.getElementById("restart-btn");
const confettiContainer = document.getElementById("confetti-container");
const trophyEl        = document.querySelector(".trophy");

// NEW: card count elements
const playerCountEl   = document.getElementById("player-count");
const aiCountEl       = document.getElementById("ai-count");

/* ------------------ DECK ------------------ */
function createDeck() {
  deck = [];

  for (let colour of colours) {
    // Number cards 0–9
    for (let i = 0; i <= 9; i++) {
      deck.push({ colour, value: i });
    }
    // Action cards x2: skip, reverse, draw2
    ["skip", "reverse", "draw2"].forEach(v => {
      deck.push({ colour, value: v });
      deck.push({ colour, value: v });
    });
  }

  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ colour: "black", value: "wild" });
    deck.push({ colour: "black", value: "wild4" });
  }
}

function shuffle() {
  deck.sort(() => Math.random() - 0.5);
}

/* ------------------ SETUP ------------------ */
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

  // Flip first card
  let first = deck.pop();
  discardPile.push(first);
  currentColour = first.colour === "black"
    ? colours[Math.floor(Math.random() * colours.length)]
    : first.colour;

  currentPlayer = "player";
  render();
}

/* ------------------ RENDER ------------------ */

// helper: how value is shown on the card face
function displayValue(value) {
  if (value === "draw2") return "+2";
  if (value === "wild4") return "+4";
  return value;
}

function render() {
  playerHandDiv.innerHTML = "";
  aiHandDiv.innerHTML = "";

  // Player hand
  playerHand.forEach((card, index) => {
    const div = document.createElement("div");

    // Base class
    let classes = "card";

    // Only add colour class if not black (wilds)
    if (card.colour !== "black") {
      classes += ` ${card.colour}`;
    }

    // Wild & +4 get quartered look
    if (card.value === "wild" || card.value === "wild4") {
      classes += " wild4-card";
    }

    div.className = classes;
    div.textContent = displayValue(card.value);
    div.onclick = () => playPlayerCard(index);
    playerHandDiv.appendChild(div);
  });

  // AI hand (face down)
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

  // Current colour + pending draw info
  currentColourEl.textContent = `Current colour: ${currentColour.toUpperCase()}` +
    (pendingDrawActive ? `  |  Pending draw: ${pendingDraw}` : "");

  // UNUS badges
  if (playerHand.length === 1) {
    playerUnoEl.textContent = "UNUS!";
    playerUnoEl.classList.add("active");
  } else {
    playerUnoEl.textContent = "";
    playerUnoEl.classList.remove("active");
  }

  if (aiHand.length === 1) {
    aiUnoEl.textContent = "UNUS!";
    aiUnoEl.classList.add("active");
  } else {
    aiUnoEl.textContent = "";
    aiUnoEl.classList.remove("active");
  }

  // NEW: card counts
  playerCountEl.textContent = `Cards: ${playerHand.length}`;
  aiCountEl.textContent = `Cards: ${aiHand.length}`;

  // Turn / status message
  if (!gameOver) {
    if (pendingDrawActive && currentPlayer === "player") {
      messageDiv.textContent = `Your turn – play +2 / +4 or draw ${pendingDraw}`;
    } else if (pendingDrawActive && currentPlayer === "ai") {
      messageDiv.textContent = `AI turn – deciding whether to stack or draw ${pendingDraw}`;
    } else {
      messageDiv.textContent =
        currentPlayer === "player" ? "Your turn" : "AI is thinking...";
    }
  }
}

/* ------------------ RULES ------------------ */
function canPlay(card) {
  const top = discardPile[discardPile.length - 1];

  // While under draw penalty, only Draw 2 or Wild4 can be stacked
  if (pendingDrawActive) {
    return card.value === "draw2" || card.value === "wild4";
  }

  return (
    card.colour === currentColour ||
    card.value === top.value ||
    card.colour === "black"
  );
}

/* ------------------ PLAYER TURN ------------------ */
function playPlayerCard(index) {
  if (gameOver) return;
  if (currentPlayer !== "player") return;

  const card = playerHand[index];

  // While under draw penalty, player can only stack with Draw2/Wild4
  if (pendingDrawActive && card.value !== "draw2" && card.value !== "wild4") {
    return;
  }

  if (!canPlay(card)) return;

  playerHand.splice(index, 1);

  if (card.colour === "black") {
    // Wild – let player choose colour
    showColourPicker(colour => {
      applyCardPlay(card, "player", colour);
      handleEndOfPlay(card);
      checkForWinner();
      render();
    });
  } else {
    applyCardPlay(card, "player", card.colour);
    handleEndOfPlay(card);
    checkForWinner();
    render();
  }
}

/* ------------------ AI TURN ------------------ */
function aiTurn() {
  if (gameOver) return;
  if (currentPlayer !== "ai") return;

  // If under draw penalty, AI tries to stack with Draw2/Wild4
  if (pendingDrawActive) {
    const idx = aiHand.findIndex(
      c => c.value === "draw2" || c.value === "wild4"
    );

    if (idx !== -1) {
      const card = aiHand.splice(idx, 1)[0];
      if (card.colour === "black") {
        const bestColour = chooseBestColour(aiHand) ||
          colours[Math.floor(Math.random() * colours.length)];
        applyCardPlay(card, "ai", bestColour);
      } else {
        applyCardPlay(card, "ai", card.colour);
      }
      handleEndOfPlay(card);
      checkForWinner();
      render();
    } else {
      // Forced pick-up for AI: draw full amount, then it's YOUR turn
      drawCards(aiHand, pendingDraw);
      pendingDraw = 0;
      pendingDrawActive = false;
      currentPlayer = "player";
      checkForWinner();
      render();
    }
    return;
  }

  // Normal AI turn (no pending draw)
  const playableIndex = aiHand.findIndex(canPlay);

  if (playableIndex === -1) {
    // No card to play: draw 1 and pass turn
    drawCards(aiHand, 1);
    currentPlayer = "player";
    checkForWinner();
    render();
    return;
  }

  const card = aiHand.splice(playableIndex, 1)[0];

  if (card.colour === "black") {
    const bestColour = chooseBestColour(aiHand) ||
      colours[Math.floor(Math.random() * colours.length)];
    applyCardPlay(card, "ai", bestColour);
  } else {
    applyCardPlay(card, "ai", card.colour);
  }

  handleEndOfPlay(card);
  checkForWinner();
  render();
}

/* ------------------ CARD EFFECTS ------------------ */
function applyCardPlay(card, player, chosenColour) {
  discardPile.push(card);

  currentColour = card.colour === "black"
    ? chosenColour
    : card.colour;

  // Stacking logic: increase pending draw for Draw2 / Wild4
  if (card.value === "draw2") {
    pendingDraw += 2;
    pendingDrawActive = true;
  }

  if (card.value === "wild4") {
    pendingDraw += 4;
    pendingDrawActive = true;
  }
}

function drawCards(hand, count) {
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) reshuffle();
    if (deck.length === 0) return; // no cards left at all
    hand.push(deck.pop());
  }
}

function reshuffle() {
  // Move all but top discard back into deck
  const top = discardPile.pop();
  deck = discardPile;
  discardPile = [top];
  shuffle();
}

/* ------------------ TURN HANDLING ------------------ */
// In 2-player: Skip & Reverse = extra turn for same player
function handleEndOfPlay(card) {
  const extraTurn = card.value === "skip" || card.value === "reverse";
  nextPlayer(extraTurn);
}

function nextPlayer(extraTurn) {
  if (!extraTurn) {
    currentPlayer = currentPlayer === "player" ? "ai" : "player";
  }
  render();
  if (!gameOver && currentPlayer === "ai") {
    setTimeout(aiTurn, 800);
  }
}

/* ------------------ WILD COLOUR PICKER ------------------ */
function showColourPicker(onChoice) {
  wildCallback = onChoice;
  colourPicker.style.display = "flex";
}

function chooseColour(colour) {
  colourPicker.style.display = "none";
  if (wildCallback) {
    wildCallback(colour);
    wildCallback = null;
  }
}

// Attach listeners to colour buttons
document.querySelectorAll(".colour-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const colour = btn.getAttribute("data-colour");
    chooseColour(colour);
  });
});

/* ------------------ AI HELPERS ------------------ */
function chooseBestColour(hand) {
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  hand.forEach(card => {
    if (counts.hasOwnProperty(card.colour)) {
      counts[card.colour]++;
    }
  });

  let bestColour = null;
  let bestCount = -1;
  for (const c of colours) {
    if (counts[c] > bestCount) {
      bestCount = counts[c];
      bestColour = c;
    }
  }
  return bestCount > 0 ? bestColour : null;
}

/* ------------------ DECK CLICK ------------------ */
// Player draw logic:
// - If under penalty: draw ALL pending cards, then AI's turn
// - Otherwise: draw ONE card, then AI's turn
deckDiv.onclick = () => {
  if (gameOver) return;
  if (currentPlayer !== "player") return;

  if (pendingDrawActive) {
    drawCards(playerHand, pendingDraw);
    pendingDraw = 0;
    pendingDrawActive = false;
  } else {
    drawCards(playerHand, 1);
  }

  currentPlayer = "ai";  // always the other person's turn after pick-up
  checkForWinner();
  render();
  setTimeout(aiTurn, 800);
};

/* ------------------ WIN / LOSE HANDLING ------------------ */
function checkForWinner() {
  if (gameOver) return;

  if (playerHand.length === 0) {
    endGame("player");
  } else if (aiHand.length === 0) {
    endGame("ai");
  }
}

function endGame(winner) {
  gameOver = true;

  if (winner === "player") {
    messageDiv.textContent = "You win!";
    winMessageEl.textContent = "You Win!";
    trophyEl.style.display = "block";
    showWinOverlay();
    launchConfetti();
  } else {
    messageDiv.textContent = "AI wins!";
    winMessageEl.textContent = "You Lose!";
    trophyEl.style.display = "none";
    showWinOverlay();
    // no confetti for AI win
  }
}

/* ------------------ OVERLAY & CONFETTI ------------------ */
function showWinOverlay() {
  winOverlay.style.display = "flex";
}

function hideWinOverlay() {
  winOverlay.style.display = "none";
  confettiContainer.innerHTML = "";
}

function launchConfetti() {
  confettiContainer.innerHTML = "";
  const pieces = 100;
  for (let i = 0; i < pieces; i++) {
    const conf = document.createElement("div");
    conf.className = "confetti";
    conf.style.left = Math.random() * 100 + "%";
    conf.style.animationDuration = (3 + Math.random() * 2) + "s";

    const coloursConf = ["#e74c3c","#f1c40f","#2ecc71","#3498db","#9b59b6"];
    conf.style.backgroundColor =
      coloursConf[Math.floor(Math.random() * coloursConf.length)];

    confettiContainer.appendChild(conf);
  }
}

/* ------------------ RESTART BUTTON ------------------ */
restartBtn.addEventListener("click", () => {
  startGame();
});

/* ------------------ START ------------------ */
startGame();
