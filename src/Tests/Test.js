// src/Tests/Test.js
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import TranslationButton from "../Components/TranslationButton";
import Question from "./Question";
import Practice from "./Practice";
import CompletionPage from "./CompletionPage";
import GuidedTutorial from "./GuidedTutorial";
import Instructions from "./Instructions";
import "./Test.scss";
import { APIBASEURL } from "../config";

const Test = ({ type, language }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = instructions/guided/practice
  const [showChinese, setShowChinese] = useState(true);
  const [phase, setPhase] = useState("instructions"); // instructions -> tutorial -> practice -> test -> complete
  const audioLink = useRef(null);

  const isEnglish = language === "english";
  const isMatching = type === "matching";
  const isRepetition = type === "repetition";
  const isStory = type === "story";

  // Preserve cn-zw behaviour
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");
    setShowChinese(languageParam === "true");
  }, [location]);

  // Fetch questions from backend
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `${APIBASEURL}/questions?language=${encodeURIComponent(
            isEnglish ? "EN" : "CN"
          )}&type=${encodeURIComponent(type)}`
        );
        if (!response.ok) {
          console.error("Failed to fetch questions", response.status);
          return;
        }
        const questionList = await response.json();
        setQuestions(questionList || []);
      } catch (error) {
        console.error("Error fetching questions", error);
      }
    };

    fetchQuestions();
  }, [isEnglish, type]);

  // Instruction audio link
  useEffect(() => {
    if (isMatching) {
      audioLink.current = isEnglish
        ? "https://non-question-links.s3.us-east-2.amazonaws.com/english-matching-instructions.m4a"
        : "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-matching-instructions.m4a";
    } else if (isRepetition) {
      audioLink.current = isEnglish
        ? "https://non-question-links.s3.us-east-2.amazonaws.com/english-repetition-instructions.m4a"
        : "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-repetition-instructions.m4a";
    } else if (isStory) {
      audioLink.current = isEnglish
        ? "https://non-question-links.s3.us-east-2.amazonaws.com/english-story-instructions.m4a"
        : "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-story-instructions.m4a";
    }
  }, [isEnglish, isMatching, isRepetition, isStory]);

  const handleInstructionsComplete = () => {
    setPhase("tutorial");
  };

  const handleTutorialComplete = () => {
    setPhase("practice");
  };

  const handlePracticeComplete = () => {
    setPhase("test");
    setCurrentIndex(0);
  };

  const handleAnswerSubmit = async (answerPayload) => {
    const isLast = currentIndex === questions.length - 1;

    try {
      await submitAnswersToDB({
        type,
        isEnglish,
        answerPayload,
      });
    } catch (err) {
      console.error("Error submitting answer", err);
    }

    if (isLast) {
      setPhase("complete");
    } else {
      setCurrentIndex((idx) => idx + 1);
    }
  };

  const handleExitToSelection = () => {
    const queryParam = `?cn-zw=${showChinese ? "true" : "false"}`;
    navigate(`/test-selection${queryParam}`);
  };

  if (phase === "instructions") {
    return (
      <Instructions
        type={type}
        language={language}
        showChinese={showChinese}
        setShowChinese={setShowChinese}
        audioLink={audioLink}
        onComplete={handleInstructionsComplete}
      />
    );
  }

  if (phase === "tutorial") {
    return (
      <GuidedTutorial
        type={type}
        language={language}
        showChinese={showChinese}
        setShowChinese={setShowChinese}
        onComplete={handleTutorialComplete}
      />
    );
  }

  if (phase === "practice") {
    return (
      <Practice
        type={type}
        language={language}
        showChinese={showChinese}
        setShowChinese={setShowChinese}
        onComplete={handlePracticeComplete}
      />
    );
  }

  if (phase === "complete") {
    return (
      <CompletionPage
        type={type}
        language={language}
        showChinese={showChinese}
        setShowChinese={setShowChinese}
        onExit={handleExitToSelection}
      />
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="testContainer">
      <AppBar className="testAppBar">
        <h1 className="testTitle">
          {showChinese ? "MERLS" : "MERLS"}
        </h1>
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </AppBar>

      {currentQuestion && (
        <Question
          type={type}
          language={language}
          question={currentQuestion}
          index={currentIndex}
          total={questions.length}
          onSubmit={handleAnswerSubmit}
        />
      )}
    </div>
  );
};

// Helper: submit answer and mark completion correctly
async function submitAnswersToDB({ type, isEnglish, answerPayload }) {
  const username = localStorage.getItem("username");
  if (!username) {
    console.error("No username in localStorage");
    return;
  }

  let submissionType = "matching";
  if (type === "repetition") submissionType = "repetition";
  if (type === "story") submissionType = "story";

  const body = {
    participantid: username,
    isEN: isEnglish,
    submissionType,
    answers: answerPayload,
  };

  const res = await fetch(`${APIBASEURL}submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Submit failed", res.status, txt);
    throw new Error(txt || "Submit failed");
  }
}

export default Test;
