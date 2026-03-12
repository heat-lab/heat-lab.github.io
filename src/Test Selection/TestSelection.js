// src/Test Selection/TestSelection.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import TranslationButton from "../Components/TranslationButton";
import Confirmation from "../Components/Confirmation";
import "./TestSelection.css";
import { APIBASEURL } from "../config";

const LanguageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [englishMatchingCompleted, setEnglishMatchingCompleted] = useState(false);
  const [chineseMatchingCompleted, setChineseMatchingCompleted] = useState(false);
  const [englishRepetitionCompleted, setEnglishRepetitionCompleted] = useState(false);
  const [chineseRepetitionCompleted, setChineseRepetitionCompleted] = useState(false);
  const [englishStoryCompleted, setEnglishStoryCompleted] = useState(false);

  const [selectedButton, setSelectedButton] = useState(0);
  const [showChinese, setShowChinese] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const linkLocations = [
    "matching-test-chinese",
    "matching-test-english",
    "repetition-test-chinese",
    "repetition-test-english",
    "story-test-english",
  ];

  // Keep cn-zw query param behaviour
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");
    setShowChinese(languageParam === "true");
  }, [location]);

  // Fetch completion flags for the logged-in user
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) return;

    const fetchUserData = async () => {
      try {
        const res = await fetch(
          `${APIBASEURL}users?participantid=${encodeURIComponent(username)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        if (!res.ok) {
          console.error("Error fetching user data", res.status);
          return;
        }

        const data = await res.json();
        if (!data || data.length === 0) return;

        const user = data[0];

        // IMPORTANT: keep these names in sync with backend fields
        setEnglishMatchingCompleted(!!user.completedmatchingen);
        setChineseMatchingCompleted(!!user.completedmatchingcn);
        setEnglishRepetitionCompleted(!!user.completedrepetitionen);
        setChineseRepetitionCompleted(!!user.completedrepetitioncn);
        setEnglishStoryCompleted(!!user.completedstoryen);
      } catch (err) {
        console.error("Error fetching user data", err);
      }
    };

    fetchUserData();
  }, []);

  const handleTestClick = (index) => {
    setSelectedButton(index + 1);
    setShowConfirmation(true);
  };

  const handleStartTest = () => {
    if (!selectedButton) return;
    const path = linkLocations[selectedButton - 1];
    const queryParam = `?cn-zw=${showChinese ? "true" : "false"}`;
    navigate(`/${path}${queryParam}`);
  };

  const allCompleted =
    englishMatchingCompleted &&
    chineseMatchingCompleted &&
    englishRepetitionCompleted &&
    chineseRepetitionCompleted &&
    englishStoryCompleted;

  return (
    <div className="languageSelection">
      <AppBar className="titleContainer">
        <h1 className="selectionTitle">
          {showChinese ? "MERLS" : "MERLS"}
        </h1>
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </AppBar>

      <div className="testSelectionGroup">
        <button
          className={`testButton ${selectedButton === 1 ? "selected" : "unselected"
            }`}
          onClick={() => handleTestClick(0)}
          disabled={chineseMatchingCompleted}
        >
          {showChinese ? "中文配对" : "Chinese Matching"}
        </button>

        <button
          className={`testButton ${selectedButton === 2 ? "selected" : "unselected"
            }`}
          onClick={() => handleTestClick(1)}
          disabled={englishMatchingCompleted}
        >
          {showChinese ? "英文配对" : "English Matching"}
        </button>

        <button
          className={`testButton ${selectedButton === 3 ? "selected" : "unselected"
            }`}
          onClick={() => handleTestClick(2)}
          disabled={chineseRepetitionCompleted}
        >
          {showChinese ? "中文句子复述" : "Chinese Sentence Repetition"}
        </button>

        <button
          className={`testButton ${selectedButton === 4 ? "selected" : "unselected"
            }`}
          onClick={() => handleTestClick(3)}
          disabled={englishRepetitionCompleted}
        >
          {showChinese ? "英文句子复述" : "English Sentence Repetition"}
        </button>

        <button
          className={`testButton ${selectedButton === 5 ? "selected" : "unselected"
            }`}
          onClick={() => handleTestClick(4)}
          disabled={englishStoryCompleted}
        >
          {showChinese ? "英文故事复述" : "English Story Retention"}
        </button>
      </div>

      {allCompleted && (
        <div className="completionText">
          {showChinese
            ? "恭喜！你已经完成所有任务！"
            : "Congrats! You've completed all the tests!"}
        </div>
      )}

      <button
        className={`selectionButton ${selectedButton ? "selectionEnabled" : "selectionDisabled"
          }`}
        disabled={!selectedButton}
        onClick={handleStartTest}
      >
        {showChinese ? "开始" : "Start"}
      </button>

      {showConfirmation && (
        <Confirmation
          setShowConfirmation={setShowConfirmation}
          showChinese={showChinese}
          chineseText="你确定要开始这个测试吗？"
          englishText="Are you sure you want to start this test?"
          confirmAction={handleStartTest}
        />
      )}
    </div>
  );
};

export default LanguageSelection;
