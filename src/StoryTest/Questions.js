import React, { useState, useEffect, useRef } from "react";
import { ReactMic } from "react-mic";
import "./StoryTest.css";

const Questions = ({
  showChinese,
  beforeUnload,
  question,
  uploadToLambda,
  type,
  disableOption,
}) => {
  const [recording, setRecording] = useState(false);
  const [finishedProcessing, setFinishedProcessing] = useState(false);
  const micRef = useRef(null);
  const questionText = question?.question_text || "";
  const questionId = question?.question_id ?? "";
  const questionImages = Array.isArray(question?.image_links)
    ? question.image_links
    : [];

  const startRecording = () => {
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const onStop = async (recordedBlob) => {
    setFinishedProcessing(true);
    if (!recordedBlob) {
      return;
    }
    const url = recordedBlob.blobURL;
    console.log("Local recording URL:", url);
    const s3Url = await uploadToLambda(recordedBlob, type);
    console.log("Recording stored at:", s3Url);
  };

  const onFinish = () => {
    setRecording(false);
    setFinishedProcessing(false);
  };

  useEffect(() => {
    if (finishedProcessing) {
      beforeUnload();
      onFinish();
    }
  }, [finishedProcessing, beforeUnload]);

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
        {`${questionId}${questionId !== "" ? ". " : ""}${questionText}`}
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
      ) : disableOption ? (
        <div className="recordingContainer disabled">
          <p>{showChinese ? "正在播放说明..." : "Instructions playing..."}</p>
        </div>
      ) : (
        <div className="recordingContainer enabled" onClick={startRecording}>
          <p>{showChinese ? "点击录制答案" : "Click to record answer"}</p>
        </div>
      )}
    </div>
  );
};

export default Questions;
