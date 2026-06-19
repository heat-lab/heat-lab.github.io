import React, { useEffect, useRef, useState } from "react";
import { ReactMic } from "react-mic";
import BlueButton from "../Components/BlueButton";
import TranslationButton from "../Components/TranslationButton";
import "./StoryTest.css";
import VideoRecorder from "../Components/VideoRecorder";
import VideoUpload from "../Components/VideoUpload";

const Retell = ({
  imageLinks,
  showChinese,
  setShowChinese,
  uploadToLambda,
  type,
  disableOption,
  beforeUnload,
}) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [showExceededMessage, setShowExceededMessage] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const countdownRef = useRef(null);

  useEffect(() => {
    setTimeLeft(30);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(countdownRef.current);
    };
  }, []);

  const onStop = async (recorded) => {
    setAudioBlob(recorded.blob);
    setRecording(false);
    setHasRecorded(true);
  };

  const startRecording = () => {
    if (disableOption) return;
    setShowExceededMessage(false);
    setHasRecorded(false);
    setRecording(true);
    setTimeLeft(30);

    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setShowExceededMessage(true);
          setRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setRecording(false);
    clearInterval(countdownRef.current);
  };

  const submitRecording = async () => {
    if (!audioBlob) return;
    setSubmitting(true);
    try {
      await uploadToLambda(audioBlob, type);
      beforeUnload();
    } catch (e) {
      console.error("Failed to submit retell audio:", e);
      alert("Failed to submit audio.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="retell" className="retell">
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
        {imageLinks.map((link, idx) => (
          <div key={idx} className="itemContainer">
            <p>{idx + 1}.</p>
            <img src={link} alt="story scene" className="storyItem" />
          </div>
        ))}
      </div>

      {recording ? (
        <div className="recordingActionContainer" onClick={stopRecording}>
          <p className="actionText">
            {showChinese ? "点击停止录音" : "Tap to stop recording"}
          </p>
        </div>
      ) : (
        <div
          className={
            disableOption
              ? "recordingContainer disabled"
              : "recordingContainer enabled"
          }
          onClick={disableOption ? undefined : startRecording}
        >
          <p className="actionText">
            {showChinese ? "点击开始录音" : "Tap to start recording"}
          </p>
        </div>
      )}

      {showExceededMessage && (
        <p className="actionText">
          {showChinese
            ? "录音已超过最大时间，请继续。"
            : "Recording has exceeded the maximum time, please proceed."}
        </p>
      )}

      <p className="actionText">
        {showChinese
          ? `录音剩余时间：${timeLeft} 秒`
          : `Recording time left: ${timeLeft} seconds`}
      </p>

      {hasRecorded && (
        <div className="submitButtonContainer">
          <BlueButton
            showChinese={showChinese}
            textEnglish={submitting ? "Submitting..." : "Submit recording"}
            textChinese="提交录音"
            onClick={submitRecording}
            disabled={!audioBlob || submitting}
          />
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h2>{showChinese ? "视频回答选项" : "Video response options"}</h2>
        <VideoRecorder />
        <VideoUpload />
      </div>

      <div style={{ marginTop: 16 }}>
        <TranslationButton
          showChinese={showChinese}
          setShowChinese={setShowChinese}
        />
      </div>
    </div>
  );
};

export default Retell;
