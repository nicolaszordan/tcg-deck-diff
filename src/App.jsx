import { useState, useEffect } from "react";
import { RefreshCcw, Clipboard } from "lucide-react";
import './App.css';

const CARD_MINIATURE_WIDTH = 200; // Width of the card miniature
const CARD_MINIATURE_HEIGHT = 280; // Height of the card miniature

export default function DeckDiff() {
  const [deck1, setDeck1] = useState("");
  const [deck2, setDeck2] = useState("");
  const [differences, setDifferences] = useState([]);
  const [showSimilarities, setShowSimilarities] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [cardImages, setCardImages] = useState({});
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [currency, setCurrency] = useState("eur"); // Default to EUR
  const [notification, setNotification] = useState(""); // Notification message
  const [fadeOut, setFadeOut] = useState(false); // Controls fade-out effect

  function parseDeck(deck) {
    return deck
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .reduce((acc, line) => {
        const match = line.match(/(\d+)\s+(.+)/);
        if (match) {
          const [, count, name] = match;
          acc[name] = (acc[name] || 0) + parseInt(count, 10);
        }
        return acc;
      }, {});
  }

  function compareDecks() {
    const parsedDeck1 = parseDeck(deck1);
    const parsedDeck2 = parseDeck(deck2);
    const diff = [];

    for (const card in parsedDeck1) {
      if (!parsedDeck2[card]) {
        diff.push({ type: "removed", card, count: parsedDeck1[card] });
      } else {
        const commonCount = Math.min(parsedDeck1[card], parsedDeck2[card]);
        if (commonCount > 0) {
          diff.push({ type: "same", card, count: commonCount });
        }
        if (parsedDeck1[card] > parsedDeck2[card]) {
          diff.push({
            type: "removed",
            card,
            count: parsedDeck1[card] - parsedDeck2[card],
          });
        }
      }
    }

    for (const card in parsedDeck2) {
      if (!parsedDeck1[card]) {
        diff.push({ type: "added", card, count: parsedDeck2[card] });
      } else if (parsedDeck2[card] > parsedDeck1[card]) {
        diff.push({
          type: "added",
          card,
          count: parsedDeck2[card] - parsedDeck1[card],
        });
      }
    }

    setDifferences(diff);
  }

  function swapDecks() {
    setDeck1(deck2);
    setDeck2(deck1);
  }

  useEffect(() => {
    if (deck1 && deck2) {
      compareDecks();
    }
  }, [deck1, deck2]);

  useEffect(() => {
    if (hoveredCard && cardImages[hoveredCard]) {
      setCursorPos({ x: cursorPos.x, y: cursorPos.y });
    }
  }, [hoveredCard]);

  function handleMouseMove(e) {
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left + 20; // Offset so the image doesn't cover the cursor
    const y = e.clientY - container.top;

    const windowHeight = window.innerHeight;
    const offset = 10; // Additional offset for spacing

    // Check if there's enough space below the cursor for the card image
    const adjustedY =
      e.clientY + CARD_MINIATURE_HEIGHT + offset > windowHeight
        ? e.clientY - CARD_MINIATURE_HEIGHT - offset
        : e.clientY + offset;

    setCursorPos({ x, y: adjustedY - container.top });
  }

  async function fetchCardInfosOnHover(card) {
    if (!cardImages[card]) {
      setCardImages((prev) => ({
        ...prev,
        [card]: { loading: true, image: null, prices: { eur: "N/A", usd: "N/A" } },
      }));

      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card)}`
        );
        const data = await res.json();
        setCardImages((prev) => ({
          ...prev,
          [card]: {
            loading: false,
            image: data.image_uris?.normal || null,
            prices: {
              eur: data.prices?.eur || "N/A",
              usd: data.prices?.usd || "N/A",
            },
          },
        }));
      } catch {
        setCardImages((prev) => ({
          ...prev,
          [card]: { loading: false, image: null, prices: { eur: "N/A", usd: "N/A" } },
        }));
      }
    }
  }

  function showNotification(message) {
    setNotification(message);
    setFadeOut(false); // Reset fade-out state
    setTimeout(() => setFadeOut(true), 2500); // Start fade-out after 2.5 seconds
    setTimeout(() => setNotification(""), 3000); // Clear notification after 3 seconds
  }

  function copyAddedCardsToClipboard() {
    const addedCards = differences
      .filter((diff) => diff.type === "added")
      .map((diff) => `${diff.count} ${diff.card}`)
      .join("\n");

    navigator.clipboard.writeText(addedCards).then(() => {
      showNotification("Added cards copied to clipboard!");
    });
  }

  function copyRemovedCardsToClipboard() {
    const removedCards = differences
      .filter((diff) => diff.type === "removed")
      .map((diff) => `${diff.count} ${diff.card}`)
      .join("\n");

    navigator.clipboard.writeText(removedCards).then(() => {
      showNotification("Removed cards copied to clipboard!");
    });
  }

  return (
    <div
      className="p-4 max-w-4xl mx-auto relative"
      onMouseMove={handleMouseMove}
    >
      {notification && ( // Display notification if it exists
        <div className={`absolute top-4 right-4 bg-green-500 text-white p-2 rounded shadow transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}>
          {notification}
        </div>
      )}
      <h1 className="text-xl font-bold mb-4">TCG Deck List Comparator</h1>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Original Deck</h2>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Paste original deck list here..."
            rows={10}
            value={deck1}
            onChange={(e) => setDeck1(e.target.value)}
          ></textarea>
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Changed Deck</h2>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Paste changed deck list here..."
            rows={10}
            value={deck2}
            onChange={(e) => setDeck2(e.target.value)}
          ></textarea>
        </div>
      </div>
      <div className="flex justify-between items-center gap-4 mt-4">
        <button
          className="bg-gray-500 text-white p-2 rounded flex items-center gap-2"
          onClick={swapDecks}
        >
          <RefreshCcw size={16} /> Swap Decks
        </button>
        <label className="flex items-center gap-2">
          <span>Currency:</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="eur">🇪🇺 EUR</option> {/* European Union flag */}
            <option value="usd">🇺🇸 USD</option> {/* United States flag */}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <label className="mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSimilarities}
            onChange={() => setShowSimilarities(!showSimilarities)}
          />
          Show/Hide Cards in Common
        </label>
        <h2 className="text-lg font-semibold">Differences:</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-green-500">
                Added Cards (
                {differences
                  .filter((diff) => diff.type === "added")
                  .reduce((sum, diff) => sum + diff.count, 0)}
                ):
              </h3>
              <button
                className="bg-gray-500 text-white p-1 rounded text-sm flex items-center"
                onClick={copyAddedCardsToClipboard}
                title="Copy added cards to clipboard" // Tooltip
              >
                <Clipboard size={16} /> {/* Clipboard icon */}
              </button>
            </div>
            <ul className="mt-2 font-mono">
              {differences
                .filter((diff) => diff.type === "added")
                .map((diff, index) => (
                  <li
                    key={index}
                    className={`${
                      cardImages[diff.card] === null
                        ? "underline decoration-red-500"
                        : ""
                    }`}
                    onMouseEnter={() => {
                      setHoveredCard(diff.card);
                      fetchCardInfosOnHover(diff.card);
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <span className="text-green-500 unselectable">+ </span>
                    <span className="text-green-500">{diff.count} {diff.card}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="w-full md:w-1/2">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-red-500">
                Removed Cards (
                {differences
                  .filter((diff) => diff.type === "removed")
                  .reduce((sum, diff) => sum + diff.count, 0)}
                ):
              </h3>
              <button
                className="bg-gray-500 text-white p-1 rounded text-sm flex items-center"
                onClick={copyRemovedCardsToClipboard}
                title="Copy removed cards to clipboard" // Tooltip
              >
                <Clipboard size={16} /> {/* Clipboard icon */}
              </button>
            </div>
            <ul className="mt-2 font-mono">
              {differences
                .filter((diff) => diff.type === "removed")
                .map((diff, index) => (
                  <li
                    key={index}
                    className={`${
                      cardImages[diff.card] === null
                        ? "underline decoration-red-500"
                        : ""
                    }`}
                    onMouseEnter={() => {
                      setHoveredCard(diff.card);
                      fetchCardInfosOnHover(diff.card);
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <span className="text-red-500 unselectable">- </span>
                    <span className="text-red-500">{diff.count} {diff.card}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
        {showSimilarities && (
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-yellow-500">
                Cards in Common (
                {differences
                  .filter((diff) => diff.type === "same")
                  .reduce((sum, diff) => sum + diff.count, 0)}
                ):
              </h3>
              <button
                className="bg-gray-500 text-white p-1 rounded text-sm flex items-center"
                onClick={() => {
                  const commonCards = differences
                    .filter((diff) => diff.type === "same")
                    .map((diff) => `${diff.count} ${diff.card}`)
                    .join("\n");

                  navigator.clipboard.writeText(commonCards).then(() => {
                    showNotification("Cards in common copied to clipboard!");
                  });
                }}
                title="Copy cards in common to clipboard" // Tooltip
              >
                <Clipboard size={16} /> {/* Clipboard icon */}
              </button>
            </div>
            <ul className="mt-2 font-mono">
              {differences
                .filter((diff) => diff.type === "same")
                .map((diff, index) => (
                  <li
                    key={index}
                    className={`${
                      cardImages[diff.card] === null
                        ? "underline decoration-red-500"
                        : ""
                    }`}
                    onMouseEnter={() => {
                      setHoveredCard(diff.card);
                      fetchCardInfosOnHover(diff.card);
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <span className="text-yellow-500 unselectable">= </span>
                    <span className="text-yellow-500">{diff.count} {diff.card}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
      {hoveredCard && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: cursorPos.y,
            left: cursorPos.x,
            width: CARD_MINIATURE_WIDTH,
          }}
        >
          {cardImages[hoveredCard]?.loading ? (
            <div
              className="flex items-center justify-center bg-gray-200"
              style={{
                width: CARD_MINIATURE_WIDTH,
                height: CARD_MINIATURE_HEIGHT,
              }}
            >
              <span className="loader"></span> {/* Add a spinner here */}
            </div>
          ) : (
            cardImages[hoveredCard]?.image && (
              <>
                <img
                  src={cardImages[hoveredCard].image}
                  alt={hoveredCard}
                  style={{
                    width: CARD_MINIATURE_WIDTH,
                    height: CARD_MINIATURE_HEIGHT,
                  }}
                />
                <div
                  className="text-center bg-white text-black p-1 rounded shadow"
                  style={{
                    width: CARD_MINIATURE_WIDTH,
                  }}
                >
                  Price: {currency === "eur" ? "€" : "$"}
                  {cardImages[hoveredCard]?.prices[currency]}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
