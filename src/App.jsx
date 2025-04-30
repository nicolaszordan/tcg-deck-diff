import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";

export default function DeckDiff() {
  const [deck1, setDeck1] = useState("");
  const [deck2, setDeck2] = useState("");
  const [differences, setDifferences] = useState([]);
  const [showSimilarities, setShowSimilarities] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [cardImages, setCardImages] = useState({});
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

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
    const newCardImages = {};

    const fetchCardImage = async (card) => {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card)}`);
        const data = await res.json();
        newCardImages[card] = data.image_uris?.normal || null;
      } catch {
        newCardImages[card] = null;
      }
    };

    const fetchPromises = [];

    for (const card in parsedDeck1) {
      if (!parsedDeck2[card]) {
        diff.push({ type: "removed", card, count: parsedDeck1[card] });
      } else if (parsedDeck1[card] > parsedDeck2[card]) {
        diff.push({
          type: "removed",
          card,
          count: parsedDeck1[card] - parsedDeck2[card],
        });
      } else {
        diff.push({ type: "same", card, count: parsedDeck1[card] });
      }
      fetchPromises.push(fetchCardImage(card));
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
      fetchPromises.push(fetchCardImage(card));
    }

    Promise.all(fetchPromises).then(() => setCardImages(newCardImages));
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
    const x = (e.clientX - container.left) + 20; // Offset so the image doesn't cover the cursor
    const y = e.clientY - container.top;
    setCursorPos({ x, y });
  }

  return (
    <div className="p-4 max-w-4xl mx-auto relative" onMouseMove={handleMouseMove}>
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
      <div className="flex gap-4 mt-4">
        <button className="bg-gray-500 text-white p-2 rounded flex items-center gap-2" onClick={swapDecks}>
          <RefreshCcw size={16} /> Swap Decks
        </button>
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
        <ul className="mt-2 font-mono">
          {differences.map((diff, index) => (
            <li
              key={index}
              className={`${diff.type === "added" ? "text-green-500" : diff.type === "removed" ? "text-red-500" : showSimilarities ? "text-yellow-500" : "hidden"} ${cardImages[diff.card] === null ? "underline decoration-red-500" : ""}`}
              onMouseEnter={() => setHoveredCard(diff.card)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {diff.type === "added" && `+ ${diff.count} ${diff.card}`}
              {diff.type === "removed" && `- ${diff.count} ${diff.card}`}
              {diff.type === "same" && showSimilarities && `= ${diff.count} ${diff.card}`}
            </li>
          ))}
        </ul>
      </div>
      {hoveredCard && cardImages[hoveredCard] && (
        <img
          src={cardImages[hoveredCard]}
          alt={hoveredCard}
          className="absolute pointer-events-none"
          style={{ top: cursorPos.y, left: cursorPos.x, width: 200 }}
        />
      )}
    </div>
  );
}
