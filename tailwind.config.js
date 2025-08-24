
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/static/index.html"],
  theme: { extend: {} },
  safelist: [
    "border-red-600","text-red-300",
    "border-orange-600","text-orange-300",
    "border-slate-600","text-slate-300",
    "bg-slate-950","bg-slate-900","border-slate-800","border-slate-700",
    "text-slate-100","text-slate-400","text-slate-500","text-blue-300",
  ],
};
