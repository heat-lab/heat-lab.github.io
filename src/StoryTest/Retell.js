import React, { useEffect, useRef, useState } from "react";
import { ReactMic } from "react-mic";
import BlueButton from "../Components/BlueButton";
import TranslationButton from "../Components/TranslationButton";
import "./StoryTest.css";

const Retell = ({
  imageLinks,
  showChinese,
  setShowChinese,
  uploadToLambda,
  type,
  disableOption,
}) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showExceededMessage, setShowExceededMessage] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const countdownRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(countdownRef.current);
    };
  }, []);

  const normalizedImageLinks = Array.isArray(imageLinks)
    ? imageLinks.map((item) => {
        if (typeof item === "string") return item;
        return item?.link || "";
      })
    : [];

  const startRecording = () => {
    if (disableOption) return;

    setAudioUrl("");
    setRecordedBlob(null);
    setShowExceededMessage(false);
    setHasRecorded(false);
    setTimeLeft(30);
    setRecording(true);

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

  const onStop = (blobObject) => {
    if (!blobObject) return;

    setAudioUrl(blobObject.blobURL);
    setRecordedBlob(blobObject);
    setRecording(false);
    setHasRecorded(true);
  };

  const submitRecording = async () => {
    if (!recordedBlob) return;

    try {
      const s3Url = await uploadToLambda(recordedBlob, type);
      console.log("Retell recording stored at:", s3Url);
      alert("Audio submitted.");
    } catch (e) {
      console.error("Failed to submit retell audio", e);
      alert("Failed to submit audio.");
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
        {normalizedImageLinks.map((link, idx) => (
          <div key={idx} className="itemContainer">
            <p>{idx + 1}.</p>
            <img src={link} alt="story scene" className="storyItem" />
          </div>
        ))}
      </div>

      {recording ? (
        <div className="recordingActionContainer" onClick={stopRecording}>
          <div className="recordingContainer">
            <p className="actionText">
              {showChinese ? "点击停止录音" : "Tap to stop recording"}
            </p>
          </div>
        </div>
      ) : disableOption ? (
        <div className="recordingContainer disabled">
          <p className="actionText">
            {showChinese ? "正在播放说明..." : "Instructions playing..."}
          </p>
        </div>
      ) : (
        <div className="recordingContainer enabled" onClick={startRecording}>
          <p className="actionText">
            {showChinese ? "点击开始录音" : "Tap to start recording"}
          </p>
        </div>
      )}

      <p className="actionText">
        {showChinese
          ? `录音剩余时间：${timeLeft} 秒`
          : `Recording time left: ${timeLeft} seconds`}
      </p>

      {showExceededMessage && (
        <p className="actionText">
          {showChinese
            ? "录音已超过最大时间，请继续。"
            : "Recording has exceeded the maximum time, please proceed."}
        </p>
      )}

      {audioUrl && (
        <div style={{ marginTop: 16 }}>
          <p className="actionText">
            {showChinese ? "回放录音：" : "Playback of your recording:"}
          </p>
          <audio
            controls
            src={audioUrl}
            style={{ width: "300px", maxWidth: "90vw" }}
          />
        </div>
      )}

      {hasRecorded && (
        <div className="submitButtonContainer">
          <BlueButton
            showChinese={showChinese}
            textEnglish="Submit recording"
            textChinese="提交录音"
            onClick={submitRecording}
            disabled={!recordedBlob}
          />
        </div>
      )}

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
