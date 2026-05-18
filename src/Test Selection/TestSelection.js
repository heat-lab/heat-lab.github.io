import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";

import TranslationButton from "../Components/TranslationButton";
import Confirmation from "../Components/Confirmation";
import { APIBASEURL } from "../config";

import "./TestSelection.css";

const LanguageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [englishMatchingCompleted, setEnglishMatchingCompleted] =
    useState(false);
  const [chineseMatchingCompleted, setChineseMatchingCompleted] =
    useState(false);
  const [englishRepetitionCompleted, setEnglishRepetitionCompleted] =
    useState(false);
  const [chineseRepetitionCompleted, setChineseRepetitionCompleted] =
    useState(false);
  const [englishStoryCompleted, setEnglishStoryCompleted] = useState(false);

  const [selectedButton, setSelectedButton] = useState(0);
  const [showChinese, setShowChinese] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const linkLocations = [
    "matching-test-chinese",
    "matching-test-english",
    "repetition-test-chinese",
    "repetition-test-english",
    "story-test-english",
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");

    setShowChinese(languageParam === "true" || languageParam === "y");
  }, [location]);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) return;

    const fetchUserData = async () => {
      try {
        const res = await fetch(
          `${APIBASEURL}/users?participantid=${encodeURIComponent(username)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          console.error("Error fetching user data", res.status);
          return;
        }

        const data = await res.json();
        if (!data || data.length === 0) return;

        const user = data[0];

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

  const getConfirmationEnglishText = () => {
    switch (selectedButton) {
      case 1:
        return "Are you sure you want to begin the Chinese matching test?";
      case 2:
        return "Are you sure you want to begin the English matching test?";
      case 3:
        return "Are you sure you want to begin the Chinese repetition test?";
      case 4:
        return "Are you sure you want to begin the English repetition test?";
      case 5:
        return "Are you sure you want to begin the English story retention test?";
      default:
        return "Are you sure you want to start this test?";
    }
  };

  const getConfirmationChineseText = () => {
    switch (selectedButton) {
      case 1:
        return "你确定要开始中文配对测试吗？";
      case 2:
        return "你确定要开始英文配对测试吗？";
      case 3:
        return "你确定要开始中文复述测试吗？";
      case 4:
        return "你确定要开始英文复述测试吗？";
      case 5:
        return "你确定要开始英文故事回忆测试吗？";
      default:
        return "你确定要开始这个测试吗？";
    }
  };

  const testButtons = [
    {
      english: "Chinese Matching Test",
      chinese: "中文配对测试",
      completed: chineseMatchingCompleted,
    },
    {
      english: "English Matching Test",
      chinese: "英文配对测试",
      completed: englishMatchingCompleted,
    },
    {
      english: "Chinese Sentence Repetition Test",
      chinese: "中文句子复述测试",
      completed: chineseRepetitionCompleted,
    },
    {
      english: "English Sentence Repetition Test",
      chinese: "英文句子复述测试",
      completed: englishRepetitionCompleted,
    },
    {
      english: "English Story Retention Test",
      chinese: "英文故事回忆测试",
      completed: englishStoryCompleted,
    },
  ];

  return (
    <div className="languageSelection">
      <AppBar className="titleContainer">
        <h1 className="selectionTitle">MERLS</h1>
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </AppBar>

      <div className="testSelectionGroup">
        {testButtons.map((test, index) => (
          <button
            key={test.english}
            className={`testSelectionButton ${
              test.completed ? "completed" : ""
            }`}
            onClick={() => handleTestClick(index)}
          >
            <span>{showChinese ? test.chinese : test.english}</span>
            {test.completed && (
              <span className="completedText">
                {showChinese ? " 已完成" : " Completed"}
              </span>
            )}
          </button>
        ))}
      </div>

      {allCompleted && (
        <p className="actionText">
          {showChinese
            ? "你已经完成所有测试。"
            : "You have completed all tests."}
        </p>
      )}

      {showConfirmation && (
        <Confirmation
          showChinese={showChinese}
          setShowConfirmation={setShowConfirmation}
          confirmAction={handleStartTest}
          englishText={getConfirmationEnglishText()}
          chineseText={getConfirmationChineseText()}
        />
      )}
    </div>
  );
};

export default LanguageSelection;
