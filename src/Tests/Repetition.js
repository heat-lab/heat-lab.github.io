import React, { useEffect, useRef, useState } from "react";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import IconButton from "@mui/material/IconButton";
import { ReactMic } from "react-mic";

import microphoneDisabled from "../Components/mute.png";
import microphoneEnabled from "../Components/voice.png";
import GreenButton from "../Components/GreenButton";
import VideoRecorder from "../Components/VideoRecorder";

import "./Test.scss";

let questionAudio;

const normalizeLanguage = (question) => {
  const suppliedLanguage = String(question?.language || "").toLowerCase();

  if (
    suppliedLanguage === "cn" ||
    suppliedLanguage === "chinese" ||
    suppliedLanguage === "zh"
  ) {
    return "CN";
  }

  if (suppliedLanguage === "en" || suppliedLanguage === "english") {
    return "EN";
  }

  const currentRoute =
    `${window.location.pathname}` + `${window.location.hash}`;

  return currentRoute.toLowerCase().includes("repetition-test-chinese")
    ? "CN"
    : "EN";
};

const Repetition = ({
  curQuestion,
  recordAnswer,
  showChinese,
  recordAudioBlob,
  enableVideo = true,
}) => {
  const participantId = localStorage.getItem("username") || "";

  const testLanguage = normalizeLanguage(curQuestion);

  const cameraQuestionId = `repetition-${
    curQuestion?.question_id ?? "unknown"
  }`;

  const [audioPlaying, setAudioPlaying] = useState(false);
  const [finishedListening, setFinishedListening] = useState(false);
  const [proceedEnabled, setProceedEnabled] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(30);
  const [waitingForCameraSetup, setWaitingForCameraSetup] =
    useState(enableVideo);
  const [countDown, setCountDown] = useState(enableVideo ? null : 3);
  const [recording, setRecording] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [videoError, setVideoError] = useState("");

  const micRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const questionIdRef = useRef(curQuestion?.question_id);
  const timeoutRef = useRef(null);
  const timerId = useRef(null);
  const pendingAudioBlobRef = useRef(null);
  const audioStopResolveRef = useRef(null);
  const audioStopPromiseRef = useRef(Promise.resolve(null));
  const videoStopPromiseRef = useRef(Promise.resolve(null));
  const lastVideoStopErrorRef = useRef(null);

  useEffect(() => {
    questionIdRef.current = curQuestion?.question_id;
  }, [curQuestion]);

  useEffect(
    () => () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(timerId.current);

      if (questionAudio instanceof Audio) {
        questionAudio.pause();
      }
    },
    [],
  );

  const createAudioStopPromise = () => {
    pendingAudioBlobRef.current = null;

    audioStopPromiseRef.current = new Promise((resolve) => {
      audioStopResolveRef.current = resolve;
    });
  };

  const stopCameraRecording = () => {
    lastVideoStopErrorRef.current = null;

    const stopPromise = (async () => {
      try {
        await videoRecorderRef.current?.stopRecording();

        return null;
      } catch (error) {
        lastVideoStopErrorRef.current = error;

        setVideoError(
          error.message || "The video recording could not be stopped.",
        );

        return error;
      }
    })();

    videoStopPromiseRef.current = stopPromise;

    return stopPromise;
  };

  const startResponseRecording = async () => {
    setVideoError("");
    setTimedOut(false);
    setRecordingTimer(30);

    try {
      if (enableVideo) {
        await videoRecorderRef.current?.startRecording();
      }

      createAudioStopPromise();

      videoStopPromiseRef.current = Promise.resolve(null);
      lastVideoStopErrorRef.current = null;

      setRecording(true);

      window.setTimeout(() => {
        setProceedEnabled(true);
      }, 1000);

      return true;
    } catch (error) {
      const message = error.message || "The cameras are not ready.";

      setVideoError(message);
      alert("Video is not ready: " + message);

      return false;
    }
  };

  const onStop = (recordedBlob) => {
    if (!recordedBlob?.blob) {
      audioStopResolveRef.current?.(null);
      audioStopResolveRef.current = null;

      setVideoError(
        showChinese
          ? "没有找到录音。请重新录制。"
          : "No audio recording was found. " +
              "Please record the answer again.",
      );

      return;
    }

    if (recordedBlob.blobURL) {
      setRecordedAudioUrl(recordedBlob.blobURL);
    }

    pendingAudioBlobRef.current = recordedBlob;

    recordAudioBlob(questionIdRef.current, recordedBlob);

    audioStopResolveRef.current?.(recordedBlob);
    audioStopResolveRef.current = null;
  };

  useEffect(() => {
    clearTimeout(timeoutRef.current);

    if (countDown === null) {
      return undefined;
    }

    if (countDown > 0) {
      timeoutRef.current = setTimeout(() => {
        setCountDown((previous) => previous - 1);
      }, 1000);

      return () => {
        clearTimeout(timeoutRef.current);
      };
    }

    if (countDown !== 0) {
      return undefined;
    }

    questionAudio = new Audio(curQuestion.question_link);

    questionAudio.addEventListener("play", () => {
      setAudioPlaying(true);
    });

    questionAudio.addEventListener("ended", async () => {
      setAudioPlaying(false);
      setFinishedListening(true);

      await startResponseRecording();
    });

    questionAudio.play().catch((error) => {
      console.error("Could not play repetition prompt:", error);

      setAudioPlaying(false);

      setVideoError(
        showChinese
          ? "无法播放题目音频。请重试。"
          : "The question audio could not " + "be played. Please try again.",
      );

      setCountDown(3);
    });

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [countDown, curQuestion]);

  useEffect(() => {
    clearTimeout(timerId.current);

    if (!recording) {
      return undefined;
    }

    if (recordingTimer <= 0) {
      stopCameraRecording();
      setRecording(false);
      setTimedOut(true);

      return undefined;
    }

    timerId.current = setTimeout(() => {
      setRecordingTimer((previous) => previous - 1);
    }, 1000);

    return () => {
      clearTimeout(timerId.current);
    };
  }, [recordingTimer, recording]);

  const resetForNextQuestion = () => {
    setAudioPlaying(false);
    setFinishedListening(false);
    setProceedEnabled(false);
    setCountDown(3);
    setRecordingTimer(30);
    setTimedOut(false);
    setRecordedAudioUrl("");
    setVideoError("");

    pendingAudioBlobRef.current = null;
    audioStopPromiseRef.current = Promise.resolve(null);
    videoStopPromiseRef.current = Promise.resolve(null);
    lastVideoStopErrorRef.current = null;
  };

  const gotoNextQuestion = () => {
    const completedQuestionId = questionIdRef.current;

    resetForNextQuestion();

    recordAnswer(completedQuestionId, 1);
  };

  const finishAndAdvance = async () => {
    if (!proceedEnabled || finalizing) {
      return;
    }

    setFinalizing(true);
    setVideoError("");

    try {
      if (questionAudio instanceof Audio) {
        questionAudio.pause();
      }

      if (recording) {
        stopCameraRecording();
        setRecording(false);
      } else if (lastVideoStopErrorRef.current) {
        stopCameraRecording();
      }

      const recordedBlob =
        pendingAudioBlobRef.current || (await audioStopPromiseRef.current);

      if (!recordedBlob?.blob) {
        throw new Error(
          "The audio recording is not ready. " +
            "Please try recording the answer again.",
        );
      }

      const videoStopError = await videoStopPromiseRef.current;

      if (videoStopError) {
        throw videoStopError;
      }

      if (enableVideo) {
        await videoRecorderRef.current?.waitForUpload();
      }

      gotoNextQuestion();
    } catch (error) {
      console.error("Could not finish repetition recording:", error);

      setVideoError(
        error.message || "The recording could not be completed.",
      );
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      {enableVideo && (
        <VideoRecorder
          ref={videoRecorderRef}
          participantId={participantId}
          questionId={cameraQuestionId}
          testType="repetition"
          language={testLanguage}
          showChinese={showChinese}
        />
      )}

      {waitingForCameraSetup && (
        <div
          style={{
            marginTop: 20,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          <p className="actionText">
            {showChinese
              ? "请先完成上方的可选摄像头设置，" + "然后开始题目。"
              : "Finish the optional camera " +
                "setup above, then begin the question."}
          </p>

          <GreenButton
            showChinese={showChinese}
            textEnglish="Camera setup finished — begin"
            textChinese="摄像头设置完成—开始"
            onClick={() => {
              setWaitingForCameraSetup(false);
              setCountDown(3);
            }}
          />
        </div>
      )}

      <div
        className={
          finishedListening && !timedOut
            ? "reactMicLiveContainer"
            : "reactMicContainer"
        }
      >
        <ReactMic
          record={recording}
          onStop={onStop}
          ref={micRef}
          visualSetting={
            finishedListening && !timedOut ? "frequencyBars" : "none"
          }
          className={finishedListening && !timedOut ? "reactMicStyle" : ""}
        />
      </div>

      <div className="indicator">
        {audioPlaying ? (
          <div>
            <IconButton
              aria-label="pause"
              style={{
                marginBottom: 0,
                padding: 0,
              }}
              disabled
            >
              <PauseCircleIcon
                color="primary"
                className="pauseButton disabled"
              />
            </IconButton>

            <p className="actionText">
              {showChinese ? "播放中" : "Playing question"}
            </p>
          </div>
        ) : (
          <div>
            <IconButton
              aria-label={finishedListening ? "pause" : "play"}
              disabled={
                finishedListening || waitingForCameraSetup || finalizing
              }
              style={{
                marginBottom: 0,
                padding: 0,
              }}
              onClick={() => {
                if (countDown !== null && countDown > 0) {
                  setCountDown(0);
                }
              }}
            >
              {finishedListening ? (
                <PauseCircleIcon
                  color="primary"
                  className="pauseButton disabled"
                />
              ) : (
                <PlayCircleIcon
                  color="primary"
                  className={
                    waitingForCameraSetup
                      ? "pauseButton disabled"
                      : "pauseButton"
                  }
                />
              )}
            </IconButton>

            {waitingForCameraSetup ? (
              <p className="actionText">
                {showChinese
                  ? "等待摄像头设置"
                  : "Waiting for camera setup"}
              </p>
            ) : timedOut ? (
              <p className="actionText">
                {showChinese
                  ? "录音时间已超过最大限制，" + "请继续进行。"
                  : "Recording reached the maximum " +
                    "time. Please continue."}
              </p>
            ) : countDown > 0 ? (
              <p className="actionText">
                {showChinese
                  ? `${countDown} 秒内播放音频`
                  : `Audio playing in ${countDown} second(s)`}
              </p>
            ) : finishedListening ? (
              <div>
                <p className="actionText">
                  {showChinese
                    ? "现在，尝试重复我所说的话。"
                    : "Now, try to repeat what I said."}
                </p>

                <p className="actionText subText">
                  {showChinese
                    ? "如果你不知道，就说出你记得的。"
                    : "If you don't know, just say what you remember."}
                </p>
              </div>
            ) : (
              <p className="actionText">
                {showChinese
                  ? "仔细听我说的话。"
                  : "Listen carefully to what I say."}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          height: finishedListening ? 10 : 20,
        }}
      />

      {timedOut ? (
        <div className="listeningContainer">
          <img
            src={microphoneDisabled}
            alt="crossed out microphone"
            className="disabledMicrophone"
          />

          <p className="listeningText">
            {showChinese ? "录音已停止。" : "Recording has stopped."}
          </p>
        </div>
      ) : finishedListening ? (
        <div className="listeningContainer">
          <div className="microphoneAnimationContainer">
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />

            <img
              src={microphoneEnabled}
              alt="microphone"
              className="enabledMicrophone"
            />

            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
          </div>

          <p className="listeningText">
            {recording
              ? showChinese
                ? "麦克风正在录音。"
                : "Microphone is recording."
              : showChinese
                ? "录音已停止。"
                : "Recording has stopped."}
          </p>

          {recordedAudioUrl && (
            <audio
              controls
              src={recordedAudioUrl}
              style={{
                width: 300,
                maxWidth: "90vw",
              }}
            />
          )}
        </div>
      ) : (
        <div className="listeningContainer">
          <img
            src={microphoneDisabled}
            alt="crossed out microphone"
            className="disabledMicrophone"
          />

          <p className="listeningText">
            {showChinese
              ? "请等待我说完。"
              : "Please wait for me to finish speaking."}
          </p>
        </div>
      )}

      {videoError && (
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
          }}
        >
          <p
            style={{
              color: "#b00020",
              fontWeight: 700,
            }}
          >
            {videoError}
          </p>

          {finishedListening &&
            !recording &&
            !pendingAudioBlobRef.current && (
              <button type="button" onClick={startResponseRecording}>
                {showChinese
                  ? "重试开始录音"
                  : "Retry starting recording"}
              </button>
            )}
        </div>
      )}

      <div style={{ height: 40 }} />

      <div className="submitButtonContainer">
        <GreenButton
          className="testNextButton"
          showChinese={showChinese}
          textEnglish={finalizing ? "Saving recordings..." : "Next"}
          textChinese={finalizing ? "正在保存录音..." : "下一个"}
          disabled={!proceedEnabled || finalizing}
          onClick={finishAndAdvance}
        />
      </div>
    </div>
  );
};

export default Repetition;
