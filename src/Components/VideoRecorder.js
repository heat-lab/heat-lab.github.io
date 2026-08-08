import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { APIBASEURL } from "../config";


const CAMERA_OPTIONS = [
  {
    value: 0,
    label: "No video (audio only)",
  },
  {
    value: 1,
    label: "Laptop camera only",
  },
  {
    value: 2,
    label: "Laptop + 1 phone camera",
  },
  {
    value: 3,
    label: "Laptop + 2 phone cameras",
  },
  {
    value: 4,
    label: "Laptop + 3 phone cameras",
  },
];


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
        MediaRecorder.isTypeSupported(choice)
    ) || ""
  );
};


const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });


const sleep = (milliseconds) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });


const VideoRecorder = forwardRef(
  (
    {
      participantId,
      questionId,
      testType = "story-retell",
      language = "EN",
      showChinese = false,
    },
    ref
  ) => {
    const [
      cameraCount,
      setCameraCount,
    ] = useState(0);

    const [
      session,
      setSession,
    ] = useState(null);

    const [
      stream,
      setStream,
    ] = useState(null);

    const [
      settingUp,
      setSettingUp,
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
      error,
      setError,
    ] = useState("");

    const [
      message,
      setMessage,
    ] = useState("");

    const [
      lastFailedUpload,
      setLastFailedUpload,
    ] = useState(null);

    const previewRef = useRef(null);
    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const sessionRef = useRef(null);

    const uploadPromiseRef = useRef(
      Promise.resolve()
    );

    const startTimerRef = useRef(null);


    const mergeSession = (
      nextSession
    ) => {
      setSession((previous) => {
        const merged = {
          ...(previous || {}),
          ...(nextSession || {}),
        };

        sessionRef.current = merged;

        return merged;
      });
    };


    useEffect(() => {
      sessionRef.current = session;
    }, [session]);


    useEffect(() => {
      streamRef.current = stream;

      if (previewRef.current) {
        previewRef.current.srcObject =
          stream || null;
      }
    }, [stream]);


    useEffect(() => {
      if (!session?.sessionId) {
        return undefined;
      }

      const poll = async () => {
        try {
          const latest =
            await requestJson(
              `${APIBASEURL}/recording-sessions/${session.sessionId}`
            );

          mergeSession(latest);

        } catch (pollError) {
          setError(
            pollError.message
          );
        }
      };

      poll();

      const intervalId =
        window.setInterval(
          poll,
          750
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };

    }, [session?.sessionId]);


    useEffect(
      () => () => {
        window.clearTimeout(
          startTimerRef.current
        );

        if (
          recorderRef.current?.state ===
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
      },
      []
    );


    const stopLocalStream = () => {
      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      streamRef.current = null;

      setStream(null);
    };


    const changeCameraCount = (
      event
    ) => {
      const nextCount = Number(
        event.target.value
      );

      setCameraCount(
        nextCount
      );

      setError("");
      setMessage("");
      setSession(null);
      setLastFailedUpload(null);

      sessionRef.current = null;

      uploadPromiseRef.current =
        Promise.resolve();

      stopLocalStream();
    };


    const setupCameras = async () => {
      setError("");
      setMessage("");
      setLastFailedUpload(null);

      if (cameraCount === 0) {
        setSession(null);

        sessionRef.current = null;

        uploadPromiseRef.current =
          Promise.resolve();

        stopLocalStream();

        setMessage(
          "Video is turned off. " +
            "The participant can " +
            "continue with audio only."
        );

        return;
      }

      if (!participantId) {
        setError(
          "No participant is logged in."
        );

        return;
      }

      setSettingUp(true);

      try {
        stopLocalStream();

        const cameraStream =
          await navigator.mediaDevices
            .getUserMedia({
              video: {
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

        const created =
          await postJson(
            `${APIBASEURL}/recording-sessions`,
            {
              participantId,
              testType,
              language,
              questionId,
              cameraCount,
              frontendBaseUrl:
                window.location.origin,
            }
          );

        mergeSession(
          created
        );

        const ready =
          await postJson(
            `${APIBASEURL}/recording-sessions/${created.sessionId}/ready`,
            {
              deviceRole: "main",
            }
          );

        mergeSession({
          ...created,
          ...ready,
        });

        setMessage(
          cameraCount === 1
            ? (
                "Laptop camera is ready. " +
                "The normal answer button " +
                "will start both audio " +
                "and video."
              )
            : (
                "Laptop camera is ready. " +
                "Connect every phone " +
                "camera shown below."
              )
        );

      } catch (setupError) {
        stopLocalStream();

        setError(
          "Camera setup failed: " +
            setupError.message
        );

      } finally {
        setSettingUp(false);
      }
    };


    const uploadMainBlob = async (
      blob,
      recordingSession
    ) => {
      setUploading(true);
      setError("");
      setLastFailedUpload(null);

      try {
        const mediaData =
          await blobToDataUrl(
            blob
          );

        const uploaded =
          await postJson(
            `${APIBASEURL}/media-upload`,
            {
              mediaData,
              filetype:
                blob.type ||
                "video/webm",
              sessionId:
                recordingSession.sessionId,
              deviceRole:
                "main",
              recordingId:
                recordingSession.recordingId,
            }
          );

        setMessage(
          "Laptop video uploaded " +
            "successfully."
        );

        const latest =
          await requestJson(
            `${APIBASEURL}/recording-sessions/${recordingSession.sessionId}`
          );

        mergeSession(
          latest
        );

        return uploaded;

      } catch (uploadError) {
        setLastFailedUpload({
          blob,
          session:
            recordingSession,
        });

        setError(
          "Laptop video upload failed: " +
            uploadError.message
        );

        throw uploadError;

      } finally {
        setUploading(false);
      }
    };


    const retryMainUpload =
      async () => {
        if (!lastFailedUpload) {
          return;
        }

        uploadPromiseRef.current =
          uploadMainBlob(
            lastFailedUpload.blob,
            lastFailedUpload.session
          );

        try {
          await uploadPromiseRef.current;

        } catch {
          // Error is already displayed.
        }
      };


    const startLocalRecorderAt = (
      recordingSession
    ) =>
      new Promise(
        (
          resolve,
          reject
        ) => {
          const activeStream =
            streamRef.current;

          if (!activeStream) {
            reject(
              new Error(
                "The laptop camera is " +
                  "not set up."
              )
            );

            return;
          }

          const startTime =
            Date.parse(
              recordingSession.startedAt ||
                ""
            );

          const delay =
            Number.isFinite(
              startTime
            )
              ? Math.max(
                  0,
                  startTime -
                    Date.now()
                )
              : 0;

          window.clearTimeout(
            startTimerRef.current
          );

          startTimerRef.current =
            window.setTimeout(
              () => {
                try {
                  const mimeType =
                    chooseVideoMimeType();

                  const options = {
                    videoBitsPerSecond:
                      700000,
                    ...(mimeType
                      ? {
                          mimeType,
                        }
                      : {}),
                  };

                  const recorder =
                    new MediaRecorder(
                      activeStream,
                      options
                    );

                  chunksRef.current = [];

                  let resolveUpload;
                  let rejectUpload;

                  uploadPromiseRef.current =
                    new Promise(
                      (
                        uploadResolve,
                        uploadReject
                      ) => {
                        resolveUpload =
                          uploadResolve;

                        rejectUpload =
                          uploadReject;
                      }
                    );

                  recorder.ondataavailable =
                    (event) => {
                      if (
                        event.data
                          ?.size > 0
                      ) {
                        chunksRef.current.push(
                          event.data
                        );
                      }
                    };

                  recorder.onerror =
                    (event) => {
                      const recorderError =
                        event.error ||
                        new Error(
                          "Laptop recorder failed"
                        );

                      setError(
                        recorderError.message
                      );

                      rejectUpload(
                        recorderError
                      );
                    };

                  recorder.onstop =
                    async () => {
                      setRecording(
                        false
                      );

                      const blob =
                        new Blob(
                          chunksRef.current,
                          {
                            type:
                              recorder.mimeType ||
                              mimeType ||
                              "video/webm",
                          }
                        );

                      try {
                        const result =
                          await uploadMainBlob(
                            blob,
                            recordingSession
                          );

                        resolveUpload(
                          result
                        );

                      } catch (
                        uploadError
                      ) {
                        rejectUpload(
                          uploadError
                        );
                      }
                    };

                  recorder.start(
                    1000
                  );

                  recorderRef.current =
                    recorder;

                  setRecording(
                    true
                  );

                  setMessage(
                    "Recording video from " +
                      "the laptop camera."
                  );

                  resolve();

                } catch (
                  recorderError
                ) {
                  reject(
                    recorderError
                  );
                }
              },
              delay
            );
        }
      );


    const startRecording =
      async () => {
        if (
          cameraCount === 0
        ) {
          return {
            videoEnabled:
              false,
          };
        }

        if (
          !sessionRef.current
            ?.sessionId ||
          !streamRef.current
        ) {
          throw new Error(
            "The researcher must choose " +
              "a video option and click " +
              "Set up cameras first."
          );
        }

        const latest =
          await requestJson(
            `${APIBASEURL}/recording-sessions/${sessionRef.current.sessionId}`
          );

        mergeSession(
          latest
        );

        if (
          !latest.allReady
        ) {
          throw new Error(
            `Only ${latest.readyCount} ` +
              `of ${latest.cameraCount} ` +
              "required cameras are ready."
          );
        }

        const started =
          await postJson(
            `${APIBASEURL}/recording-sessions/${latest.sessionId}/start`,
            {
              questionId,
            }
          );

        mergeSession(
          started
        );

        await startLocalRecorderAt(
          started
        );

        return {
          videoEnabled:
            true,
          session:
            started,
        };
      };


    const stopRecording =
      async () => {
        if (
          cameraCount === 0
        ) {
          return;
        }

        const current =
          sessionRef.current;

        if (
          !current?.sessionId
        ) {
          return;
        }

        try {
          const stopped =
            await postJson(
              `${APIBASEURL}/recording-sessions/${current.sessionId}/stop`
            );

          mergeSession(
            stopped
          );

        } catch (
          stopError
        ) {
          setError(
            stopError.message
          );

          throw stopError;

        } finally {
          if (
            recorderRef.current
              ?.state ===
            "recording"
          ) {
            recorderRef.current.stop();
          }
        }
      };


    const waitForUpload =
      async () => {
        if (
          cameraCount === 0
        ) {
          return;
        }

        /*
         * First wait for the laptop's
         * own upload.
         */
        await uploadPromiseRef.current;

        const current =
          sessionRef.current;

        if (
          !current?.sessionId
        ) {
          return;
        }

        setMessage(
          "Waiting for all camera " +
            "videos to finish uploading..."
        );

        /*
         * Phones upload independently.
         * Wait until the backend confirms
         * that every required camera has
         * uploaded.
         */
        const timeoutMs =
          90 * 1000;

        const deadline =
          Date.now() +
          timeoutMs;

        let latest =
          current;

        while (
          Date.now() <
          deadline
        ) {
          latest =
            await requestJson(
              `${APIBASEURL}/recording-sessions/${current.sessionId}`
            );

          mergeSession(
            latest
          );

          if (
            latest.allUploaded ||
            latest.status ===
              "completed"
          ) {
            setMessage(
              "All required videos " +
                "uploaded successfully."
            );

            setError("");

            return;
          }

          await sleep(
            750
          );
        }

        const timeoutError =
          new Error(
            "The laptop finished uploading, " +
              "but one or more phone cameras " +
              "have not finished. Check each " +
              "phone for an upload error and " +
              "use Retry upload if shown."
          );

        setError(
          timeoutError.message
        );

        throw timeoutError;
      };


    useImperativeHandle(
      ref,
      () => ({
        startRecording,
        stopRecording,
        waitForUpload,
        isVideoEnabled: () =>
          cameraCount > 0,
      })
    );


    const copyJoinLink =
      async () => {
        if (
          !session?.joinUrl
        ) {
          return;
        }

        try {
          await navigator.clipboard
            .writeText(
              session.joinUrl
            );

          setMessage(
            "Phone camera link copied."
          );

        } catch {
          window.prompt(
            "Copy this phone camera link:",
            session.joinUrl
          );
        }
      };


    const additionalNeeded =
      Math.max(
        0,
        (
          session?.cameraCount ||
          0
        ) - 1
      );

    const additionalJoined =
      Math.max(
        0,
        (
          session?.joinedCount ||
          0
        ) - 1
      );

    const additionalReady =
      Math.max(
        0,
        (
          session?.readyCount ||
          0
        ) - 1
      );


    return (
      <details
        style={{
          marginTop: 24,
          padding: 16,
          border:
            "2px solid #1976d2",
          borderRadius: 12,
          background:
            "#f7fbff",
          textAlign:
            "left",
        }}
      >
        <summary
          style={{
            cursor:
              "pointer",
            fontWeight:
              800,
            fontSize:
              18,
          }}
        >
          {showChinese
            ? "研究人员：可选视频设置"
            : (
                "Researcher: Optional " +
                "video setup"
              )}
        </summary>

        <p>
          {showChinese
            ? (
                "视频不是必需的。选择摄像头数量，" +
                "然后点击设置。参与者仍然只需要" +
                "使用正常的录音按钮。"
              )
            : (
                "Video is optional. " +
                "Choose the total number " +
                "of cameras, then click " +
                "Set up cameras. The " +
                "participant still uses " +
                "the normal answer-" +
                "recording button."
              )}
        </p>

        <label
          style={{
            display:
              "block",
            fontWeight:
              700,
            marginBottom:
              8,
          }}
        >
          Total cameras

          <select
            value={
              cameraCount
            }
            onChange={
              changeCameraCount
            }
            disabled={
              recording ||
              uploading
            }
            style={{
              display:
                "block",
              marginTop:
                6,
              padding:
                8,
              width:
                "100%",
            }}
          >
            {CAMERA_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={
            setupCameras
          }
          disabled={
            settingUp ||
            recording ||
            uploading
          }
          style={{
            padding:
              "10px 16px",
            fontWeight:
              700,
          }}
        >
          {settingUp
            ? "Setting up..."
            : "Set up cameras"}
        </button>

        {stream && (
          <div
            style={{
              marginTop:
                16,
            }}
          >
            <p
              style={{
                fontWeight:
                  700,
                marginBottom:
                  6,
              }}
            >
              Laptop camera preview
            </p>

            <video
              ref={
                previewRef
              }
              autoPlay
              playsInline
              muted
              style={{
                width:
                  "min(100%, 360px)",
                borderRadius:
                  10,
                background:
                  "black",
              }}
            />
          </div>
        )}

        {session && (
          <div
            style={{
              marginTop:
                16,
            }}
          >
            <p>
              <strong>
                Session:
              </strong>{" "}
              {
                session.sessionId
              }
            </p>

            <p>
              <strong>
                Laptop:
              </strong>{" "}
              {
                session.devices
                  ?.find(
                    (device) =>
                      device.role ===
                      "main"
                  )?.ready
                  ? "Ready ✓"
                  : "Not ready"
              }
            </p>

            {
              additionalNeeded >
                0 && (
                <div>
                  <p>
                    <strong>
                      Additional cameras:
                    </strong>{" "}
                    {
                      additionalReady
                    }{" "}
                    ready of{" "}
                    {
                      additionalNeeded
                    }{" "}
                    required (
                    {
                      additionalJoined
                    }{" "}
                    connected)
                  </p>

                  <ol>
                    <li>
                      Scan this same QR
                      code on every phone
                      or tablet.
                    </li>

                    <li>
                      On each device, tap
                      Connect camera.
                    </li>

                    <li>
                      Keep every phone
                      page open during
                      the response.
                    </li>
                  </ol>

                  {
                    session.qrCodeDataUrl &&
                    (
                      <img
                        src={
                          session.qrCodeDataUrl
                        }
                        alt={
                          "QR code for " +
                          "connecting an " +
                          "additional camera"
                        }
                        style={{
                          width:
                            220,
                          height:
                            220,
                          background:
                            "white",
                        }}
                      />
                    )
                  }

                  <div
                    style={{
                      overflowWrap:
                        "anywhere",
                      marginTop:
                        8,
                    }}
                  >
                    <a
                      href={
                        session.joinUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {
                        session.joinUrl
                      }
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={
                      copyJoinLink
                    }
                    style={{
                      marginTop:
                        8,
                    }}
                  >
                    Copy phone link
                  </button>
                </div>
              )
            }

            <p
              style={{
                fontWeight:
                  800,
              }}
            >
              {
                session.allReady
                  ? (
                      "All required cameras " +
                      "are ready. The " +
                      "participant may start " +
                      "the answer."
                    )
                  : (
                      "Waiting for every " +
                      "required camera to " +
                      "become ready."
                    )
              }
            </p>

            <p>
              <strong>
                Status:
              </strong>{" "}
              {
                session.status
              }

              {
                recording
                  ? " — recording"
                  : ""
              }

              {
                uploading
                  ? (
                      " — uploading " +
                      "laptop video"
                    )
                  : ""
              }
            </p>

            {
              session.status ===
                "completed" && (
                <p
                  style={{
                    color:
                      "green",
                    fontWeight:
                      800,
                  }}
                >
                  All required videos
                  uploaded successfully.
                  Another attempt can be
                  recorded without
                  reconnecting the phones.
                </p>
              )
            }
          </div>
        )}

        {message && (
          <p
            style={{
              color:
                "#0d47a1",
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              color:
                "#b00020",
              fontWeight:
                700,
            }}
          >
            {error}
          </p>
        )}

        {lastFailedUpload && (
          <button
            type="button"
            onClick={
              retryMainUpload
            }
            disabled={
              uploading
            }
          >
            Retry laptop video upload
          </button>
        )}
      </details>
    );
  }
);


VideoRecorder.displayName =
  "VideoRecorder";


export default VideoRecorder;
