// src/routesData.js

// Ye array aapke navigation menu ke liye hai
export const navLinks = [
  { id: 1, title: "Home", path: "/" },
  { id: 2, title: "About", path: "/about" },
  { id: 3, title: "Services", path: "/services" }
];

// Ye object aapke alag-alag pages ka data hai
export const pageData = {
  home: {
    title: "🏠 Home Page",
    content: "Welcome to our Task Management System!"
  },
  about: {
    title: "📖 About Us",
    content: "This project is built using Vite + React with dynamic data."
  },
  services: {
    title: "🛠 Our Services",
    content: "We provide high-quality task management solutions."
  }
};