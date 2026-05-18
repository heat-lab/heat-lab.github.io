import React, { useState, useEffect, useRef } from "react";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import IconButton from "@mui/material/IconButton";
import AppBar from "@mui/material/AppBar";
import CircularProgress from "@mui/material/CircularProgress";
import { useLocation, useNavigate } from "react-router-dom";

import Story from "./Story";
import Retell from "./Retell";
import Questions from "./Questions";
import Instructions from "./Instructions";
import TranslationButton from "../Components/TranslationButton";
import AudioPermission from "../Tests/AudioPermission";
import CompletionPage from "../Tests/CompletionPage";
import { APIBASEURL } from "../config";

import "../Tests/Test.scss";
import "./StoryTest.css";

let questionAudio = null;

const LAMBDAAPIENDPOINT = `${APIBASEURL}/audio-upload`;

const narrationInstruction =
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/narration_instructions.m4a";

const retellingLinks = [
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/retell_instructions_1.m4a",
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/retell_instructions_2.m4a",
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/retell_instructions_2.m4a",
];

const questionInstruction =
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/question_instructions.m4a";

const completionAudio =
  "https://non-question-links.s3.us-east-2.amazonaws.com/completion.m4a";

const completionImage =
  "https://sites.usc.edu/heatlab/files/2024/10/puppy2.jpg";

const normalizeStoryData = (rawData) => {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }

  if (Array.isArray(rawData[0]?.questions)) {
    return rawData.map((story, index) => ({
      story_id: story.story_id ?? index + 1,
      questions: Array.isArray(story.questions) ? story.questions : [],
      image_links: Array.isArray(story.image_links) ? story.image_links : [],
      narration_audios: Array.isArray(story.narration_audios)
        ? story.narration_audios
        : [],
    }));
  }

  const grouped = {};

  rawData.forEach((item) => {
    const storyId = item.story_id ?? item.story ?? 1;

    if (!grouped[storyId]) {
      grouped[storyId] = {
        story_id: storyId,
        questions: [],
        image_links: [],
        narration_audios: [],
      };
    }

    if (item.question_id || item.question_text) {
      grouped[storyId].questions.push(item);
    }

    if (Array.isArray(item.image_links)) {
      grouped[storyId].image_links.push(...item.image_links);
    } else if (item.image_link) {
      grouped[storyId].image_links.push(item.image_link);
    }

    if (Array.isArray(item.narration_audios)) {
      grouped[storyId].narration_audios.push(...item.narration_audios);
    } else if (item.narration_audio) {
      grouped[storyId].narration_audios.push(item.narration_audio);
    }
  });

  return Object.values(grouped);
};

const StoryTest = ({ language }) => {
  const [storyIndex, setStoryIndex] = useState(0);
  const [subStage, setSubStage] = useState(0);
  const [audioUrls, setAudioUrls] = useState({});
  const [retellUrls, setRetellUrls] = useState({});

  const [stories, setStories] = useState([]);
  const [imageLinks, setImageLinks] = useState([]);
  const [narrationLinks, setNarrationLinks] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [showAudioPermission, setShowAudioPermission] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showChinese, setShowChinese] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [countDown, setCountDown] = useState(3);
  const [disableOption, setDisableOption] = useState(true);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);

  const timeoutRef = useRef(null);
  const subStageRef = useRef(subStage);
  const storyIndexRef = useRef(storyIndex);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    subStageRef.current = subStage;
  }, [subStage]);

  useEffect(() => {
    storyIndexRef.current = storyIndex;
  }, [storyIndex]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setShowChinese(params.get("cn-zw") === "true");
  }, [location]);

  useEffect(() => {
    async function fetchStoryData() {
      try {
        const response = await fetch(
          `${APIBASEURL}/questions?language=${encodeURIComponent(
            language
          )}&type=story`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        const rawData = await response.json();
        const normalizedStories = normalizeStoryData(rawData);

        setStories(normalizedStories);

        if (normalizedStories.length > 0) {
          setQuestions(normalizedStories[0].questions || []);
          setImageLinks(normalizedStories[0].image_links || []);
          setNarrationLinks(normalizedStories[0].narration_audios || []);
        }
      } catch (error) {
        console.error("Error fetching story data", error);
      } finally {
        setShowLoading(false);
      }
    }

    fetchStoryData();
  }, [language]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);

    if (showLoading || showAudioPermission) return;

    if (countDown > 0) {
      timeoutRef.current = setTimeout(() => {
        setCountDown((prev) => prev - 1);
      }, 1000);
    } else if (!audioPlaying) {
      playAudio();
    }

    return () => clearTimeout(timeoutRef.current);
  }, [countDown, showLoading, showAudioPermission, audioPlaying, subStage]);

  const getAudioLink = () => {
    if (subStage === 0) return narrationInstruction;
    if (subStage >= 2 && subStage <= 4) return retellingLinks[subStage - 2];
    if (subStage === 5) return questionInstruction;

    const questionIndex = subStage - 6;
    const question = questions[questionIndex];

    return question?.audio_link || question?.audio || "";
  };

  const getRetellLinks = () => {
    const start = (subStage - 2) * 2;
    return imageLinks.slice(start, start + 2);
  };

  const playAudio = () => {
    const link = getAudioLink();

    if (!link) {
      setDisableOption(false);
      return;
    }

    setDisableOption(true);

    questionAudio = new Audio(link);

    questionAudio.addEventListener("play", () => {
      setAudioPlaying(true);
    });

    questionAudio.addEventListener("ended", () => {
      setAudioPlaying(false);
      setDisableOption(false);
    });

    questionAudio.play().catch((error) => {
      console.error("Audio playback failed", error);
      setAudioPlaying(false);
      setDisableOption(false);
    });
  };

  const beforeUnload = () => {
    if (questionAudio) {
      questionAudio.pause();
      questionAudio.currentTime = 0;
    }

    setAudioPlaying(false);
    setDisableOption(true);
    setCountDown(3);

    const lastQuestionStage = 6 + questions.length - 1;

    if (subStage < lastQuestionStage) {
      setSubStage((prev) => prev + 1);
      return;
    }

    const nextStoryIndex = storyIndex + 1;

    if (nextStoryIndex < stories.length) {
      const nextStory = stories[nextStoryIndex];

      setStoryIndex(nextStoryIndex);
      setQuestions(nextStory.questions || []);
      setImageLinks(nextStory.image_links || []);
      setNarrationLinks(nextStory.narration_audios || []);
      setSubStage(0);
      return;
    }

    setCompleted(true);
  };

  const recordAudioUrl = (questionId, url, type) => {
    if (type === "retell") {
      setRetellUrls((prev) => ({
        ...prev,
        [questionId]: url,
      }));
    } else {
      setAudioUrls((prev) => ({
        ...prev,
        [questionId]: url,
      }));
    }
  };

  const uploadToLambda = async (recordedBlob, type) => {
    setUploadsInProgress((prev) => prev + 1);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob.blob);
      });

      const questionId = subStageRef.current;
      const currentStory = storyIndexRef.current + 1;

      const requestBody = {
        fileType: "audio/webm",
        audioData: base64Data,
        userId: localStorage.getItem("username"),
        questionId,
        bucketName:
          type === "retell"
            ? `merls-story-user-audio/retell/${currentStory}`
            : `merls-story-user-audio/question/${currentStory}`,
      };

      const response = await fetch(LAMBDAAPIENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Audio upload failed");
      }

      const data = await response.json();

      if (data.url) {
        recordAudioUrl(questionId, data.url, type);
      }

      return data.url;
    } catch (error) {
      console.error("Upload error", error);
      throw error;
    } finally {
      setUploadsInProgress((prev) => prev - 1);
    }
  };

  const submitAnswers = async () => {
    try {
      const username = localStorage.getItem("username");

      const requestBody = {
        participantId: username,
        audioSubmissionList: audioUrls,
        retellSubmissionList: retellUrls,
        isEN: true,
        isAudioTest: true,
        userAns: null,
        submissionType: "story",
      };

      const response = await fetch(`${APIBASEURL}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const queryParam = `?cn-zw=${showChinese ? "true" : "false"}`;
        navigate(`/test-selection${queryParam}`);
      } else {
        alert("Failed to submit answers");
      }
    } catch (error) {
      console.error("Failed to submit answers", error);
      alert("Failed to submit answers");
    }
  };

  if (showLoading) {
    return (
      <div className="loadingContainer">
        <CircularProgress size={75} thickness={3} variant="indeterminate" />
      </div>
    );
  }

  if (showAudioPermission) {
    return (
      <AudioPermission
        showChinese={showChinese}
        setShowAudioPermission={setShowAudioPermission}
      />
    );
  }

  if (completed) {
    return (
      <CompletionPage
        showChinese={showChinese}
        audioLink={completionAudio}
        imageLink={completionImage}
        submitAnswers={submitAnswers}
        uploadsInProgress={uploadsInProgress}
      />
    );
  }

  return (
    <div id="testPage">
      <AppBar className="titleContainer">
        <h1 className="selectionTitle">MERLS</h1>
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </AppBar>

      <div className="indicator">
        {audioPlaying ? (
          <div>
            <IconButton aria-label="pause" disabled>
              <PauseCircleIcon color="primary" className="pauseButton disabled" />
            </IconButton>
            <p className="actionText">
              {showChinese ? "播放中..." : "Playing..."}
            </p>
          </div>
        ) : (
          <div>
            <IconButton
              aria-label="play"
              style={{ marginBottom: 0 }}
              onClick={playAudio}
              disabled={audioPlaying}
            >
              <PlayCircleIcon color="primary" className="pauseButton" />
            </IconButton>
            <p className="actionText">
              {countDown > 0
                ? showChinese
                  ? `${countDown} 秒内播放音频`
                  : `Audio playing in ${countDown} second(s)`
                : showChinese
                ? "再听一遍吗?"
                : "Listen again?"}
            </p>
          </div>
        )}
      </div>

      {subStage === 0 ? (
        <Instructions
          showChinese={showChinese}
          beforeUnload={beforeUnload}
          disableOption={disableOption}
        />
      ) : subStage === 1 ? (
        <Story
          imageLinks={imageLinks}
          showChinese={showChinese}
          disableOption={disableOption}
          beforeUnload={beforeUnload}
        />
      ) : subStage >= 2 && subStage <= 4 ? (
        <Retell
          imageLinks={getRetellLinks()}
          showChinese={showChinese}
          setShowChinese={setShowChinese}
          uploadToLambda={uploadToLambda}
          type="retell"
          disableOption={disableOption}
          beforeUnload={beforeUnload}
        />
      ) : subStage === 5 ? (
        <Instructions
          showChinese={showChinese}
          beforeUnload={beforeUnload}
          disableOption={disableOption}
        />
      ) : (
        <Questions
          showChinese={showChinese}
          beforeUnload={beforeUnload}
          question={questions[subStage - 6]}
          uploadToLambda={uploadToLambda}
          type="question"
          disableOption={disableOption}
        />
      )}
    </div>
  );
};

export default StoryTest;
