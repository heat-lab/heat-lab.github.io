import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { ReactMic } from "react-mic";
import VideoRecorder from "../Components/VideoRecorder";

import "./StoryTest.css";


const Questions = ({
  showChinese,
  beforeUnload,
  question,
  uploadToLambda,
  type,
  disableOption,
  storyId,
  testLanguage,
}) => {
  const [
    recording,
    setRecording,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadError,
    setUploadError,
  ] = useState("");

  const [
    pendingRecording,
    setPendingRecording,
  ] = useState(null);

  const micRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const videoStopPromiseRef = useRef(Promise.resolve());
  const videoStoppedRef = useRef(false);
  const uploadedAudioUrlRef = useRef(null);
  const startLockRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [videoError, setVideoError] = useState("");

  const questionText =
    question?.question_text || "";

  const questionId =
    question?.question_id ?? "";

  const questionImages =
    Array.isArray(
      question?.image_links
    )
      ? question.image_links
      : [];


  useEffect(() => {
    /*
     * Clear any old error when the
     * parent moves to a new question.
     */
    setRecording(false);
    setUploading(false);
    setUploadError("");
    setPendingRecording(null);
    setVideoError("");
    uploadedAudioUrlRef.current = null;
    videoStoppedRef.current = false;
    videoStopPromiseRef.current = Promise.resolve();
  }, [questionId, storyId]);


  const startRecording = async () => {
    if (uploading || disableOption || startLockRef.current) return;
    startLockRef.current = true;
    setStarting(true);
    setVideoError("");
    setUploadError("");
    try {
      await videoRecorderRef.current.startRecording();
      videoStoppedRef.current = false;
      videoStopPromiseRef.current = Promise.resolve();
      uploadedAudioUrlRef.current = null;
      setPendingRecording(null);
      setRecording(true);
    } catch (error) {
      setVideoError(error.message || "Could not start cameras. Check setup and try again.");
    } finally {
      startLockRef.current = false;
      setStarting(false);
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    videoStopPromiseRef.current = videoRecorderRef.current.stopRecording().then(() => {
      videoStoppedRef.current = true;
      return null;
    }, error => error);
    setRecording(false);
  };

  const uploadRecording = async (
    recordedBlob
  ) => {
    if (
      !recordedBlob ||
      !recordedBlob.blob
    ) {
      setUploadError(
        showChinese
          ? "没有找到录音。请重新录制。"
          : (
              "No recording was found. " +
              "Please record your answer again."
            )
      );

      return;
    }

    setUploading(true);
    setUploadError("");
    setPendingRecording(
      recordedBlob
    );

    try {
      if (!uploadedAudioUrlRef.current) {
        const s3Url = await uploadToLambda(recordedBlob, type);
        if (!s3Url) throw new Error("The server did not return a recording URL.");
        uploadedAudioUrlRef.current = s3Url;
      }
      let stopError = await videoStopPromiseRef.current;
      if (stopError && !videoStoppedRef.current) {
        await videoRecorderRef.current.stopRecording();
        videoStoppedRef.current = true;
      }
      await videoRecorderRef.current.waitForUpload();
      setPendingRecording(null);
      beforeUnload();

    } catch (error) {
      console.error(
        "Story question upload failed:",
        error
      );

      setUploadError(
        showChinese
          ? (
              "上传失败。录音仍保留在此页面。请点击重试。"
            )
          : (
              "Upload failed. Your recording " +
              "is still available on this page. " +
              "Click Retry upload."
            )
      );

    } finally {
      setUploading(false);
    }
  };


  const onStop = async (
    recordedBlob
  ) => {
    if (
      recordedBlob?.blobURL
    ) {
      console.log(
        "Local recording URL:",
        recordedBlob.blobURL
      );
    }

    await uploadRecording(
      recordedBlob
    );
  };


  const retryUpload = async () => {
    if (!pendingRecording) {
      return;
    }

    await uploadRecording(
      pendingRecording
    );
  };


  return (
    <div id="questions">
      <VideoRecorder
        ref={videoRecorderRef}
        participantId={localStorage.getItem("username") || ""}
        questionId={`story-${storyId ?? "unknown"}-question-${questionId || "unknown"}`}
        testType="story-question"
        language={testLanguage}
        showChinese={showChinese}
      />
      {videoError && <p role="alert" style={{color: "#b00020"}}>{videoError}</p>}
      <div
        className="reactMicContainer"
      >
        <ReactMic
          record={recording}
          onStop={onStop}
          ref={micRef}
          visualSetting="none"
          mimeType="audio/webm"
        />
      </div>

      <h1
        className="storyQuestion"
      >
        {`${questionId}${
          questionId !== ""
            ? ". "
            : ""
        }${questionText}`}
      </h1>

      {questionImages.length > 0 ? (
        <div className="container">
          {questionImages.map(
            (item, index) => (
              <div
                className="itemContainer"
                key={
                  item || index
                }
              >
                <img
                  src={item}
                  alt="story scene"
                  className="storyItem"
                />
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space" />
      )}

      {recording ? (
        <div
          className={
            "recordingActionContainer"
          }
          onClick={
            stopRecording
          }
        >
          <div
            className={
              "recordingContainer"
            }
          >
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />

            <p>
              {showChinese
                ? "正在聆听..."
                : "Listening..."}
            </p>

            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
            <div className="listeningBar" />
          </div>

          {showChinese
            ? "（再次点击提交答案）"
            : (
                "(click again to submit " +
                "answer)"
              )}
        </div>

      ) : uploading || starting ? (
        <div
          className={
            "recordingContainer disabled"
          }
        >
          <p>
            {showChinese
              ? "正在上传录音..."
              : "Uploading recording..."}
          </p>
        </div>

      ) : uploadError &&
        pendingRecording ? (
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
            className={
              "recordingContainer enabled"
            }
            onClick={
              retryUpload
            }
          >
            <p>
              {showChinese
                ? "点击重试上传"
                : "Retry upload"}
            </p>
          </div>
        </div>

      ) : disableOption ? (
        <div
          className={
            "recordingContainer disabled"
          }
        >
          <p>
            {showChinese
              ? "正在播放说明..."
              : "Instructions playing..."}
          </p>
        </div>

      ) : (
        <div
          className={
            "recordingContainer enabled"
          }
          onClick={
            startRecording
          }
        >
          <p>
            {showChinese
              ? "点击录制答案"
              : "Click to record answer"}
          </p>
        </div>
      )}

      {uploadError &&
        !pendingRecording && (
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
