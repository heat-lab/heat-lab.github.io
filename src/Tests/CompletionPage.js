import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import "./Test.scss";

import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import IconButton from "@mui/material/IconButton";

import GreenButton from "../Components/GreenButton";

import confetti from "canvas-confetti";


let instructionAudio;


const CompletionPage = ({
  showChinese,
  audioLink,
  imageLink,
  submitAnswers,
  uploadsInProgress = 0,
}) => {
  const [
    audioPlaying,
    setAudioPlaying,
  ] = useState(false);

  const [
    replay,
    setReplay,
  ] = useState(false);

  const [
    finishedListening,
    setFinishedListening,
  ] = useState(false);

  const [
    countDown,
    setCountDown,
  ] = useState(3);

  const [
    confettiCooldown,
    setConfettiCooldown,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const timeoutRef =
    useRef(null);


  useEffect(() => {
    clearTimeout(
      timeoutRef.current
    );

    if (
      countDown > 0
    ) {
      timeoutRef.current =
        setTimeout(() => {
          setCountDown(
            (previous) =>
              previous - 1
          );
        }, 1000);

    } else {
      instructionAudio =
        new Audio(
          audioLink
        );

      instructionAudio.addEventListener(
        "play",
        () => {
          setAudioPlaying(
            true
          );
        }
      );

      instructionAudio.addEventListener(
        "ended",
        () => {
          setAudioPlaying(
            false
          );

          setFinishedListening(
            true
          );
        }
      );

      instructionAudio
        .play()
        .catch((error) => {
          console.error(
            "Could not play completion audio:",
            error
          );

          setAudioPlaying(
            false
          );

          /*
           * A playback problem should not
           * trap the researcher on this
           * screen.
           */
          setFinishedListening(
            true
          );
        });
    }


    return () => {
      clearTimeout(
        timeoutRef.current
      );
    };

  }, [
    countDown,
    audioLink,
  ]);


  useEffect(() => {
    if (
      countDown < 1 &&
      replay
    ) {
      setReplay(false);

      if (
        instructionAudio
      ) {
        instructionAudio.pause();
      }

      instructionAudio =
        new Audio(
          audioLink
        );

      instructionAudio.addEventListener(
        "play",
        () => {
          setAudioPlaying(
            true
          );
        }
      );

      instructionAudio.addEventListener(
        "ended",
        () => {
          setAudioPlaying(
            false
          );
        }
      );

      instructionAudio
        .play()
        .catch((error) => {
          console.error(
            "Could not replay completion audio:",
            error
          );

          setAudioPlaying(
            false
          );
        });
    }

  }, [
    replay,
    countDown,
    audioLink,
  ]);


  useEffect(() => {
    confetti({
      particleCount:
        300,
      spread:
        200,
      origin: {
        x: 0.5,
        y: 0.5,
      },
    });

    return () => {
      if (
        instructionAudio
      ) {
        instructionAudio.pause();
      }
    };
  }, []);


  const handleSubmit =
    async () => {
      if (
        loading ||
        uploadsInProgress > 0
      ) {
        return;
      }

      setLoading(true);
      setSubmitError("");

      try {
        /*
         * Await the parent submission.
         * This is important because audio
         * and video uploads may still be
         * finishing.
         */
        await submitAnswers();

      } catch (error) {
        console.error(
          "Submission failed:",
          error
        );

        setSubmitError(
          error.message ||
            "Submission failed. Please try again."
        );

      } finally {
        /*
         * On successful submission the
         * page normally navigates away.
         * On failure this unlocks the
         * button so it can be retried.
         */
        setLoading(false);
      }
    };


  return (
    <div>
      <div
        className={
          "confettiContainer"
        }
      >
        <GreenButton
          className={
            "confettiButton"
          }
          showChinese={
            showChinese
          }
          textChinese={
            "点击庆祝！🎉"
          }
          textEnglish={
            "Click to Celebrate! 🎉"
          }
          onClick={() => {
            if (
              confettiCooldown
            ) {
              confetti({
                particleCount:
                  100,
                spread:
                  100,
                origin: {
                  x:
                    0.3 +
                    Math.random() *
                      (
                        0.7 -
                        0.3
                      ),
                  y:
                    0.3 +
                    Math.random() *
                      (
                        0.7 -
                        0.3
                      ),
                },
              });

              setConfettiCooldown(
                false
              );

              setTimeout(
                () => {
                  setConfettiCooldown(
                    true
                  );
                },
                500
              );
            }
          }}
        />
      </div>


      <div
        className={
          "indicator"
        }
      >
        {audioPlaying ? (
          <div>
            <IconButton
              aria-label="pause"
              disabled
            >
              <PauseCircleIcon
                color="primary"
                className={
                  "pauseButton disabled"
                }
              />
            </IconButton>

            <p
              className={
                "actionText"
              }
            >
              {showChinese
                ? "播放中..."
                : "Playing..."}
            </p>
          </div>

        ) : (
          <div>
            <IconButton
              aria-label="play"
              style={{
                marginBottom:
                  "0",
              }}
              onClick={() => {
                if (
                  countDown > 0
                ) {
                  setCountDown(
                    0
                  );

                } else {
                  setReplay(
                    true
                  );
                }
              }}
            >
              <PlayCircleIcon
                color="primary"
                className={
                  "pauseButton"
                }
              />
            </IconButton>

            {countDown > 0 ? (
              <p
                className={
                  "actionText"
                }
              >
                {showChinese
                  ? (
                      <>
                        {countDown}
                        {" 秒内播放音频"}
                      </>
                    )
                  : (
                      <>
                        {
                          "Audio playing in "
                        }
                        {countDown}
                        {
                          " second(s)"
                        }
                      </>
                    )}
              </p>

            ) : (
              <p
                className={
                  "actionText"
                }
              >
                {showChinese
                  ? "再听一遍吗?"
                  : "Listen again?"}
              </p>
            )}
          </div>
        )}
      </div>


      <div
        className={
          "puppyContainer"
        }
      >
        <img
          className={
            "instructionPuppy"
          }
          src={imageLink}
          alt="puppy animation"
        />
      </div>


      <div
        className={
          "submitButtonContainer"
        }
      >
        <GreenButton
          showChinese={
            showChinese
          }
          textEnglish={
            loading
              ? "Submitting..."
              : "Submit Answers"
          }
          textChinese={
            loading
              ? "提交中..."
              : "提交答案"
          }
          disabled={
            loading ||
            uploadsInProgress > 0
          }
          onClick={
            handleSubmit
          }
        />
      </div>


      {uploadsInProgress > 0 && (
        <p
          style={{
            textAlign:
              "center",
            fontWeight:
              700,
          }}
        >
          {showChinese
            ? (
                "正在等待录音或视频上传完成..."
              )
            : (
                "Waiting for recordings " +
                "to finish uploading..."
              )}
        </p>
      )}


      {submitError && (
        <p
          style={{
            color:
              "#b00020",
            textAlign:
              "center",
            fontWeight:
              700,
            maxWidth:
              600,
            margin:
              "0 auto 30px",
          }}
        >
          {showChinese
            ? (
                "提交失败。请检查连接后重试。 "
              )
            : (
                "Submission failed. " +
                "Please check the connection " +
                "and try again. "
              )}

          {submitError}
        </p>
      )}


      {!finishedListening && (
        <p
          style={{
            textAlign:
              "center",
            opacity:
              0.7,
          }}
        >
          {showChinese
            ? "完成提示音正在播放。"
            : (
                "The completion message " +
                "is playing."
              )}
        </p>
      )}
    </div>
  );
};


export default CompletionPage;
