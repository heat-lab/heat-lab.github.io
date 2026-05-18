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
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const micRef = useRef(null);

  const questionText = question?.question_text || "";
  const questionId = question?.question_id ?? "";
  const questionImages = Array.isArray(question?.image_links)
    ? question.image_links
    : [];

  const startRecording = () => {
    if (disableOption) return;
    setRecordedAudioUrl("");
    setFinishedProcessing(false);
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const onStop = async (recordedBlob) => {
    setFinishedProcessing(true);

    if (!recordedBlob) {
      setFinishedProcessing(false);
      return;
    }

    setRecordedAudioUrl(recordedBlob.blobURL);

    try {
      const s3Url = await uploadToLambda(recordedBlob, type);
      console.log("Recording stored at:", s3Url);
    } catch (e) {
      console.error("Failed to upload recording", e);
    }
  };

  useEffect(() => {
    if (finishedProcessing) {
      beforeUnload();
      setRecording(false);
      setFinishedProcessing(false);
    }
  }, [finishedProcessing, beforeUnload]);

  return (
    <div id="questions">
      <div className="reactMicContainer">
        <ReactMic
          record={recording}
          onStop={onStop}
          ref={micRef}
          visualSetting="frequencyBars"
          className="reactMicStyle"
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
            <p>
              {showChinese
                ? "正在录音...（再次点击提交答案）"
                : "Recording... (click again to submit answer)"}
            </p>
          </div>
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

      {recordedAudioUrl && (
        <div style={{ marginTop: 16 }}>
          <p className="actionText">
            {showChinese ? "回放录音：" : "Playback of your recording:"}
          </p>
          <audio
            controls
            src={recordedAudioUrl}
            style={{ width: "300px", maxWidth: "90vw" }}
          />
        </div>
      )}
    </div>
  );
};

export default Questions;
