import React from "react";
import Detect from "./components/Detect/Detect";

function App() {
  return (
    <div className="App">
      <Detect modelUrl="/sign_lang_recognizer.task" />
    </div>
  );
}

export default App;
