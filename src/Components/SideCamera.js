import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { APIBASEURL } from "../config";


const chooseVideoMimeType = () => {
  const choices = [
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  return (
    choices.find(
      (choice) =>
        window.MediaRecorder &&
        MediaRecorder.isTypeSupported(
          choice
        )
    ) || ""
  );
};


const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () =>
      resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });


const requestJson = async (
  url,
  options = {}
) => {
  const response = await fetch(
    url,
    options
  );

  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        error: text,
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
};


const postJson = (
  url,
  body = {}
) =>
  requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": (
        "application/json"
      ),
    },
    body: JSON.stringify(body),
  });


const SideCamera = ({
  sessionId,
}) => {
  const normalizedSessionId = String(
    sessionId || ""
  ).trim().toUpperCase();

  const storageKey = (
    "merls-camera-role-" +
    normalizedSessionId
  );

  const [
    session,
    setSession,
  ] = useState(null);

  const [
    deviceRole,
    setDeviceRole,
  ] = useState(
    () =>
      localStorage.getItem(
        storageKey
      ) || ""
  );

  const [
    stream,
    setStream,
  ] = useState(null);

  const [
    connected,
    setConnected,
  ] = useState(false);

  const [
    recording,
    setRecording,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadComplete,
    setUploadComplete,
  ] = useState(false);

  /*
   * Real camera / recording / upload error.
   *
   * This should stay visible until the
   * actual problem is fixed.
   */
  const [
    error,
    setError,
  ] = useState("");

  /*
   * Temporary polling/network error.
   *
   * This automatically clears as soon as
   * communication with the backend works
   * again.
   */
  const [
    pollError,
    setPollError,
  ] = useState("");

  const [
    retryUpload,
    setRetryUpload,
  ] = useState(null);

  const previewRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const currentRecordingIdRef =
    useRef("");

  const pendingRecordingIdRef =
    useRef("");

  const startTimerRef = useRef(null);
  const wakeLockRef = useRef(null);


  useEffect(() => {
    streamRef.current = stream;

    if (previewRef.current) {
      previewRef.current.srcObject = (
        stream || null
      );
    }
  }, [stream]);


  const refreshSession = async () => {
    const latest = await requestJson(
      `${APIBASEURL}/` +
        `recording-sessions/` +
        `${normalizedSessionId}`
    );

    setSession(latest);

    return latest;
  };


  useEffect(() => {
    refreshSession()
      .then(() => {
        setPollError("");
      })
      .catch(
        (loadError) => {
          setPollError(
            loadError.message
          );
        }
      );
  }, [normalizedSessionId]);


  const requestWakeLock = async () => {
    try {
      if (
        navigator.wakeLock?.request
      ) {
        wakeLockRef.current =
          await navigator.wakeLock
            .request("screen");
      }
    } catch {
      // Wake Lock is optional.
    }
  };


  const uploadBlob = async (
    blob,
    recordingId
  ) => {
    setUploading(true);
    setUploadComplete(false);
    setRetryUpload(null);
    setError("");

    try {
      const mediaData =
        await blobToDataUrl(blob);

      await postJson(
        `${APIBASEURL}/media-upload`,
        {
          mediaData,
          filetype: (
            blob.type ||
            "video/webm"
          ),
          sessionId:
            normalizedSessionId,
          deviceRole,
          recordingId,
        }
      );

      setUploadComplete(true);

      await refreshSession();

    } catch (uploadError) {
      setRetryUpload({
        blob,
        recordingId,
      });

      setError(
        "Upload failed: " +
          uploadError.message
      );

      throw uploadError;

    } finally {
      setUploading(false);
    }
  };


  const startLocalRecorder = (
    sessionState
  ) => {
    if (
      !streamRef.current ||
      recorderRef.current?.state ===
        "recording"
    ) {
      return;
    }

    const recordingId =
      sessionState.recordingId;

    if (!recordingId) {
      return;
    }

    const mimeType =
      chooseVideoMimeType();

    const options = {
      videoBitsPerSecond: 650000,
      ...(mimeType
        ? {
            mimeType,
          }
        : {}),
    };

    let recorder;

    try {
      recorder =
        new MediaRecorder(
          streamRef.current,
          options
        );

    } catch (recorderError) {
      setError(
        "Could not start this " +
          "phone camera: " +
          recorderError.message
      );

      pendingRecordingIdRef.current =
        "";

      return;
    }

    chunksRef.current = [];

    currentRecordingIdRef.current =
      recordingId;

    pendingRecordingIdRef.current =
      "";

    setUploadComplete(false);
    setRetryUpload(null);
    setError("");

    recorder.ondataavailable = (
      event
    ) => {
      if (
        event.data?.size > 0
      ) {
        chunksRef.current.push(
          event.data
        );
      }
    };

    recorder.onerror = (event) => {
      setError(
        event.error?.message ||
          "The phone recorder failed."
      );
    };

    recorder.onstop = async () => {
      setRecording(false);

      recorderRef.current = null;

      const blob = new Blob(
        chunksRef.current,
        {
          type:
            recorder.mimeType ||
            mimeType ||
            "video/webm",
        }
      );

      if (!blob.size) {
        setError(
          "The phone recording was empty. " +
            "Please set up this camera again."
        );

        return;
      }

      try {
        await uploadBlob(
          blob,
          recordingId
        );

      } catch {
        /*
         * uploadBlob stores the video in
         * retryUpload so the researcher
         * can retry without rerecording.
         */
      }
    };

    try {
      recorder.start(1000);

      recorderRef.current =
        recorder;

      setRecording(true);

    } catch (startError) {
      recorderRef.current = null;

      setError(
        "Could not start recording: " +
          startError.message
      );
    }
  };


  const handleSessionState = (
    latest
  ) => {
    setSession(latest);

    if (
      latest.status === "recording" &&
      latest.recordingId &&
      latest.recordingId !==
        currentRecordingIdRef.current &&
      latest.recordingId !==
        pendingRecordingIdRef.current &&
      !recorderRef.current
    ) {
      pendingRecordingIdRef.current =
        latest.recordingId;

      const startAt = Date.parse(
        latest.startedAt || ""
      );

      const delay =
        Number.isFinite(startAt)
          ? Math.max(
              0,
              startAt -
                Date.now()
            )
          : 0;

      window.clearTimeout(
        startTimerRef.current
      );

      startTimerRef.current =
        window.setTimeout(
          () =>
            startLocalRecorder(
              latest
            ),
          delay
        );
    }

    if (
      [
        "stopped",
        "completed",
        "cancelled",
      ].includes(
        latest.status
      )
    ) {
      window.clearTimeout(
        startTimerRef.current
      );

      pendingRecordingIdRef.current =
        "";

      if (
        recorderRef.current
          ?.state ===
        "recording"
      ) {
        recorderRef.current.stop();
      }
    }

    if (
      latest.status ===
      "cancelled"
    ) {
      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      setConnected(false);
    }
  };


  useEffect(() => {
    if (!connected) {
      return undefined;
    }

    const poll = async () => {
      try {
        const latest =
          await refreshSession();

        /*
         * A successful request means a
         * previous temporary connection
         * error is no longer relevant.
         */
        setPollError("");

        handleSessionState(
          latest
        );

      } catch (
        pollRequestError
      ) {
        /*
         * Do NOT put this into `error`.
         *
         * A single failed poll can simply
         * be a temporary Wi-Fi hiccup.
         */
        setPollError(
          pollRequestError.message
        );
      }
    };

    poll();

    const intervalId =
      window.setInterval(
        poll,
        500
      );

    return () =>
      window.clearInterval(
        intervalId
      );

  }, [
    connected,
    deviceRole,
  ]);


  useEffect(
    () => () => {
      window.clearTimeout(
        startTimerRef.current
      );

      if (
        recorderRef.current
          ?.state ===
        "recording"
      ) {
        recorderRef.current.stop();
      }

      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      wakeLockRef.current
        ?.release?.()
        .catch(
          () => {}
        );
    },
    []
  );


  const joinWithRole = async (
    requestedRole
  ) =>
    postJson(
      `${APIBASEURL}/` +
        `recording-sessions/` +
        `${normalizedSessionId}/join`,
      requestedRole
        ? {
            deviceRole:
              requestedRole,
          }
        : {}
    );


  const connectCamera = async () => {
    setError("");
    setPollError("");

    if (!normalizedSessionId) {
      setError(
        "Missing recording session ID."
      );

      return;
    }

    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      setError(
        "This browser does not support " +
          "camera recording. Try Safari " +
          "or Chrome on a newer phone."
      );

      return;
    }

    try {
      const cameraStream =
        await navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode:
                "environment",
              width: {
                ideal: 640,
              },
              height: {
                ideal: 480,
              },
              frameRate: {
                ideal: 24,
                max: 30,
              },
            },
            audio: false,
          });

      setStream(
        cameraStream
      );

      streamRef.current =
        cameraStream;

      let joined;

      const storedRole =
        localStorage.getItem(
          storageKey
        ) || "";

      try {
        joined =
          await joinWithRole(
            storedRole
          );

      } catch (joinError) {
        if (!storedRole) {
          throw joinError;
        }

        /*
         * The saved role might belong to
         * an expired/recreated session.
         * Remove it and ask the backend
         * for a new position.
         */
        localStorage.removeItem(
          storageKey
        );

        joined =
          await joinWithRole("");
      }

      const assignedRole =
        joined.assignedDeviceRole;

      if (!assignedRole) {
        throw new Error(
          "The backend did not assign " +
            "this phone a camera position."
        );
      }

      localStorage.setItem(
        storageKey,
        assignedRole
      );

      setDeviceRole(
        assignedRole
      );

      const ready =
        await postJson(
          `${APIBASEURL}/` +
            `recording-sessions/` +
            `${normalizedSessionId}/ready`,
          {
            deviceRole:
              assignedRole,
          }
        );

      setSession(ready);
      setConnected(true);
      setPollError("");

      await requestWakeLock();

    } catch (connectError) {
      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      streamRef.current = null;

      setStream(null);
      setConnected(false);

      setError(
        "Could not connect camera: " +
          connectError.message
      );
    }
  };


  const retryLastUpload = async () => {
    if (!retryUpload) {
      return;
    }

    try {
      await uploadBlob(
        retryUpload.blob,
        retryUpload.recordingId
      );

    } catch {
      /*
       * The failed upload remains saved
       * and Retry upload stays available.
       */
    }
  };


  const statusMessage = () => {
    if (error) {
      return error;
    }

    if (pollError) {
      return (
        "Temporary connection problem: " +
        pollError +
        ". Keep this page open while " +
        "MERLS reconnects."
      );
    }

    if (uploading) {
      return (
        "Uploading the video. " +
        "Keep this page open..."
      );
    }

    if (uploadComplete) {
      return (
        "Upload complete. Keep this " +
        "page open for another attempt, " +
        "or close it when the " +
        "researcher is finished."
      );
    }

    if (recording) {
      return (
        "Recording. Keep this page " +
        "open and keep the camera " +
        "pointed at the participant."
      );
    }

    if (connected) {
      return (
        "Camera connected and ready. " +
        "Waiting for the researcher " +
        "to start."
      );
    }

    return (
      "Tap Connect camera, allow " +
      "camera access, and then keep " +
      "this page open."
    );
  };


  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: 20,
        fontFamily:
          "Nunito, sans-serif",
        textAlign: "center",
      }}
    >
      <h1>
        MERLS Additional Camera
      </h1>

      <p>
        This phone records an
        additional view. It starts
        and stops automatically when
        the researcher controls the
        laptop.
      </p>

      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: recording
            ? "#ffe8e8"
            : pollError
              ? "#fff4dc"
              : "#eef6ff",
          fontWeight: 800,
          marginBottom: 16,
        }}
      >
        {recording
          ? "● RECORDING"
          : statusMessage()}
      </div>

      {!connected && (
        <button
          type="button"
          onClick={
            connectCamera
          }
          style={{
            padding:
              "14px 24px",
            fontSize: 18,
            fontWeight: 800,
            borderRadius: 10,
          }}
        >
          Connect camera
        </button>
      )}

      {stream && (
        <div
          style={{
            marginTop: 18,
          }}
        >
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              borderRadius: 12,
              background: "black",
            }}
          />

          <p>
            Camera position:{" "}
            <strong>
              {deviceRole ||
                "assigning..."}
            </strong>
          </p>
        </div>
      )}

      {session && (
        <p
          style={{
            overflowWrap:
              "anywhere",
          }}
        >
          Session{" "}
          {session.sessionId}
          {" — "}
          {session.readyCount}
          {" of "}
          {session.cameraCount}
          {" cameras ready"}
        </p>
      )}

      {error && (
        <p
          style={{
            color: "#b00020",
            fontWeight: 800,
          }}
        >
          {error}
        </p>
      )}

      {retryUpload && (
        <button
          type="button"
          onClick={
            retryLastUpload
          }
          disabled={uploading}
          style={{
            padding:
              "10px 18px",
            fontWeight: 800,
            marginTop: 8,
          }}
        >
          {uploading
            ? "Retrying..."
            : "Retry upload"}
        </button>
      )}

      <p
        style={{
          marginTop: 24,
          fontWeight: 700,
        }}
      >
        Do not lock the phone or close
        this page during recording or
        uploading.
      </p>
    </main>
  );
};


export default SideCamera;
