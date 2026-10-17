// Friendly, stable, anonymous display names derived from a wallet address:
// 0x2af4…8fbe → "Quiet Heron · 8fbe". Same wallet, same name, everywhere. Not reversible to a person.

const ADJECTIVES = [
  "Quiet", "Brave", "Calm", "Clever", "Curious", "Gentle", "Honest", "Lucky", "Mellow", "Nimble",
  "Patient", "Quick", "Silent", "Steady", "Sunny", "Swift", "Tidy", "Witty", "Bold", "Bright",
  "Cosy", "Daring", "Eager", "Frank", "Grand", "Humble", "Jolly", "Keen", "Loyal", "Merry",
  "Noble", "Plucky",
];
const ANIMALS = [
  "Heron", "Otter", "Falcon", "Panda", "Tiger", "Koel", "Mongoose", "Peacock", "Dolphin", "Lynx",
  "Badger", "Kestrel", "Gecko", "Ibex", "Langur", "Myna", "Owl", "Python", "Robin", "Sparrow",
  "Turtle", "Yak", "Bison", "Crane", "Deer", "Eagle", "Fox", "Gaur", "Hornbill", "Jackal",
  "Kingfisher", "Leopard",
];

export function pseudonym(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (hex.length < 8) return "Anonymous";
  const a = parseInt(hex.slice(0, 4), 16) % ADJECTIVES.length;
  const b = parseInt(hex.slice(4, 8), 16) % ANIMALS.length;
  return `${ADJECTIVES[a]} ${ANIMALS[b]}`;
}

/** "Quiet Heron · 8fbe" — the suffix disambiguates the rare name collision. */
export function displayName(address: string): string {
  return `${pseudonym(address)} · ${address.slice(-4).toLowerCase()}`;
}
