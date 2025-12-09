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

  const [englishListeningCompleted, setEnglishListeningCompleted] =
    useState(false);
  const [chineseListeningCompleted, setChineseListeningCompleted] =
    useState(false);
  const [englishRepetitionCompleted, setEnglishRepetitionCompleted] =
    useState(false);
  const [chineseRepetitionCompleted, setChineseRepetitionCompleted] =
    useState(false);
  const [englishStoryCompleted, setEnglishStoryCompleted] = useState(false);

  const [selectedButton, setSelectedButton] = useState(0);
  const [showChinese, setShowChinese] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const linkLocations = [
    "/matching-test-chinese",
    "/matching-test-english",
    "/repetition-test-chinese",
    "/repetition-test-english",
    "/story-test-english",
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");
    setShowChinese(languageParam === "true");
  }, [location]);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) return;

    const fetchUserData = async () => {
      try {
        const response = await fetch(
          `${APIBASEURL}/users?participantid=${encodeURIComponent(username)}`
        );
        const data = await response.json();
        if (data && data.length > 0 && data[0].is_active) {
          const user = data[0];
          setEnglishListeningCompleted(user.completed_matching_en);
          setChineseListeningCompleted(user.completed_matching_cn);
          setEnglishRepetitionCompleted(user.completed_repetition_en);
          setChineseRepetitionCompleted(user.completed_repetition_cn);
          setEnglishStoryCompleted(user.completed_story_en);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleStart = () => {
    if (selectedButton <= 0 || selectedButton > linkLocations.length) return;
    const queryParam = `?cn-zw=${showChinese ? "true" : "false"}`;
    navigate(`${linkLocations[selectedButton - 1]}${queryParam}`);
  };

  const allCompleted =
    englishListeningCompleted &&
    chineseListeningCompleted &&
    englishRepetitionCompleted &&
    chineseRepetitionCompleted &&
    englishStoryCompleted;

  return (
    <div className="languageSelection">
      <AppBar className="titleContainer">
        <h1 className="selectionTitle">
          {showChinese ? (
            <>请选择下面的测试来开始</>
          ) : (
            <>Please select a test below to start</>
          )}
        </h1>
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </AppBar>

      <div className="testSelectionGroup">
        {/* Matching – Chinese */}
        <button
          className={`testButton ${
            selectedButton === 1 ? "selected" : "unselected"
          } ${chineseListeningCompleted ? "selectionDisabled" : ""}`}
          disabled={chineseListeningCompleted}
          onClick={() => setSelectedButton(1)}
        >
          {showChinese ? <>中文名词配对</> : <>Chinese Matching</>}
        </button>

        {/* Matching – English */}
        <button
          className={`testButton ${
            selectedButton === 2 ? "selected" : "unselected"
          } ${englishListeningCompleted ? "selectionDisabled" : ""}`}
          disabled={englishListeningCompleted}
          onClick={() => setSelectedButton(2)}
        >
          {showChinese ? <>英文名词配对</> : <>English Matching</>}
        </button>

        {/* Repetition – Chinese */}
        <button
          className={`testButton ${
            selectedButton === 3 ? "selected" : "unselected"
          } ${chineseRepetitionCompleted ? "selectionDisabled" : ""}`}
          disabled={chineseRepetitionCompleted}
          onClick={() => setSelectedButton(3)}
        >
          {showChinese ? <>中文句子复述</> : <>Chinese Sentence Repetition</>}
        </button>

        {/* Repetition – English */}
        <button
          className={`testButton ${
            selectedButton === 4 ? "selected" : "unselected"
          } ${englishRepetitionCompleted ? "selectionDisabled" : ""}`}
          disabled={englishRepetitionCompleted}
          onClick={() => setSelectedButton(4)}
        >
          {showChinese ? <>英文句子复述</> : <>English Sentence Repetition</>}
        </button>

        {/* Story – English */}
        <button
          className={`testButton ${
            selectedButton === 5 ? "selected" : "unselected"
          } ${englishStoryCompleted ? "selectionDisabled" : ""}`}
          disabled={englishStoryCompleted}
          onClick={() => setSelectedButton(5)}
        >
          {showChinese ? <>英文故事复述</> : <>English Story Retention</>}
        </button>

        {/* Start button with confirmation */}
        <button
          className={`selectionButton ${
            selectedButton === 0 ? "selectionDisabled" : "selectionEnabled"
          }`}
          disabled={selectedButton === 0}
          onClick={() => setShowConfirmation(true)}
        >
          {showChinese ? <>开始</> : <>Start</>}
        </button>
      </div>

      {allCompleted && (
        <div className="completionText">
          {showChinese ? (
            <>恭喜！您已完成所有测试！</>
          ) : (
            <>Congrats! You&apos;ve completed all the tests!</>
          )}
        </div>
      )}

      {showConfirmation && (
        <Confirmation
          showChinese={showChinese}
          englishText="Are you sure you want to begin this test?"
          chineseText="你确定要开始这个测试吗？"
          confirmAction={() => {
            setShowConfirmation(false);
            handleStart();
          }}
          cancelAction={() => setShowConfirmation(false)}
          setShowConfirmation={setShowConfirmation}
        />
      )}
    </div>
  );
};

export default LanguageSelection;
