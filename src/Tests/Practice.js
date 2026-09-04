import React, { useEffect, useRef, useState } from "react";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import IconButton from "@mui/material/IconButton";

import Question from "./Question";
import Repetition from "./Repetition";
import GuidedTutorial from "./GuidedTutorial";
import Confirmation from "../Components/Confirmation";
import GreenButton from "../Components/GreenButton";
import { isChineseLanguage, isEnglishLanguage } from "../utils/language";

import "./Test.scss";

const Practice = ({
  setShowPractice,
  question,
  type,
  language,
  showChinese,
}) => {
  const [showPracticeQuestion, setShowPracticeQuestion] = useState(true);
  const [showGuidedTutorial, setShowGuidedTutorial] = useState(true);

  const finishPractice = () => {
    setShowPracticeQuestion(false);
  };

  const getAudioLink = () => {
    if (type === "repetition") {
      return isChineseLanguage(language)
        ? "https://non-question-links." +
            "s3.us-east-2.amazonaws.com/" +
            "chinese-repetition-transition.m4a"
        : "https://non-question-links." +
            "s3.us-east-2.amazonaws.com/" +
            "english-repetition-transition.m4a";
    }

    if (language === "second") {
      return (
        "https://non-question-links." +
        "s3.us-east-2.amazonaws.com/" +
        "chinese-quantifier-transition.m4a"
      );
    }

    if (isEnglishLanguage(language)) {
      return (
        "https://non-question-links." +
        "s3.us-east-2.amazonaws.com/" +
        "english-matching-transition.m4a"
      );
    }

    return (
      "https://non-question-links." +
      "s3.us-east-2.amazonaws.com/" +
      "chiense-matching-transition.m4a"
    );
  };

  const discardPracticeRecording = () => {
    // Practice recordings are intentionally not saved.
  };

  return (
    <div>
      {showPracticeQuestion ? (
        type === "matching" ? (
          <div>
            <p className="practiceText">
              {showChinese
                ? "这是一个练习题！"
                : "This is a practice question!"}
            </p>

            <Question
              curQuestion={question}
              recordAnswer={finishPractice}
              showChinese={showChinese}
            />
          </div>
        ) : type === "repetition" ? (
          showGuidedTutorial ? (
            <GuidedTutorial
              setShowGuidedTutorial={setShowGuidedTutorial}
              showChinese={showChinese}
              lang={language}
            />
          ) : (
            <div>
              <p className="practiceText">
                {showChinese
                  ? "这是一个练习题！"
                  : "This is a practice question!"}
              </p>

              <Repetition
                curQuestion={question}
                recordAnswer={finishPractice}
                showChinese={showChinese}
                recordAudioBlob={discardPracticeRecording}
                enableVideo={false}
              />
            </div>
          )
        ) : (
          <p>type invalid</p>
        )
      ) : (
        <PracticePage
          showChinese={showChinese}
          audioLink={getAudioLink()}
          setShowPractice={setShowPractice}
          type={type}
          language={language}
        />
      )}
    </div>
  );
};

let instructionAudio;

const PracticePage = ({
  showChinese,
  audioLink,
  setShowPractice,
  type,
  language,
}) => {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [replay, setReplay] = useState(false);
  const [finishedListening, setFinishedListening] = useState(false);
  const [countDown, setCountDown] = useState(3);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const timeoutRef = useRef(null);

  useEffect(() => {
    clearTimeout(timeoutRef.current);

    if (countDown > 0) {
      timeoutRef.current = setTimeout(() => {
        setCountDown((previous) => previous - 1);
      }, 1000);
    } else {
      instructionAudio = new Audio(audioLink);

      instructionAudio.addEventListener("play", () => {
        setAudioPlaying(true);
      });

      instructionAudio.addEventListener("ended", () => {
        setAudioPlaying(false);
        setFinishedListening(true);
      });

      instructionAudio.play().catch((error) => {
        console.error(
          "Could not play practice transition audio:",
          error,
        );

        setAudioPlaying(false);
        setFinishedListening(true);
      });
    }

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [countDown, audioLink]);

  useEffect(() => {
    if (countDown < 1 && replay) {
      setReplay(false);

      if (instructionAudio) {
        instructionAudio.pause();
      }

      instructionAudio = new Audio(audioLink);

      instructionAudio.addEventListener("play", () => {
        setAudioPlaying(true);
      });

      instructionAudio.addEventListener("ended", () => {
        setAudioPlaying(false);
      });

      instructionAudio.play().catch((error) => {
        console.error(
          "Could not replay practice transition audio:",
          error,
        );

        setAudioPlaying(false);
      });
    }
  }, [replay, countDown, audioLink]);

  useEffect(
    () => () => {
      clearTimeout(timeoutRef.current);

      if (instructionAudio) {
        instructionAudio.pause();
      }
    },
    [],
  );

  return (
    <div>
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
              {showChinese
                ? "播放说明..."
                : "Playing instructions..."}
            </p>
          </div>
        ) : (
          <div>
            <IconButton
              aria-label="play"
              style={{
                marginBottom: 0,
              }}
              onClick={() => {
                if (countDown > 0) {
                  setCountDown(0);
                } else {
                  setReplay(true);
                }
              }}
            >
              <PlayCircleIcon
                color="primary"
                className="pauseButton"
              />
            </IconButton>

            {countDown > 0 ? (
              <p className="actionText">
                {showChinese
                  ? `${countDown} 秒内播放音频`
                  : `Audio playing in ${countDown} second(s)`}
              </p>
            ) : (
              <p className="actionText">
                {showChinese
                  ? "再听一次指示?"
                  : "Listen to instructions again?"}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="puppyContainer">
        <img
          className="instructionPuppy"
          src={
            "https://non-question-links." +
            "s3.us-east-2.amazonaws.com/" +
            "puppy2.jpg"
          }
          alt="puppy raising paw"
        />
      </div>

      <div className="submitButtonContainer">
        <GreenButton
          showChinese={showChinese}
          textEnglish={
            language === "second" ? "Continue" : "Begin Test"
          }
          textChinese="开始测试"
          disabled={!finishedListening}
          onClick={() => {
            if (!finishedListening) {
              return;
            }

            if (language === "second") {
              if (instructionAudio) {
                instructionAudio.pause();
              }

              setShowPractice(false);
            } else {
              setShowConfirmation(true);
            }
          }}
        />
      </div>

      {showConfirmation && (
        <Confirmation
          showChinese={showChinese}
          setShowConfirmation={setShowConfirmation}
          confirmAction={() => {
            if (instructionAudio) {
              instructionAudio.pause();
            }

            setShowPractice(false);
          }}
          englishText={
            `Are you sure you want ` +
            `to begin the ${
              isEnglishLanguage(language) ? "English" : "Chinese"
            } ${
              type === "repetition" ? "repetition" : "matching"
            } test?`
          }
          chineseText={`您确定要开始${
            isEnglishLanguage(language) ? "英文" : "中文"
          }${type === "repetition" ? "重复" : "匹配"}测试吗？`}
        />
      )}
    </div>
  );
};

export default Practice;
