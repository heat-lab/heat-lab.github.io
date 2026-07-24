import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from "react-mic";
import BlueButton from "../Components/BlueButton";
import "./StoryTest.css";

const MAX_RECORDING_ATTEMPTS = 2;

const Questions = ({
  showChinese,
  beforeUnload,
  question,
  displayNumber,
  uploadToLambda,
  type,
  disableOption,
  onStartRecording,
}) => {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingAttempts, setRecordingAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const micRef = useRef(null);
  const questionText = question?.question_text || "";
  const questionId = question?.question_id ?? "";
  const questionImages = Array.isArray(question?.image_links)
    ? question.image_links
    : [];

  useEffect(() => {
    setRecording(false);
    setRecordedBlob(null);
    setRecordedAudioUrl("");
    setRecordingAttempts(0);
    setSubmitting(false);
  }, [questionId]);

  const startRecording = () => {
    if (disableOption || recordingAttempts >= MAX_RECORDING_ATTEMPTS) {
      return;
    }

    setRecordedBlob(null);
    setRecordedAudioUrl("");
    onStartRecording?.(); // auto pause the audio
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const onStop = (nextRecording) => {
    if (!nextRecording || !nextRecording.blob) {
      return;
    }

    setRecordedBlob(nextRecording);
    setRecordedAudioUrl(nextRecording.blobURL || "");
    setRecordingAttempts((prev) =>
      Math.min(prev + 1, MAX_RECORDING_ATTEMPTS)
    );
    setRecording(false);
  };

  const submitRecording = async () => {
    if (!recordedBlob || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const s3Url = await uploadToLambda(recordedBlob, type, questionId);
      console.log("Recording stored at:", s3Url);
      beforeUnload();
    } catch (error) {
      console.error("Failed to upload question audio:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="questions">
      <div className="reactMicContainer">
        <ReactMic
          record={recording}
          onStop={onStop}
          ref={micRef}
          visualSetting="none"
        />
      </div>
      <h1 className="storyQuestion">
        {`${displayNumber}. ${questionText}`}
      </h1>
      {questionImages.length > 0 ? (
        <div className="container">
          {questionImages.map((item, idx) => (
            <div className="itemContainer" key={idx}>
              <img src={item} alt="story scene" className="storyItem" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space" />
      )}
      {recording ? (
        <div className="recordingActionContainer" onClick={stopRecording}>
          <div className="recordingContainer stopRecording">
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <p>{showChinese ? "正在聆听..." : "Listening..."}</p>
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
          </div>
          {showChinese
            ? "（再次点击停止录音）"
            : "(click again to stop recording)"}
        </div>
      ) : disableOption ? (
        <div className="recordingContainer disabled">
          <p>{showChinese ? "正在播放说明..." : "Instructions playing..."}</p>
        </div>
      ) : (
        <div
          className={
            recordingAttempts >= MAX_RECORDING_ATTEMPTS
              ? "recordingContainer disabled"
              : "recordingContainer enabled"
          }
          onClick={
            recordingAttempts >= MAX_RECORDING_ATTEMPTS
              ? undefined
              : startRecording
          }
        >
          <p>
            {recordingAttempts >= MAX_RECORDING_ATTEMPTS
              ? showChinese
                ? "已达到两次录音上限"
                : "Two recording attempts used"
              : showChinese
                ? "点击录制答案"
                : "Click to record answer"}
          </p>
        </div>
      )}

      <p className="recordingAttemptText">
        {showChinese
          ? `录音次数：${recordingAttempts}/${MAX_RECORDING_ATTEMPTS}`
          : `Recording attempts: ${recordingAttempts}/${MAX_RECORDING_ATTEMPTS}`}
      </p>

      {recordedAudioUrl && (
        <div className="recordingReviewContainer">
          <audio
            controls
            src={recordedAudioUrl}
            className="retellAudioPlayer"
          />
          <div className="submitButtonContainer">
            <BlueButton
              showChinese={showChinese}
              textEnglish={submitting ? "Submitting..." : "Submit recording"}
              textChinese={submitting ? "提交中..." : "提交录音"}
              onClick={submitRecording}
              disabled={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
