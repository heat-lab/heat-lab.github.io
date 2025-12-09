import React, { useState, useEffect, useRef } from "react";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import IconButton from "@mui/material/IconButton";
import GreenButton from "../Components/GreenButton";
import Story from "./Story";
import TranslationButton from "../Components/TranslationButton";
import AppBar from "@mui/material/AppBar";
import CircularProgress from "@mui/material/CircularProgress";
import { useLocation, useNavigate } from "react-router-dom";
import "../Tests/Test.scss";
import Retell from "./Retell";
import Questions from "./Questions";
import CompletionPage from "../Tests/CompletionPage";
import Confirmation from "../Components/Confirmation";
import Instructions from "./Instructions";
import AudioPermission from "../Tests/AudioPermission";
import { APIBASEURL } from "../config";

let questionAudio;
let audioLink;

const response = await fetch(LAMBDAAPIENDPOINT, { ... });

const narrationInstruction =
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/narration_instructions.m4a";

const retellingLinks = [
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/retell_instructions_1.m4a",
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/retell_instructions_2.m4a",
  "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/retell_instructions_2.m4a",
];

const StoryTest = ({ language }) => {
  // currentStory uses 1-based indexing
  const [currentStory, setCurrentStory] = useState(1);
  // stage 0: narration instr, 1: narration, 2: retell, 3: question instr, 4: questions
  const [stage, setStage] = useState(0);
  const [subStage, setSubStage] = useState(1);
  const subStageRef = useRef(subStage);

  const [audioUrls, setAudioUrls] = useState({});
  const [retellUrls, setRetellUrls] = useState({});

  // story data
  const [stories, setStories] = useState([]);
  const [imageLinks, setImageLinks] = useState([]);
  const [narrationLinks, setNarrationLinks] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [showAudioPermission, setShowAudioPermission] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showChinese, setShowChinese] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [countDown, setCountDown] = useState(3);
  const [disableOption, setDisableOption] = useState(true);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);

  // progress bar
  const [totalStages, setTotalStages] = useState(1);
  const [currentStage, setCurrentStage] = useState(0);

  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // language flag from query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");
    setShowChinese(languageParam === "true");
  }, [location]);

  // initial audio instructions countdown + playback
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    if (showLoading || showAudioPermission) {
      return;
    }
    if (countDown > 0) {
      timeoutRef.current = setTimeout(() => {
        setCountDown((prev) => prev - 1);
      }, 1000);
    } else if (!audioPlaying) {
      playAudio();
    }

    return () => clearTimeout(timeoutRef.current);
  }, [countDown, showLoading, showAudioPermission, audioPlaying]);

  // fetch story data
  useEffect(() => {
    async function fetchStoryData() {
      const response = await fetch(
        `${APIBASEURL}/questions?language=${encodeURIComponent(
          language
        )}&type=story`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      console.log("getting story data");
      const data = await response.json();
      setStories(data);
      console.log("Fetched story data:", data);

      if (!data || data.length === 0) {
        setShowLoading(false);
        return;
      }

      // initialize with first story
      setQuestions(data[0].questions);
      setImageLinks(data[0].image_links);
      setNarrationLinks(data[0].narration_audios);
      audioLink = narrationInstruction;
      setShowLoading(false);

      // compute total stages
      let total = 0;
      for (const element of data) {
        // 4 narration/retell instruction chunks + 3 retell segments + 1 question instruction + N questions
        total += 8;
        total += element.questions.length;
      }
      setTotalStages(total);
    }

    fetchStoryData();
  }, [language]);

  const recordAudioUrl = (questionId, s3Url, type) => {
    if (!questionId || !s3Url) {
      console.error("Missing required parameters:", { questionId, s3Url });
      return;
    }
    const truncatedUrl = s3Url.split("?")[0];

    if (type === "retell") {
      setRetellUrls((prev) => {
        const updated = {
          ...prev,
          [currentStory]: {
            ...(prev[currentStory] || {}),
            [questionId]: truncatedUrl,
          },
        };
        console.log("Current Audio URLs for retell:", updated);
        return updated;
      });
    } else {
      setAudioUrls((prev) => {
        const updated = {
          ...prev,
          [currentStory]: {
            ...(prev[currentStory] || {}),
            [questionId]: truncatedUrl,
          },
        };
        console.log("Current Audio URLs for questions:", updated);
        return updated;
      });
    }
  };

  const uploadToLambda = async (recordedBlob, type) => {
    setUploadsInProgress((prev) => prev + 1);

    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(recordedBlob.blob);
    });

    const questionId = subStageRef.current;
    console.log("current story id:", currentStory);
    console.log("current question id:", questionId);

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

    const data = await response.json();
    if (data.url) {
      recordAudioUrl(questionId, data.url, type);
    }

    setUploadsInProgress((prev) => prev - 1);
    return data.url;
  };

  const submitAnswers = async () => {
    const username = localStorage.getItem("username");
    const endpoint = `${APIBASEURL}/questions`;

    const requestBody = {
      participantId: username,
      userAns: null,
      isEN: language !== "CN",
      isAudioTest: false,
      storySubmissionList: audioUrls,
      retellSubmissionList: retellUrls,
      submissionType: "story",
    };

    console.log("Submitting data:", requestBody);

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const queryParam = `?cn-zw=${showChinese ? "true" : "false"}`;
      navigate(`/test-selection${queryParam}`);
    } else {
      alert("Failed to submit answers");
    }
  };

  const playAudio = () => {
    console.log("playing", audioLink);
    if (!audioLink) {
      console.log("audio link null");
      return;
    }

    questionAudio = new Audio(audioLink);
    questionAudio.addEventListener("play", () => setAudioPlaying(true));
    questionAudio.addEventListener("ended", () => {
      setAudioPlaying(false);
      if (disableOption) {
        setDisableOption(false);
      }
    });

    questionAudio
      .play()
      .catch((error) => {
        alert("error in playing question.", error);
        setDisableOption(false);
      });
  };

  const stopAudio = () => {
    try {
      if (questionAudio) {
        questionAudio.pause();
      }
      setAudioPlaying(false);
    } catch {
      console.log("couldn't pause audio");
    }
  };

  const updateInstructionLink = (stageValue, subStageValue) => {
    if (stageValue === 1) {
      audioLink = narrationLinks[subStageValue - 1];
    } else if (stageValue === 2) {
      audioLink = retellingLinks[subStageValue - 1];
    } else if (stageValue === 4) {
      audioLink = questions[subStageValue - 1].question_audio;
    } else {
      audioLink = "";
    }
  };

  const advanceSubStage = () => {
    if (stage === 0 && currentStory === 1) {
      setShowConfirmation(true);
      return;
    }

    stopAudio();
    setCountDown(3);
    setDisableOption(true);
    setCurrentStage((prev) => prev + 1);

    if (stage === 0) {
      setSubStage(1);
      setStage(1);
      updateInstructionLink(1, 1);
    } else if (stage === 1) {
      if (subStage === 3) {
        updateInstructionLink(2, 1);
        setStage(2);
        setSubStage(1);
      } else {
        updateInstructionLink(1, subStage + 1);
        setSubStage((prev) => prev + 1);
      }
    } else if (stage === 2) {
      subStageRef.current = subStage;
      if (subStage === 3) {
        audioLink =
          "https://merls-story-audio.s3.us-east-2.amazonaws.com/instruction/question_instructions.m4a";
        setStage(3);
        setSubStage(1);
      } else {
        updateInstructionLink(2, subStage + 1);
        setSubStage((prev) => prev + 1);
      }
    } else if (stage === 3) {
      setStage(4);
      updateInstructionLink(4, 1);
    } else {
      subStageRef.current = subStage;
      if (subStage === questions.length) {
        audioLink = narrationInstruction;
        setStage(0);
        setSubStage(1);
        if (currentStory === stories.length) {
          setCompleted(true);
          setAudioPlaying(true);
          console.log("test ending");
        } else {
          setQuestions(stories[currentStory].questions);
          setImageLinks(stories[currentStory].image_links);
          setNarrationLinks(stories[currentStory].narration_audios);
          setCurrentStory((prev) => prev + 1);
        }
      } else {
        updateInstructionLink(4, subStage + 1);
        setSubStage((prev) => prev + 1);
      }
    }
  };

  const getRetellLinks = () => {
    console.log("current substage is", subStage);
    if (subStage === 1) {
      return [
        { id: 1, link: imageLinks[0] },
        { id: 2, link: imageLinks[1] },
      ];
    } else if (subStage === 2) {
      return [
        { id: 3, link: imageLinks[2] },
        { id: 4, link: imageLinks[3] },
      ];
    } else if (subStage === 3) {
      return [
        { id: 5, link: imageLinks[4] },
        { id: 6, link: imageLinks[5] },
      ];
    }
    return null;
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
      <div id="testPage">
        <AppBar className="titleContainer">
          <progress id="progress" value={1} max={1} />
          <TranslationButton
            showChinese={showChinese}
            setShowChinese={setShowChinese}
          />
        </AppBar>
        <CompletionPage
          showChinese={showChinese}
          audioLink={
            "https://sites.usc.edu/heatlab/files/2024/11/RV-Englsih-End-of-the-test-narration-w-audio.m4a"
          }
          imageLink={"https://sites.usc.edu/heatlab/files/2024/10/puppy3.gif"}
          submitAnswers={submitAnswers}
          uploadsInProgress={uploadsInProgress}
        />
      </div>
    );
  }

  return (
    <div id="testPage">
      <AppBar className="titleContainer">
        <progress id="progress" value={currentStage} max={totalStages} />
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </AppBar>

      {showConfirmation && (
        <Confirmation
          showChinese={showChinese}
          setShowConfirmation={setShowConfirmation}
          englishText="Are you sure you want to begin the English Story Test?"
          chineseText="你确定要开始英语故事测试吗"
          confirmAction={() => {
            setAudioPlaying(false);
            setCountDown(3);
            setDisableOption(true);
            setCurrentStage((prev) => prev + 1);
            setSubStage(1);
            setStage(1);
            updateInstructionLink(1, 1);
          }}
        />
      )}

      {localStorage.getItem("username") === "lucy" && (
        <div className="debugAdvanceButton">
          <GreenButton
            textEnglish="next part"
            onClick={() => {
              stopAudio();
              advanceSubStage();
            }}
          />
        </div>
      )}

      <div className="indicator">
        {audioPlaying ? (
          <div>
            <IconButton aria-label="pause" disabled>
              <PauseCircleIcon
                color="primary"
                className="pauseButton disabled"
              />
            </IconButton>
            <p className="actionText">
              {showChinese ? "播放中" : "Playing Instructions"}
            </p>
          </div>
        ) : (
          <div>
            <IconButton
              aria-label="play"
              style={{ marginBottom: 0 }}
              onClick={playAudio}
            >
              <PlayCircleIcon color="primary" className="pauseButton" />
            </IconButton>
            <div className="actionText">
              {countDown > 0 ? (
                <p className="actionText">
                  {showChinese ? (
                    <>{countDown} 秒内播放音频</>
                  ) : (
                    <>Audio playing in {countDown} second(s)</>
                  )}
                </p>
              ) : (
                <p className="actionText">
                  {showChinese ? "再听一次指示?" : "Listen to instructions again?"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {stage === 0 || stage === 1 ? (
        <Story
          imageLinks={imageLinks}
          disableOption={disableOption}
          showChinese={showChinese}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
        />
      ) : stage === 2 ? (
        <Retell
          imageLinks={getRetellLinks()}
          showChinese={showChinese}
          disableOption={disableOption}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
          uploadToLambda={uploadToLambda}
          type="retell"
        />
      ) : stage === 3 ? (
        <Instructions
          showChinese={showChinese}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
          disableOption={disableOption}
        />
      ) : stage === 4 ? (
        <Questions
          showChinese={showChinese}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
          disableOption={disableOption}
          question={questions[subStage - 1]}
          uploadToLambda={uploadToLambda}
          type="question"
        />
      ) : (
        <div>page does not exist</div>
      )}
    </div>
  );
};

export default StoryTest;
