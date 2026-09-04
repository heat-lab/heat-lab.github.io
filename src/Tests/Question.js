import React, { useEffect, useRef, useState } from "react";
import { ReactMic } from "react-mic";

import VideoRecorder from "../Components/VideoRecorder";

import "./StoryTest.css";

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

  return currentRoute.toLowerCase().includes("story-test-chinese")
    ? "CN"
    : "EN";
};

const Questions = ({
  showChinese,
  beforeUnload,
  question,
  uploadToLambda,
  type,
  disableOption,
}) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pendingRecording, setPendingRecording] = useState(null);
  const [videoError, setVideoError] = useState("");

  const micRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const videoStopPromiseRef = useRef(Promise.resolve(null));
  const lastVideoStopErrorRef = useRef(null);
  const uploadedAudioUrlRef = useRef(null);

  const questionText = question?.question_text || "";
  const questionId = question?.question_id ?? "";
  const storyId = question?.story_id ?? "unknown";
  const participantId = localStorage.getItem("username") || "";
  const testLanguage = normalizeLanguage(question);

  const cameraQuestionId =
    `story-${storyId}-` + `question-${questionId || "unknown"}`;

  const questionImages = Array.isArray(question?.image_links)
    ? question.image_links
    : [];

  useEffect(() => {
    setRecording(false);
    setUploading(false);
    setUploadError("");
    setPendingRecording(null);
    setVideoError("");

    uploadedAudioUrlRef.current = null;
    videoStopPromiseRef.current = Promise.resolve(null);
    lastVideoStopErrorRef.current = null;
  }, [questionId, storyId]);

  const startRecording = async () => {
    if (uploading || disableOption) {
      return;
    }

    setUploadError("");
    setVideoError("");
    setPendingRecording(null);

    uploadedAudioUrlRef.current = null;

    try {
      await videoRecorderRef.current?.startRecording();

      videoStopPromiseRef.current = Promise.resolve(null);
      lastVideoStopErrorRef.current = null;

      setRecording(true);
    } catch (error) {
      const message = error.message || "The cameras are not ready.";

      setVideoError(message);
      alert("Video is not ready: " + message);
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

        setVideoError(
          error.message || "The video recording could not be stopped.",
        );

        return error;
      }
    })();

    videoStopPromiseRef.current = stopPromise;

    return stopPromise;
  };

  const stopRecording = () => {
    if (!recording) {
      return;
    }

    stopCameraRecording();
    setRecording(false);
  };

  const uploadRecording = async (recordedBlob) => {
    if (!recordedBlob?.blob) {
      setUploadError(
        showChinese
          ? "没有找到录音。请重新录制。"
          : "No recording was found. Please record your answer again.",
      );

      return;
    }

    setUploading(true);
    setUploadError("");
    setVideoError("");
    setPendingRecording(recordedBlob);

    try {
      let audioUrl = uploadedAudioUrlRef.current;

      if (!audioUrl) {
        audioUrl = await uploadToLambda(recordedBlob, type);

        if (!audioUrl) {
          throw new Error(
            "The server did not return a recording URL.",
          );
        }

        uploadedAudioUrlRef.current = audioUrl;
      }

      const videoStopError = await videoStopPromiseRef.current;

      if (videoStopError) {
        throw videoStopError;
      }

      await videoRecorderRef.current?.waitForUpload();

      setPendingRecording(null);

      beforeUnload();
    } catch (error) {
      console.error("Story question upload failed:", error);

      setUploadError(
        showChinese
          ? "上传失败。录音仍保留在此页面。请检查摄像头并点击重试。"
          : "Upload failed. Your audio is still available on this page. " +
              "Check every camera and click Retry upload.",
      );

      setVideoError(
        error.message ||
          "One or more recordings failed to upload.",
      );
    } finally {
      setUploading(false);
    }
  };

  const onStop = async (recordedBlob) => {
    if (recordedBlob?.blobURL) {
      console.log("Local recording URL:", recordedBlob.blobURL);
    }

    await uploadRecording(recordedBlob);
  };

  const retryUpload = async () => {
    if (!pendingRecording) {
      return;
    }

    if (lastVideoStopErrorRef.current) {
      stopCameraRecording();
    }

    await uploadRecording(pendingRecording);
  };

  return (
    <div id="questions">
      <VideoRecorder
        ref={videoRecorderRef}
        participantId={participantId}
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
          mimeType="audio/webm"
        />
      </div>

      <h1 className="storyQuestion">
        {`${questionId}${
          questionId !== "" ? ". " : ""
        }${questionText}`}
      </h1>

      {questionImages.length > 0 ? (
        <div className="container">
          {questionImages.map((item, index) => (
            <div
              className="itemContainer"
              key={item || index}
            >
              <img
                src={item}
                alt="story scene"
                className="storyItem"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space" />
      )}

      {recording ? (
        <div
          className="recordingActionContainer"
          onClick={stopRecording}
        >
          <div className="recordingContainer">
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
            ? "（再次点击提交答案）"
            : "(click again to submit answer)"}
        </div>
      ) : uploading ? (
        <div className="recordingContainer disabled">
          <p>
            {showChinese
              ? "正在上传音频和视频..."
              : "Uploading audio and camera recordings..."}
          </p>
        </div>
      ) : uploadError && pendingRecording ? (
        <div>
          <p
            style={{
              color: "#b00020",
              fontWeight: 700,
              textAlign: "center",
              maxWidth: 500,
            }}
          >
            {uploadError}
          </p>

          <div
            className="recordingContainer enabled"
            onClick={retryUpload}
          >
            <p>{showChinese ? "点击重试上传" : "Retry upload"}</p>
          </div>
        </div>
      ) : disableOption ? (
        <div className="recordingContainer disabled">
          <p>
            {showChinese
              ? "正在播放说明..."
              : "Instructions playing..."}
          </p>
        </div>
      ) : (
        <div
          className="recordingContainer enabled"
          onClick={startRecording}
        >
          <p>
            {showChinese
              ? "点击录制答案"
              : "Click to record answer"}
          </p>
        </div>
      )}

      {videoError && (
        <p
          style={{
            color: "#b00020",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 600,
            margin: "16px auto 0",
          }}
        >
          {videoError}
        </p>
      )}

      {uploadError && !pendingRecording && (
        <p
          style={{
            color: "#b00020",
            fontWeight: 700,
          }}
        >
          {uploadError}
        </p>
      )}
    </div>
  );
};

export default Questions;
