import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UI from "./UI";

function App() {
  return (
    <>
      <div>
      </div>
      <Router>
        <Routes>
          <Route path="/" element={<UI/>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
