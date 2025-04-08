import React from "react";
import Detect from "./components/Detect/Detect";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <Detect modelUrl="/sign_lang_recognizer.task" />
    </div>
  );
}

export default App;