import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import TranslationButton from "../Components/TranslationButton";
import Confirmation from "../Components/Confirmation";
import "./TestSelection.css";

const LanguageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [englishListeningCompleted, setEnglishListeningCompleted] = useState(false);
  const [chineseListeningCompleted, setChineseListeningCompleted] = useState(false);
  const [englishRepetitionCompleted, setEnglishRepetitionCompleted] = useState(false);
  const [chineseRepetitionCompleted, setChineseRepetitionCompleted] = useState(false);
  const [englishStoryCompleted, setEnglishStoryCompleted] = useState(false);
  const [selectedButton, setSelectedButton] = useState(0);
  const [showChinese, setShowChinese] = useState(true);

  const linkLocations = [
    "/matching-test-chinese",
    "/matching-test-english",
    "/repetition-test-chinese",
    "/repetition-test-english",
    "/story-test-english"
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");
    setShowChinese(languageParam === "true");
  }, [location]);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(
            `https://ue2r8y56oe.execute-api.us-east-2.amazonaws.com/default/getUsers?participant_id=${username}`
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
    }
  }, []);

  return (
    <div className="languageSelection">
      <AppBar className="titleContainer">
        <h1 className="selectionTitle">
          {showChinese ? <>请选择下面的测试来开始</> : <>Please select a test below to start</>}
        </h1>
        <TranslationButton showChinese={showChinese} setShowChinese={setShowChinese} />
      </AppBar>
      <div className="testSelectionGroup">
        {/* ... the rest of your UI for selecting and starting tests ... */}
      </div>
      {/* ... logic for showing completion text ... */}
    </div>
  );
};

export default LanguageSelection;
