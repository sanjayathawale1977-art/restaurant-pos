// ============================================================
// ONE MENU FOR THE WHOLE APP
// The POS screen, the customer QR page (/order) and the /menu page
// all read from here, so prices can never differ between screens.
// To change a price or add a dish, edit it HERE only.
// ============================================================

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

export const CATEGORIES = [
  "All",
  "Cafe & Snacks",
  "Starters",
  "Main Course",
  "Breads",
  "Rice",
  "Beverages",
  "Desserts",
];

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;

export const MENU_DATA: MenuItem[] = [
  // Cafe Starters & Snacks
  { id: 1, name: "Peri Peri French Fries", category: "Cafe & Snacks", price: 110, image: IMG("photo-1573080496219-bb080dd4f877") },
  { id: 2, name: "Veg Cheese Grilled Sandwich", category: "Cafe & Snacks", price: 140, image: IMG("photo-1528735602780-2552fd46c7af") },
  { id: 3, name: "Paneer Tikka (6 Pcs)", category: "Starters", price: 210, image: IMG("photo-1567188040759-fb8a883dc6d8") },
  { id: 4, name: "Veg Crispy Manchurian", category: "Starters", price: 160, image: IMG("photo-1569058242253-92a9c755a0ec") },

  // Main Course
  { id: 5, name: "Paneer Butter Masala", category: "Main Course", price: 240, image: IMG("photo-1631452180519-c014fe946bc7") },
  { id: 6, name: "Dal Makhani Special", category: "Main Course", price: 190, image: IMG("photo-1546833999-b9f581a1996d") },
  { id: 7, name: "Kadhai Paneer", category: "Main Course", price: 230, image: IMG("photo-1589301760014-d929f3979dbc") },

  // Breads & Rice
  { id: 8, name: "Butter Naan", category: "Breads", price: 45, image: IMG("photo-1601050690597-df0568f70950") },
  { id: 9, name: "Tandoori Butter Roti", category: "Breads", price: 25, image: IMG("photo-1565557623262-b51c2513a641") },
  { id: 10, name: "Hyderabadi Veg Biryani", category: "Rice", price: 220, image: IMG("photo-1563379091339-03b21ab4a4f8") },
  { id: 11, name: "Jeera Rice with Dal Tadka", category: "Rice", price: 150, image: IMG("photo-1516714435131-44d6b64dc6a2") },

  // Beverages & Desserts
  { id: 12, name: "Cold Coffee with Ice Cream", category: "Beverages", price: 110, image: IMG("photo-1517701550927-30cf4ba1dba5") },
  { id: 13, name: "Special Kullad Masala Chai", category: "Beverages", price: 35, image: IMG("photo-1576092768241-dec231879fc3") },
  { id: 14, name: "Virgin Mint Mojito", category: "Beverages", price: 99, image: IMG("photo-1551024709-8f23befc6f87") },
  { id: 15, name: "Chocolate Sizzler Brownie", category: "Desserts", price: 140, image: IMG("photo-1606313564200-e75d5e30476c") },
];

// Raw material used per dish (used by the /menu page to reduce stock).
// Keys must match the dish names above exactly.
export const RECIPES: Record<string, { ingredient: string; qty: number }[]> = {
  "Paneer Butter Masala": [{ ingredient: "Paneer", qty: 0.25 }, { ingredient: "Butter", qty: 0.05 }],
  "Dal Makhani Special": [{ ingredient: "Butter", qty: 0.05 }],
  "Butter Naan": [{ ingredient: "Flour / Maida", qty: 0.1 }, { ingredient: "Butter", qty: 0.02 }],
  "Tandoori Butter Roti": [{ ingredient: "Flour / Maida", qty: 0.1 }],
  "Hyderabadi Veg Biryani": [{ ingredient: "Basmati Rice", qty: 0.2 }, { ingredient: "Paneer", qty: 0.05 }],
  "Jeera Rice with Dal Tadka": [{ ingredient: "Basmati Rice", qty: 0.15 }, { ingredient: "Butter", qty: 0.02 }],
  "Cold Coffee with Ice Cream": [{ ingredient: "Milk", qty: 0.25 }, { ingredient: "Coffee Beans", qty: 0.02 }],
  "Special Kullad Masala Chai": [{ ingredient: "Milk", qty: 0.15 }],
};
