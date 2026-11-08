import React from "react";
import ReactDOM from "react-dom/client";
import WidgetApp from "./WidgetApp";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("./sw.js"); });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><WidgetApp /></React.StrictMode>
);
