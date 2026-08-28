export type Flavor = {
  id: string;
  name: string;
  emoji: string;
  from: string;
  to: string;
};

export const flavors: Flavor[] = [
  { id: "citron", name: "Citron", emoji: "🍋", from: "#F5E663", to: "#9FD84A" },
  { id: "peche", name: "Pêche", emoji: "🍑", from: "#FFC49B", to: "#FF6F91" },
  { id: "dragon", name: "Fruit du dragon", emoji: "🐉", from: "#C86DD7", to: "#E63E9C" },
  { id: "pasteque", name: "Pastèque", emoji: "🍉", from: "#FF7A93", to: "#3FC380" },
  { id: "mangue", name: "Mangue passion", emoji: "🥭", from: "#FFC94A", to: "#FF9640" },
  { id: "fruitsrouges", name: "Fruits rouges", emoji: "🍓", from: "#F0475D", to: "#FF8FA3" },
  { id: "gingembre", name: "Gingembre", emoji: "🫚", from: "#E8A33D", to: "#B96A2C" },
  { id: "menthe", name: "Menthe", emoji: "🌿", from: "#63E6BE", to: "#1F9E80" },
];
