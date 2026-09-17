import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { ReactMic } from "react-mic";
import Retell from "./Retell";

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
      <Retell
        imageLinks={["https://example.com/pic1.png", "https://example.com/pic2.png"]}
        showChinese={false}
        setShowChinese={() => {}}
        uploadToLambda={uploadToLambda}
        type="retell"
        disableOption={false}
        beforeUnload={beforeUnload}
        participantId="test1"
        questionId="story-2-retell-1"
        explicitQuestionId={1}
        testLanguage="CN"
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

test("supplies the session's composite ID (not the raw subStage) to the camera", () => {
  expect(mockVideoProps).toMatchObject({
    participantId: "test1",
    questionId: "story-2-retell-1",
    testType: "story-retell",
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

test("submits with the current subStage's numeric question ID and waits for camera upload before advancing", async () => {
  let finishUpload;
  mockWaitForUpload.mockImplementation(
    () => new Promise((resolve) => { finishUpload = resolve; })
  );
  const recorded = await recordAnswer();
  await click(container.querySelector(".submitButtonContainer button"));
  expect(uploadToLambda).toHaveBeenCalledWith(recorded.blob, "retell", 1);
  expect(beforeUnload).not.toHaveBeenCalled();
  await act(async () => finishUpload());
  expect(beforeUnload).toHaveBeenCalledTimes(1);
});

test("does not advance (and warns instead of silently dropping the recording) when the backend returns no audio URL", async () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  uploadToLambda.mockResolvedValue(null);
  await recordAnswer();
  await click(container.querySelector(".submitButtonContainer button"));
  expect(beforeUnload).not.toHaveBeenCalled();
  expect(mockWaitForUpload).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith("Failed to submit audio.");
});

test("starts the required audio recording even when the optional video camera fails to start", async () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockStartRecording.mockRejectedValueOnce(
    new Error("Only 1 of 2 required cameras are ready.")
  );
  await click(container.querySelector(".recordingContainer.enabled"));
  expect(container.querySelector(".recordingActionContainer")).not.toBeNull();
  expect(container.textContent).toContain("Only 1 of 2 required cameras are ready.");
  expect(alertSpy).not.toHaveBeenCalled();
});
