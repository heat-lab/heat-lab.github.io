import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ReactMic } from "react-mic";
import Questions from "./Questions";

const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();
const mockWaitForUpload = jest.fn();
let mockVideoProps;

jest.mock("react-mic", () => ({ ReactMic: jest.fn(() => null) }));
jest.mock("../Components/VideoRecorder", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => {
      mockVideoProps = props;
      React.useImperativeHandle(ref, () => ({
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
        waitForUpload: mockWaitForUpload,
      }));
      return null;
    }),
  };
});
jest.mock("../Components/BlueButton", () => ({
  __esModule: true,
  default: ({ onClick, disabled, textEnglish }) =>
    require("react").createElement("button", { onClick, disabled }, textEnglish),
}));

let container;
let root;
let uploadToLambda;
let beforeUnload;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockStartRecording.mockReset().mockResolvedValue(null);
  mockStopRecording.mockReset().mockResolvedValue(null);
  mockWaitForUpload.mockReset().mockResolvedValue(null);
  jest.spyOn(console, "error").mockImplementation(() => {});
  localStorage.setItem("username", "test1");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  uploadToLambda = jest.fn().mockResolvedValue("https://example.com/audio.webm");
  beforeUnload = jest.fn();
  act(() => {
    root.render(
      <Questions
        showChinese={false}
        beforeUnload={beforeUnload}
        question={{ question_id: 12, question_text: "What happened?" }}
        storyId={2}
        testLanguage="CN"
        displayNumber={1}
        uploadToLambda={uploadToLambda}
        type="question"
        disableOption={false}
      />
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  jest.restoreAllMocks();
});

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const recordAnswer = async () => {
  await click(container.querySelector(".recordingContainer.enabled"));
  await click(container.querySelector(".recordingActionContainer"));
  const recorded = { blob: new Blob(["audio"]), blobURL: "blob:local-review" };
  await act(async () => {
    const calls = ReactMic.mock.calls;
    calls[calls.length - 1][0].onStop(recorded);
  });
  return recorded;
};

test("preserves display numbering and supplies the actual story/language to cameras", () => {
  expect(container.querySelector("h1").textContent).toBe("1. What happened?");
  expect(mockVideoProps).toMatchObject({
    participantId: "test1",
    questionId: "story-2-question-12",
    testType: "story-question",
    language: "CN",
  });
});

test("keeps review and the two-recording-attempt limit", async () => {
  await recordAnswer();
  expect(container.querySelector("audio").getAttribute("src")).toBe("blob:local-review");
  expect(uploadToLambda).not.toHaveBeenCalled();
  await recordAnswer();
  expect(container.querySelector(".recordingAttemptText").textContent).toContain("2/2");
  expect(container.querySelector(".recordingContainer.enabled")).toBeNull();
  expect(mockStartRecording).toHaveBeenCalledTimes(2);
});

test("submits the actual question ID and waits for camera upload before advancing", async () => {
  let finishUpload;
  mockWaitForUpload.mockImplementation(() => new Promise((resolve) => { finishUpload = resolve; }));
  const recorded = await recordAnswer();
  await click(container.querySelector("button"));
  expect(uploadToLambda).toHaveBeenCalledWith(recorded, "question", 12);
  expect(mockStopRecording).toHaveBeenCalledTimes(1);
  expect(beforeUnload).not.toHaveBeenCalled();
  await act(async () => finishUpload());
  expect(beforeUnload).toHaveBeenCalledTimes(1);
});

test("retains audio for retry without duplicating a successful audio upload", async () => {
  mockWaitForUpload.mockRejectedValueOnce(new Error("Camera upload failed"));
  await recordAnswer();
  await click(container.querySelector("button"));
  expect(beforeUnload).not.toHaveBeenCalled();
  expect(container.querySelector("[role=alert]").textContent).toContain("Camera upload failed");
  await click(container.querySelector("button"));
  expect(uploadToLambda).toHaveBeenCalledTimes(1);
  expect(mockWaitForUpload).toHaveBeenCalledTimes(2);
  expect(beforeUnload).toHaveBeenCalledTimes(1);
});

test("does not advance when the backend returns no audio URL", async () => {
  uploadToLambda.mockResolvedValue(null);
  await recordAnswer();
  await click(container.querySelector("button"));
  expect(beforeUnload).not.toHaveBeenCalled();
  expect(mockWaitForUpload).not.toHaveBeenCalled();
  expect(container.querySelector("[role=alert]").textContent).toContain("recording URL");
});

test("retries a failed camera stop before advancing", async () => {
  mockStopRecording.mockRejectedValueOnce(new Error("Camera stop failed"));
  await recordAnswer();
  await click(container.querySelector("button"));
  expect(mockStopRecording).toHaveBeenCalledTimes(2);
  expect(beforeUnload).toHaveBeenCalledTimes(1);
});
