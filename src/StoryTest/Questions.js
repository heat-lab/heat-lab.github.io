import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from "react-mic";
import BlueButton from "../Components/BlueButton";
import VideoRecorder from "../Components/VideoRecorder";
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
  storyId,
  testLanguage,
}) => {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingAttempts, setRecordingAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [videoError, setVideoError] = useState("");
  const micRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const videoStopPromiseRef = useRef(Promise.resolve(null));
  const lastVideoStopErrorRef = useRef(null);
  const uploadedAudioUrlRef = useRef(null);
  const questionText = question?.question_text || "";
  const questionId = question?.question_id ?? "";
  const cameraQuestionId = `story-${storyId ?? question?.story_id ?? "unknown"}-question-${questionId || "unknown"}`;
  const questionImages = Array.isArray(question?.image_links)
    ? question.image_links
    : [];

  useEffect(() => {
    setRecording(false);
    setRecordedBlob(null);
    setRecordedAudioUrl("");
    setRecordingAttempts(0);
    setSubmitting(false);
    setStartingRecording(false);
    setUploadError("");
    setVideoError("");
    uploadedAudioUrlRef.current = null;
    videoStopPromiseRef.current = Promise.resolve(null);
    lastVideoStopErrorRef.current = null;
  }, [questionId, storyId]);

  const startRecording = async () => {
    if (disableOption || submitting || startingRecording || recordingAttempts >= MAX_RECORDING_ATTEMPTS) {
      return;
    }

    setRecordedBlob(null);
    setRecordedAudioUrl("");
    setUploadError("");
    setVideoError("");
    uploadedAudioUrlRef.current = null;
    setStartingRecording(true);

    try {
      await videoRecorderRef.current?.startRecording();
      videoStopPromiseRef.current = Promise.resolve(null);
      lastVideoStopErrorRef.current = null;
      onStartRecording?.(); // auto pause the audio
      setRecording(true);
    } catch (error) {
      setVideoError(error.message || "The cameras are not ready.");
    } finally {
      setStartingRecording(false);
    }
  };

  const stopCameraRecording = () => {
    lastVideoStopErrorRef.current = null;
    const stopPromise = (async () => {
      try {
        await videoRecorderRef.current?.stopRecording();
        return null;
      } catch (error) {
        lastVideoStopErrorRef.current = error;
        setVideoError(error.message || "The video recording could not be stopped.");
        return error;
      }
    })();
    videoStopPromiseRef.current = stopPromise;
    return stopPromise;
  };

  const stopRecording = () => {
    if (!recording) return;
    stopCameraRecording();
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
    setUploadError("");
    try {
      if (lastVideoStopErrorRef.current) {
        stopCameraRecording();
      }

      if (!uploadedAudioUrlRef.current) {
        const s3Url = await uploadToLambda(recordedBlob, type, questionId);
        if (!s3Url) {
          throw new Error("The server did not return a recording URL.");
        }
        uploadedAudioUrlRef.current = s3Url;
      }

      const videoStopError = await videoStopPromiseRef.current;
      if (videoStopError) throw videoStopError;
      await videoRecorderRef.current?.waitForUpload();
      beforeUnload();
    } catch (error) {
      console.error("Failed to upload question audio:", error);
      setUploadError(error.message || "One or more recordings failed to upload.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="questions">
      <VideoRecorder
        ref={videoRecorderRef}
        participantId={localStorage.getItem("username") || ""}
        questionId={cameraQuestionId}
        testType="story-question"
        language={testLanguage}
        showChinese={showChinese}
      />
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
      ) : startingRecording || submitting ? (
        <div className="recordingContainer disabled">
          <p>{showChinese ? "正在准备或上传录音..." : "Preparing or uploading recordings..."}</p>
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
              textEnglish={submitting ? "Submitting..." : uploadError ? "Retry submission" : "Submit recording"}
              textChinese={submitting ? "提交中..." : uploadError ? "重试提交" : "提交录音"}
              onClick={submitRecording}
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {(uploadError || videoError) && (
        <p role="alert" style={{ color: "#b00020", fontWeight: 700 }}>
          {uploadError || videoError}
        </p>
      )}
    </div>
  );
};

export default Questions;
