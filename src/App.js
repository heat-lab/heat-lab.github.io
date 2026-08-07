import React from "react";
import {
  HashRouter,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./Home/Home";
import UserValidation from "./Home/UserValidation";
import ParentQuestions from "./Home/ParentQuestions";
import TestSelection from "./Test Selection/TestSelection";
import Test from "./Tests/Test";
import StoryTest from "./StoryTest/StoryTest";
import ExportResult from "./ExportResult";
import SideCamera from "./Components/SideCamera";


function App() {
  /*
   * Additional phone cameras use a root
   * query string rather than a normal app
   * route. Check for it before starting the
   * normal React router.
   */
  const cameraSession =
    new URLSearchParams(
      window.location.search
    ).get("cameraSession");

  if (cameraSession) {
    return (
      <SideCamera
        sessionId={
          cameraSession
        }
      />
    );
  }

  /*
   * HashRouter works reliably on GitHub
   * Pages even if the browser is refreshed
   * while the participant is on a test page.
   */
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Home />
          }
        />

        <Route
          path="/login"
          element={
            <UserValidation />
          }
        />

        <Route
          path="/parent-questions"
          element={
            <ParentQuestions />
          }
        />

        <Route
          path="/test-selection"
          element={
            <TestSelection />
          }
        />

        <Route
          path="/matching-test-chinese"
          element={
            <Test
              type="matching"
              language="chinese"
            />
          }
        />

        <Route
          path="/matching-test-english"
          element={
            <Test
              type="matching"
              language="english"
            />
          }
        />

        <Route
          path="/repetition-test-chinese"
          element={
            <Test
              type="repetition"
              language="chinese"
            />
          }
        />

        <Route
          path="/repetition-test-english"
          element={
            <Test
              type="repetition"
              language="english"
            />
          }
        />

        <Route
          path="/story-test-chinese"
          element={
            <StoryTest
              language="chinese"
            />
          }
        />

        <Route
          path="/story-test-english"
          element={
            <StoryTest
              language="english"
            />
          }
        />

        <Route
          path="/download-report"
          element={
            <ExportResult />
          }
        />
      </Routes>
    </HashRouter>
  );
}


export default App;
