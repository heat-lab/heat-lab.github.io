import React, { useEffect, useRef, useState } from "react";
import { ReactMic } from "react-mic";
import BlueButton from "../Components/BlueButton";
import TranslationButton from "../Components/TranslationButton";
import "./StoryTest.css";
import VideoRecorder from "../Components/VideoRecorder";
import VideoUpload from "../Components/VideoUpload";

const MAX_RECORDING_ATTEMPTS = 2;

const Retell = ({
  imageLinks,
  showChinese,
  setShowChinese,
  uploadToLambda,
  type,
  disableOption,
  beforeUnload,
  onStartRecording,
}) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [showExceededMessage, setShowExceededMessage] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingAttempts, setRecordingAttempts] = useState(0);

  const countdownRef = useRef(null);
  const promptKey = imageLinks.map((item) => item.link || item).join("|");

  useEffect(() => {
    setAudioBlob(null);
    setRecordedAudioUrl("");
    setHasRecorded(false);
    setRecordingAttempts(0);
    setTimeLeft(30);
  }, [promptKey]);

  useEffect(() => {
    return () => {
      clearTimeout(countdownRef.current);
    };
  }, []);

  const onStop = async (recorded) => {
    if (!recorded || !recorded.blob) {
      return;
    }

    setAudioBlob(recorded.blob);
    setRecordedAudioUrl(recorded.blobURL || "");
    setRecording(false);
    setHasRecorded(true);
    setRecordingAttempts((prev) =>
      Math.min(prev + 1, MAX_RECORDING_ATTEMPTS)
    );
  };

  const startRecording = () => {
    if (disableOption || recordingAttempts >= MAX_RECORDING_ATTEMPTS) return;
    setShowExceededMessage(false);
    setHasRecorded(false);
    setAudioBlob(null);
    onStartRecording?.(); // auto pause the audio
    setRecordedAudioUrl("");
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
        {imageLinks.map((item, idx) => {
          const link = item?.link || item;
          return (
            <div key={item?.id || link || idx} className="itemContainer">
              <p>{idx + 1}.</p>
              <img src={link} alt="story scene" className="storyItem" />
            </div>
          );
        })}
      </div>

      {recording ? (
        <div className="recordingActionContainer" onClick={stopRecording}>
          <div className="recordingContainer stopRecording">
            <p className="actionText">
              {showChinese ? "点击停止录音" : "Tap to stop recording"}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={
            disableOption || recordingAttempts >= MAX_RECORDING_ATTEMPTS
              ? "recordingContainer disabled"
              : "recordingContainer enabled"
          }
          onClick={
            disableOption || recordingAttempts >= MAX_RECORDING_ATTEMPTS
              ? undefined
              : startRecording
          }
        >
          <p className="actionText">
            {recordingAttempts >= MAX_RECORDING_ATTEMPTS
              ? showChinese
                ? "已达到两次录音上限"
                : "Two recording attempts used"
              : showChinese
                ? "点击开始录音"
                : "Tap to start recording"}
          </p>
        </div>
      )}

      <p className="recordingAttemptText">
        {showChinese
          ? `录音次数：${recordingAttempts}/${MAX_RECORDING_ATTEMPTS}`
          : `Recording attempts: ${recordingAttempts}/${MAX_RECORDING_ATTEMPTS}`}
      </p>

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
        <div className="retellReviewContainer">
          {recordedAudioUrl && (
            <audio
              controls
              src={recordedAudioUrl}
              className="retellAudioPlayer"
            />
          )}
          <div className="submitButtonContainer">
            <BlueButton
              showChinese={showChinese}
              textEnglish={submitting ? "Submitting..." : "Submit recording"}
              textChinese="提交录音"
              onClick={submitRecording}
              disabled={!audioBlob || submitting}
            />
          </div>
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
