import React, {
  useEffect,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import AppBar from "@mui/material/AppBar";

import TranslationButton from (
  "../Components/TranslationButton"
);
import Confirmation from (
  "../Components/Confirmation"
);
import { APIBASEURL } from "../config";

import "./TestSelection.css";


const completionValue = (
  user,
  currentName,
  legacyName
) =>
  Boolean(
    user?.[currentName]
      ?? user?.[legacyName]
      ?? false
  );


const LanguageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [
    englishMatchingCompleted,
    setEnglishMatchingCompleted,
  ] = useState(false);

  const [
    chineseMatchingCompleted,
    setChineseMatchingCompleted,
  ] = useState(false);

  const [
    englishRepetitionCompleted,
    setEnglishRepetitionCompleted,
  ] = useState(false);

  const [
    chineseRepetitionCompleted,
    setChineseRepetitionCompleted,
  ] = useState(false);

  const [
    englishStoryCompleted,
    setEnglishStoryCompleted,
  ] = useState(false);

  const [
    selectedButton,
    setSelectedButton,
  ] = useState(0);

  const [
    showChinese,
    setShowChinese,
  ] = useState(true);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const linkLocations = [
    "matching-test-chinese",
    "matching-test-english",
    "repetition-test-chinese",
    "repetition-test-english",
    "story-test-english",
  ];

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    setShowChinese(
      params.get("cn-zw") === "true"
    );
  }, [location]);

  useEffect(() => {
    const username =
      localStorage.getItem(
        "username"
      );

    if (!username) {
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(
          `${APIBASEURL}/users` +
            `?participantid=` +
            `${encodeURIComponent(
              username
            )}`,
          {
            headers: {
              Accept: (
                "application/json"
              ),
            },
          }
        );

        if (!response.ok) {
          console.error(
            "Error fetching user data",
            response.status
          );

          return;
        }

        const data =
          await response.json();

        const user =
          Array.isArray(data)
            ? data[0]
            : null;

        if (!user) {
          return;
        }

        setEnglishMatchingCompleted(
          completionValue(
            user,
            "completed_matching_en",
            "completedmatchingen"
          )
        );

        setChineseMatchingCompleted(
          completionValue(
            user,
            "completed_matching_cn",
            "completedmatchingcn"
          )
        );

        setEnglishRepetitionCompleted(
          completionValue(
            user,
            "completed_repetition_en",
            "completedrepetitionen"
          )
        );

        setChineseRepetitionCompleted(
          completionValue(
            user,
            "completed_repetition_cn",
            "completedrepetitioncn"
          )
        );

        setEnglishStoryCompleted(
          completionValue(
            user,
            "completed_story_en",
            "completedstoryen"
          )
        );

      } catch (error) {
        console.error(
          "Error fetching user data",
          error
        );
      }
    };

    fetchUserData();
  }, []);

  const handleTestClick = (
    index
  ) => {
    setSelectedButton(
      index + 1
    );

    setShowConfirmation(true);
  };

  const handleStartTest = () => {
    if (!selectedButton) {
      return;
    }

    const path =
      linkLocations[
        selectedButton - 1
      ];

    const queryParam =
      `?cn-zw=` +
      `${
        showChinese
          ? "true"
          : "false"
      }`;

    navigate(
      `/${path}${queryParam}`
    );
  };

  const allCompleted =
    englishMatchingCompleted
    && chineseMatchingCompleted
    && englishRepetitionCompleted
    && chineseRepetitionCompleted
    && englishStoryCompleted;

  const buttons = [
    {
      completed:
        chineseMatchingCompleted,
      chinese: "中文配对",
      english: "Chinese Matching",
    },
    {
      completed:
        englishMatchingCompleted,
      chinese: "英文配对",
      english: "English Matching",
    },
    {
      completed:
        chineseRepetitionCompleted,
      chinese: "中文句子复述",
      english:
        "Chinese Sentence Repetition",
    },
    {
      completed:
        englishRepetitionCompleted,
      chinese: "英文句子复述",
      english:
        "English Sentence Repetition",
    },
    {
      completed:
        englishStoryCompleted,
      chinese: "英文故事复述",
      english:
        "English Story Retention",
    },
  ];

  return (
    <div
      className={
        "languageSelection"
      }
    >
      <AppBar
        className={
          "titleContainer"
        }
      >
        <h1
          className={
            "selectionTitle"
          }
        >
          MERLS
        </h1>

        <TranslationButton
          showChinese={showChinese}
          setShowChinese={
            setShowChinese
          }
        />
      </AppBar>

      <div
        className={
          "testSelectionGroup"
        }
      >
        {buttons.map(
          (button, index) => (
            <button
              key={button.english}
              className={
                `testButton ${
                  selectedButton ===
                  index + 1
                    ? "selected"
                    : "unselected"
                }`
              }
              onClick={() =>
                handleTestClick(index)
              }
              disabled={
                button.completed
              }
            >
              {showChinese
                ? button.chinese
                : button.english}

              {button.completed
                ? (
                    showChinese
                      ? "（已完成）"
                      : " (Completed)"
                  )
                : ""}
            </button>
          )
        )}
      </div>

      {allCompleted && (
        <div
          className={
            "completionText"
          }
        >
          {showChinese
            ? (
                "恭喜！你已经完成" +
                "所有任务！"
              )
            : (
                "Congrats! You've " +
                "completed all the tests!"
              )}
        </div>
      )}

      <button
        className={
          `selectionButton ${
            selectedButton
              ? "selectionEnabled"
              : "selectionDisabled"
          }`
        }
        disabled={!selectedButton}
        onClick={handleStartTest}
      >
        {showChinese
          ? "开始"
          : "Start"}
      </button>

      {showConfirmation && (
        <Confirmation
          setShowConfirmation={
            setShowConfirmation
          }
          showChinese={showChinese}
          chineseText={
            "你确定要开始这个测试吗？"
          }
          englishText={
            "Are you sure you want " +
            "to start this test?"
          }
          confirmAction={
            handleStartTest
          }
        />
      )}
    </div>
  );
};


export default LanguageSelection;
