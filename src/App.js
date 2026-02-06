import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home/Home";
import UserValidation from "./Home/UserValidation";
import ParentQuestions from "./Home/ParentQuestions";
import TestSelection from "./Test Selection/TestSelection";
import Test from "./Tests/Test";
import StoryTest from "./StoryTest/StoryTest";
import ExportResult from "./ExportResult";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserValidation />} />
        <Route path="/login" element={<UserValidation />} />
        <Route path="/parent-questions" element={<ParentQuestions />} />
        <Route path="/test-selection" element={<TestSelection />} />
        <Route
          path="/matching-test-chinese"
          element={<Test type="matching" language="chinese" />}
        />
        <Route
          path="/matching-test-english"
          element={<Test type="matching" language="english" />}
        />
        <Route
          path="/repetition-test-chinese"
          element={<Test type="repetition" language="chinese" />}
        />
        <Route
          path="/repetition-test-english"
          element={<Test type="repetition" language="english" />}
        />
        <Route
          path="/story-test-chinese"
          element={<StoryTest language="chinese" />}
        />
        <Route
          path="/story-test-english"
          element={<StoryTest language="english" />}
        />
        <Route path="/download-report" element={<ExportResult />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
