import React, { useState, useEffect, useRef } from "react";
import "./Test.scss";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import IconButton from "@mui/material/IconButton";
import GreenButton from "../Components/GreenButton";
import VideoRecorder from "../Components/VideoRecorder";

let questionAudio;

const Question = ({ curQuestion, recordAnswer, showChinese, enableVideo = false, language = "english" }) => {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [countDown, setCountDown] = useState(3);
  const [paused, setPaused] = useState(enableVideo);
  const [waitingForCamera, setWaitingForCamera] = useState(enableVideo);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [videoError, setVideoError] = useState("");
  const videoRecorderRef = useRef(null);
  const cameraStoppedRef = useRef(false);
  const startLockRef = useRef(false);
  const submitLockRef = useRef(false);
  const [remainingPlayCount, setRemainingPlayCount] = useState(2);
  const [disableOption, setDisableOption] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const timeoutRef = useRef(null);

  useEffect(() => {
    if (questionAudio instanceof Audio) {
      questionAudio.pause();
    }
    setAudioPlaying(false);
    setCountDown(3);
    setPaused(enableVideo);
    setWaitingForCamera(enableVideo);
    setDisableOption(true);
    setSelectedIdx(-1);
    setRemainingPlayCount(2);
  }, [curQuestion, enableVideo]);

  useEffect(() => {
    console.log("disabled: " + disableOption);
    clearTimeout(timeoutRef.current);

    if (countDown > 0 && !paused) {
      timeoutRef.current = setTimeout(() => {
        setCountDown((prevCountDown) => prevCountDown - 1);
      }, 1000);
    } else {
      if (remainingPlayCount > 0 && !paused) {
        questionAudio = new Audio(curQuestion.question_link);

        questionAudio.addEventListener("play", () => {
          setAudioPlaying(true);
          setRemainingPlayCount((prePlayCount) => prePlayCount - 1);
        });

        questionAudio.addEventListener("ended", () => {
          setAudioPlaying(false);

          if (disableOption) {
            setDisableOption(false);
          }

          setRemainingPlayCount((prevPlayCount) => {
            if (prevPlayCount > 0) {
              setCountDown(10);
            }

            return prevPlayCount;
          });
        });

        questionAudio.play().catch((error) => {
          alert("error in playing question.", error);
          setDisableOption(false);
        });
      }
    }

    return () => clearTimeout(timeoutRef.current);
  }, [countDown, paused]);

  const beginQuestion = async () => {
    if (startLockRef.current) return;
    startLockRef.current = true;
    setStarting(true);
    setVideoError("");
    try {
      await videoRecorderRef.current?.startRecording();
      cameraStoppedRef.current = false;
      setWaitingForCamera(false);
      setCountDown(3);
      setPaused(false);
    } catch (error) {
      setVideoError(error.message || "Unable to start the cameras. Check setup and try again.");
    } finally {
      startLockRef.current = false;
      setStarting(false);
    }
  };

  const gotoNextQuestion = async (idx) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setFinalizing(true);
    setVideoError("");
    clearTimeout(timeoutRef.current);
    if (questionAudio instanceof Audio) questionAudio.pause();
    setPaused(true);
    try {
      if (enableVideo) {
        if (!cameraStoppedRef.current) {
          await videoRecorderRef.current?.stopRecording();
          cameraStoppedRef.current = true;
        }
        await videoRecorderRef.current?.waitForUpload();
      }
      setDisableOption(true);
      recordAnswer(curQuestion.question_id, idx + 1);
      setSelectedIdx(-1);
    } catch (error) {
      setVideoError(error.message || "Unable to finish uploading video. Please try again.");
    } finally {
      submitLockRef.current = false;
      setFinalizing(false);
    }
  };

  return (
    <div>
      {enableVideo && (
        <>
          <VideoRecorder
            ref={videoRecorderRef}
            participantId={localStorage.getItem("username") || ""}
            questionId={`matching-${curQuestion?.question_id ?? "unknown"}`}
            testType="matching"
            language={language}
            showChinese={showChinese}
          />
          {waitingForCamera && (
            <div style={{ margin: "20px 0", textAlign: "center" }}>
              <p>{showChinese ? "请完成可选摄像头设置，然后开始题目。" : "Complete the optional camera setup, then begin the question."}</p>
              <GreenButton showChinese={showChinese} textEnglish={starting ? "Starting..." : "Camera setup finished — begin"} textChinese="摄像头设置完成—开始" disabled={starting} onClick={beginQuestion} />
            </div>
          )}
          {videoError && <p role="alert" style={{ color: "#b00020" }}>{videoError}</p>}
        </>
      )}
      {!waitingForCamera && <div className="indicator">
        {audioPlaying ? (
          <div>
            <IconButton aria-label="pause" disabled>
              <PauseCircleIcon
                color="primary"
                className="pauseButton disabled"
              />
            </IconButton>

            <p className="actionText">
              {showChinese ? <>播放中</> : <>Playing question</>}
            </p>
          </div>
        ) : (
          <div>
            {paused ? (
              <IconButton
                disabled={remainingPlayCount < 1}
                aria-label="play"
                style={{ marginBottom: "0" }}
                onClick={() => {
                  setPaused(false);
                  setCountDown(countDown);
                }}
              >
                <PlayCircleIcon
                  color="primary"
                  className={
                    "pauseButton" +
                    (remainingPlayCount < 1 ? " disabled" : "")
                  }
                />
              </IconButton>
            ) : (
              <IconButton
                disabled={remainingPlayCount < 1}
                aria-label="pause"
                style={{ marginBottom: "0" }}
                onClick={() => {
                  setPaused(true);
                }}
              >
                <PauseCircleIcon
                  color="primary"
                  className={
                    "pauseButton" +
                    (remainingPlayCount < 1 ? " disabled" : "")
                  }
                />
              </IconButton>
            )}

            {paused ? (
              <p className="actionText">
                {showChinese ? <>已被用户暂停</> : <>Paused by user</>}
              </p>
            ) : remainingPlayCount > 0 ? (
              <p className="actionText">
                {showChinese ? (
                  <>{countDown} 秒内播放音频</>
                ) : (
                  <>Audio playing in {countDown} second(s)</>
                )}
              </p>
            ) : (
              <p className="actionText">
                {showChinese ? <>单击图片选择</> : <>Click image to choose</>}
              </p>
            )}
          </div>
        )}
      </div>}

      {!waitingForCamera && <div className="imagesContainer">
        {curQuestion.options.map((url, idx) => (
          <div
            className={`imageContainer ${
              selectedIdx === idx ? "selected" : "unselected"
            }`}
            onClick={() => {
              if (idx === selectedIdx) {
                setSelectedIdx(-1);
              } else {
                setSelectedIdx(idx);
              }
            }}
          >
            <img className="image" src={url} alt="choice"></img>

            <div
              className={`imageSelectedOverlay ${
                selectedIdx === idx ? "visible" : ""
              }`}
            ></div>
          </div>
        ))}
      </div>}

      {!waitingForCamera && <div className="submitButtonContainer">
        <GreenButton
          className="testNextButton"
          showChinese={showChinese}
          textEnglish="Next"
          textChinese="下一个"
          disabled={selectedIdx === -1 || disableOption || finalizing}
          onClick={() => {
            if (selectedIdx !== -1 && !disableOption) {
              gotoNextQuestion(selectedIdx);
            }
          }}
        />
      </div>}
    </div>
  );
};

export default Question;
