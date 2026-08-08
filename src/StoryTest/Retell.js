import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { ReactMic } from "react-mic";

import BlueButton from "../Components/BlueButton";
import TranslationButton from "../Components/TranslationButton";
import VideoRecorder from "../Components/VideoRecorder";

import "./StoryTest.css";


const Retell = ({
  imageLinks,
  showChinese,
  setShowChinese,
  uploadToLambda,
  type,
  disableOption,
  beforeUnload,
  participantId,
  questionId,
  testLanguage,
}) => {
  const [
    recording,
    setRecording,
  ] = useState(false);

  const [
    audioUrl,
    setAudioUrl,
  ] = useState(null);

  const [
    audioBlob,
    setAudioBlob,
  ] = useState(null);

  const [
    timeLeft,
    setTimeLeft,
  ] = useState(30);

  const [
    showExceededMessage,
    setShowExceededMessage,
  ] = useState(false);

  const [
    hasRecorded,
    setHasRecorded,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    videoError,
    setVideoError,
  ] = useState("");

  const countdownRef = useRef(null);
  const audioRef = useRef(null);
  const videoRecorderRef = useRef(null);

  useEffect(() => {
    setTimeLeft(30);
  }, [questionId]);

  useEffect(
    () => () => {
      if (
        audioRef.current
        instanceof Audio
      ) {
        audioRef.current.pause();
      }

      clearInterval(
        countdownRef.current
      );
    },
    []
  );

  const onStop = (recorded) => {
    setAudioUrl(recorded.blobURL);
    setAudioBlob(recorded.blob);
    setRecording(false);
    setHasRecorded(true);
  };

  const stopRecording = () => {
    setRecording(false);

    clearInterval(
      countdownRef.current
    );

    videoRecorderRef.current
      ?.stopRecording()
      .catch((error) => {
        setVideoError(
          error.message
        );
      });
  };

  const startRecording = async () => {
    if (
      disableOption
      || submitting
    ) {
      return;
    }

    setVideoError("");
    setShowExceededMessage(false);
    setHasRecorded(false);
    setAudioBlob(null);
    setAudioUrl(null);

    try {
      await videoRecorderRef.current
        ?.startRecording();

    } catch (error) {
      setVideoError(error.message);

      alert(
        "Video is not ready: " +
          error.message
      );

      return;
    }

    setRecording(true);
    setTimeLeft(30);

    clearInterval(
      countdownRef.current
    );

    countdownRef.current =
      setInterval(() => {
        setTimeLeft((previous) => {
          if (previous <= 1) {
            clearInterval(
              countdownRef.current
            );

            setShowExceededMessage(
              true
            );

            setRecording(false);

            videoRecorderRef.current
              ?.stopRecording()
              .catch((error) => {
                setVideoError(
                  error.message
                );
              });

            return 0;
          }

          return previous - 1;
        });
      }, 1000);
  };

  const submitRecording = async () => {
    if (
      !audioBlob
      || submitting
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await uploadToLambda(
        {
          blob: audioBlob,
          blobURL: audioUrl,
        },
        type
      );

      await videoRecorderRef.current
        ?.waitForUpload();

      beforeUnload?.();

    } catch (error) {
      alert(
        "Failed to submit recording: " +
          error.message
      );

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="retell"
      className="retell"
    >
      <VideoRecorder
        ref={videoRecorderRef}
        participantId={participantId}
        questionId={questionId}
        testType="story-retell"
        language={testLanguage}
        showChinese={showChinese}
      />

      <div className="reactMicContainer">
        <ReactMic
          record={recording}
          onStop={onStop}
          mimeType="audio/webm"
          strokeColor="#000000"
          backgroundColor="#FFFFFF"
          className="reactMicStyle"
        />
      </div>

      <div className="container">
        {imageLinks.map(
          (link, index) => (
            <div
              key={index}
              className="itemContainer"
            >
              <p>{index + 1}.</p>

              <img
                src={link}
                alt="story scene"
                className="storyItem"
              />
            </div>
          )
        )}
      </div>

      {recording ? (
        <div
          className={
            "recordingActionContainer"
          }
          onClick={stopRecording}
        >
          <p className="actionText">
            {showChinese
              ? "点击停止录音"
              : "Tap to stop recording"}
          </p>
        </div>
      ) : (
        <div
          className={
            disableOption
              ? (
                  "recordingContainer " +
                  "disabled"
                )
              : (
                  "recordingContainer " +
                  "enabled"
                )
          }
          onClick={
            disableOption
              ? undefined
              : startRecording
          }
        >
          <p className="actionText">
            {showChinese
              ? "点击开始录音"
              : "Tap to start recording"}
          </p>
        </div>
      )}

      {showExceededMessage && (
        <p className="actionText">
          {showChinese
            ? (
                "录音已达到最大时间，" +
                "请提交。"
              )
            : (
                "The recording reached " +
                "the maximum time. " +
                "Please submit it."
              )}
        </p>
      )}

      <p className="actionText">
        {showChinese
          ? (
              `录音剩余时间：` +
              `${timeLeft} 秒`
            )
          : (
              `Recording time left: ` +
              `${timeLeft} seconds`
            )}
      </p>

      {videoError && (
        <p
          style={{
            color: "#b00020",
            fontWeight: 700,
          }}
        >
          {videoError}
        </p>
      )}

      {hasRecorded && (
        <div
          className={
            "submitButtonContainer"
          }
        >
          <BlueButton
            showChinese={showChinese}
            textEnglish={
              submitting
                ? "Submitting..."
                : "Submit recording"
            }
            textChinese={
              submitting
                ? "提交中..."
                : "提交录音"
            }
            onClick={submitRecording}
            disabled={
              !audioBlob
              || submitting
            }
          />
        </div>
      )}

      <div
        style={{
          marginTop: 16,
        }}
      >
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={
            setShowChinese
          }
        />
      </div>
    </div>
  );
};


export default Retell;
