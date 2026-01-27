const colours = ["red", "yellow", "green", "blue"];

let deck = [];
let discardPile = [];
let playerHand = [];
let aiHand = [];
let currentColour = null;
let playerTurn = true;

const playerHandDiv = document.getElementById("player-hand");
const aiHandDiv = document.getElementById("ai-hand");
const discardDiv = document.getElementById("discard");
const deckDiv = document.getElementById("deck");
const messageDiv = document.getElementById("message");

/* ------------------ DECK ------------------ */
function createDeck() {
  deck = [];

  for (let colour of colours) {
    for (let i = 0; i <= 9; i++) {
      deck.push({ colour, value: i });
    }

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

/* ------------------ SETUP ------------------ */
function dealCards() {
  for (let i = 0; i < 7; i++) {
    playerHand.push(deck.pop());
    aiHand.push(deck.pop());
  }
}

function startGame() {
  createDeck();
  shuffle();
  dealCards();

  const firstCard = deck.pop();
  discardPile.push(firstCard);

  currentColour =
    firstCard.colour === "black"
      ? colours[Math.floor(Math.random() * colours.length)]
      : firstCard.colour;

  render();
}

/* ------------------ RENDER ------------------ */
function render() {
  playerHandDiv.innerHTML = "";
  aiHandDiv.innerHTML = "";

  playerHand.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = `card ${card.colour}`;
    div.textContent = card.value;
    div.onclick = () => playPlayerCard(index);
    playerHandDiv.appendChild(div);
  });

  aiHand.forEach(() => {
    const div = document.createElement("div");
    div.className = "card back";
    aiHandDiv.appendChild(div);
  });

  const topCard = discardPile[discardPile.length - 1];
  discardDiv.className = `card ${currentColour}`;
  discardDiv.textContent = topCard.value;

  messageDiv.textContent = playerTurn
    ? "Your turn"
    : "AI is thinking...";
}

/* ------------------ RULES ------------------ */
function canPlay(card) {
  const topCard = discardPile[discardPile.length - 1];
  return (
    card.colour === currentColour ||
    card.value === topCard.value ||
    card.colour === "black"
  );
}

/* ------------------ PLAYER ------------------ */
function playPlayerCard(index) {
  if (!playerTurn) return;

  const card = playerHand[index];
  if (!canPlay(card)) return;

  playerHand.splice(index, 1);
  playCard(card);

  playerTurn = false;
  render();
  setTimeout(aiTurn, 1000);
}

/* ------------------ AI ------------------ */
function aiTurn() {
  const playableIndex = aiHand.findIndex(canPlay);

  if (playableIndex !== -1) {
    const card = aiHand.splice(playableIndex, 1)[0];
    playCard(card);
  } else {
    aiHand.push(deck.pop());
  }

  playerTurn = true;
  render();
}

/* ------------------ CARD EFFECTS ------------------ */
function playCard(card) {
  discardPile.push(card);

  if (card.colour === "black") {
    currentColour = colours[Math.floor(Math.random() * colours.length)];
  } else {
    currentColour = card.colour;
  }

  if (card.value === "draw2") {
    drawCards(playerTurn ? aiHand : playerHand, 2);
  }

  if (card.value === "wild4") {
    drawCards(playerTurn ? aiHand : playerHand, 4);
  }
}

function drawCards(hand, count) {
  for (let i = 0; i < count; i++) {
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

/* ------------------ DECK CLICK ------------------ */
deckDiv.onclick = () => {
  if (!playerTurn) return;

  drawCards(playerHand, 1);
  playerTurn = false;
  render();
  setTimeout(aiTurn, 1000);
};

startGame();
