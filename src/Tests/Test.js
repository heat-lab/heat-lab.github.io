import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import "./Test.scss";

import AppBar from "@mui/material/AppBar";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import Question from "./Question";
import Repetition from "./Repetition";
import Instructions from "./Instructions";
import Practice from "./Practice";
import TranslationButton from "../Components/TranslationButton";
import AudioPermission from "./AudioPermission";
import ReinforcementPage from "./ReinforcementPage";
import CompletionPage from "./CompletionPage";
import GreenButton from "../Components/GreenButton";

import { APIBASEURL } from "../config";
import {
  isChineseLanguage,
  isEnglishLanguage,
} from "../utils/language";
import {
  buildRecordingBin,
} from "../utils/recordingBins";


const LAMBDAAPIENDPOINT =
  `${APIBASEURL}/audio-upload`;


const Test = ({
  type,
  language,
}) => {
  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    curId,
    setCurId,
  ] = useState(1);

  const [
    answers,
    setAnswers,
  ] = useState({});

  const [
    showReinforcementPage,
    setShowReinforcementPage,
  ] = useState(false);

  const [
    showPractice,
    setShowPractice,
  ] = useState(true);

  const [
    showAudioPermission,
    setShowAudioPermission,
  ] = useState(false);

  const [
    showInstructions,
    setShowInstructions,
  ] = useState(true);

  const [
    showChinese,
    setShowChinese,
  ] = useState(false);

  const [
    reinforcementID,
    setReinforcementID,
  ] = useState(0);

  const [
    audioBlobs,
    setAudioBlobs,
  ] = useState({});

  /*
   * Successfully uploaded repetition
   * URLs are kept here.
   *
   * If question 5 uploads correctly but
   * question 6 fails, retrying will not
   * upload question 5 again.
   */
  const [
    uploadedAudioUrls,
    setUploadedAudioUrls,
  ] = useState({});

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const navigate =
    useNavigate();

  const location =
    useLocation();

  const isChinese =
    isChineseLanguage(
      language
    );

  const isEnglish =
    isEnglishLanguage(
      language
    );


  const ReinforcementAudio = [
    [
      "https://non-question-links.s3.us-east-2.amazonaws.com/english-reinforcement1.m4a",
      "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-reinforcement1.m4a",
    ],
    [
      "https://non-question-links.s3.us-east-2.amazonaws.com/english-reinforcement2.m4a",
      "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-reinforcement2.m4a",
    ],
    [
      "https://non-question-links.s3.us-east-2.amazonaws.com/english-reinforcement3.m4a",
      "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-reinforcement3.m4a",
    ],
    [
      "https://non-question-links.s3.us-east-2.amazonaws.com/english-reinforcement4.m4a",
      "https://non-question-links.s3.us-east-2.amazonaws.com/chinese-reinforcement4.m4a",
    ],
  ];


  const audioLink =
    useRef("");


  const recordAnswer = (
    questionId,
    answerId
  ) => {
    if (
      curId ===
      Math.floor(
        questions.length / 4
      )
    ) {
      setShowReinforcementPage(
        true
      );

      setReinforcementID(0);

    } else if (
      curId ===
      Math.floor(
        questions.length / 2
      )
    ) {
      setShowReinforcementPage(
        true
      );

      setReinforcementID(1);

    } else if (
      curId ===
      Math.floor(
        (
          3 *
          questions.length
        ) / 4
      )
    ) {
      setShowReinforcementPage(
        true
      );

      setReinforcementID(2);
    }


    if (
      type === "matching" &&
      isChinese &&
      curId + 1 === 29
    ) {
      audioLink.current =
        (
          "https://non-question-links." +
          "s3.us-east-2.amazonaws.com/" +
          "chinese-quantifier-" +
          "instructions.m4a"
        );

      setShowInstructions(
        true
      );

      setShowPractice(
        true
      );

      setCurId(
        (previous) =>
          previous + 2
      );

    } else {
      setCurId(
        (previous) =>
          previous + 1
      );
    }


    console.log(
      "submitting question id:",
      curId + 1
    );

    setAnswers(
      (previous) => ({
        ...previous,
        [questionId]:
          answerId,
      })
    );
  };


  const recordAudioBlob = (
    questionId,
    blob
  ) => {
    if (
      !questionId ||
      !blob
    ) {
      console.error(
        "Missing required parameters:",
        {
          questionId,
          blob,
        }
      );

      return;
    }

    setAudioBlobs(
      (previous) => {
        const updatedBlobs = {
          ...previous,
          [questionId]:
            blob,
        };

        /*
         * In case a question is ever
         * recorded again, discard an old
         * uploaded URL for that question.
         */
        setUploadedAudioUrls(
          (
            previousUrls
          ) => {
            const updatedUrls = {
              ...previousUrls,
            };

            delete updatedUrls[
              questionId
            ];

            return updatedUrls;
          }
        );

        console.log(
          "Current Audio Blobs:",
          Object.keys(
            updatedBlobs
          )
        );

        return updatedBlobs;
      }
    );
  };


  const uploadBlobToLambda =
    async (
      blob,
      questionId
    ) => {
      if (
        !blob?.blob
      ) {
        throw new Error(
          `Question ${questionId} ` +
            "does not contain an " +
            "audio recording."
        );
      }

      const reader =
        new FileReader();

      const base64Data =
        await new Promise(
          (
            resolve,
            reject
          ) => {
            reader.onload =
              () =>
                resolve(
                  reader.result
                );

            reader.onerror =
              reject;

            reader.readAsDataURL(
              blob.blob
            );
          }
        );

      const requestBody = {
        fileType:
          blob.blob.type ||
          "audio/webm",

        audioData:
          base64Data,

        userId:
          localStorage.getItem(
            "username"
          ),

        questionId,

        bucketName:
          buildRecordingBin({
            isChinese,
            task:
              type,
            source:
              "system-recording",
          }),
      };


      const response =
        await fetch(
          LAMBDAAPIENDPOINT,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );


      let data = {};

      try {
        data =
          await response.json();

      } catch {
        data = {};
      }


      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Upload failed (${response.status})`
        );
      }


      if (!data.url) {
        throw new Error(
          "The backend did not " +
            "return an audio URL."
        );
      }


      return data.url;
    };


  const submitAnswers =
    async () => {
      if (submitting) {
        return;
      }

      setSubmitting(true);
      setSubmitError("");

      try {
        const username =
          localStorage.getItem(
            "username"
          );

        if (!username) {
          throw new Error(
            "No participant is logged in."
          );
        }


        const endpoint =
          `${APIBASEURL}/submissions`;

        let requestBody;


        if (
          type === "matching"
        ) {
          requestBody = {
            participantId:
              username,

            userAns:
              answers,

            isEN:
              !isChinese,

            isAudioTest:
              false,

            audioSubmissionList:
              null,

            submissionType:
              "matching",
          };

        } else if (
          type === "repetition"
        ) {
          const recordings =
            Object.entries(
              audioBlobs
            );

          if (
            recordings.length === 0
          ) {
            throw new Error(
              "No repetition recordings " +
                "were found. The test " +
                "cannot be submitted."
            );
          }


          /*
           * Copy previously successful
           * upload URLs so a retry only
           * uploads files that are still
           * missing.
           */
          const audioUrls = {
            ...uploadedAudioUrls,
          };


          for (
            const [
              questionId,
              blob,
            ]
            of recordings
          ) {
            if (
              audioUrls[
                questionId
              ]
            ) {
              continue;
            }


            try {
              const s3Url =
                await uploadBlobToLambda(
                  blob,
                  questionId
                );

              audioUrls[
                questionId
              ] =
                s3Url.split(
                  "?"
                )[0];

              /*
               * Save progress after every
               * successful upload.
               */
              setUploadedAudioUrls({
                ...audioUrls,
              });

            } catch (
              error
            ) {
              throw new Error(
                `Recording for question ` +
                  `${questionId} failed ` +
                  `to upload. ${error.message}`
              );
            }
          }


          const missingQuestions =
            recordings
              .map(
                ([questionId]) =>
                  questionId
              )
              .filter(
                (questionId) =>
                  !audioUrls[
                    questionId
                  ]
              );


          if (
            missingQuestions.length >
            0
          ) {
            throw new Error(
              "These recordings have not " +
                "uploaded successfully: " +
                missingQuestions.join(
                  ", "
                )
            );
          }


          requestBody = {
            participantId:
              username,

            audioSubmissionList:
              audioUrls,

            isEN:
              !isChinese,

            isAudioTest:
              true,

            userAns:
              null,

            submissionType:
              "repetition",
          };

        } else {
          throw new Error(
            `Unsupported test type: ${type}`
          );
        }


        console.log(
          "Submitting data:",
          requestBody
        );


        const response =
          await fetch(
            endpoint,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  requestBody
                ),
            }
          );


        if (
          !response.ok
        ) {
          let errorMessage =
            "Failed to submit answers.";

          try {
            const errorData =
              await response.json();

            errorMessage =
              errorData.error ||
              errorData.message ||
              errorMessage;

          } catch {
            // Keep default error.
          }

          throw new Error(
            errorMessage
          );
        }


        const queryParam =
          `?cn-zw=${
            showChinese
              ? "true"
              : "false"
          }`;

        navigate(
          `/test-selection${queryParam}`
        );

      } catch (error) {
        console.error(
          "Failed to submit answers:",
          error
        );

        setSubmitError(
          error.message ||
            "Failed to submit answers."
        );

        /*
         * CompletionPage awaits this
         * function, so rethrowing lets
         * it unlock its Submit button.
         */
        throw error;

      } finally {
        setSubmitting(false);
      }
    };


  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    const languageParam =
      params.get(
        "cn-zw"
      );

    setShowChinese(
      languageParam ===
        "true"
    );
  }, [location]);


  useEffect(() => {
    async function fetchQuestionList() {
      try {
        const response =
          await fetch(
            `${APIBASEURL}/questions?language=${encodeURIComponent(
              language
            )}&type=${encodeURIComponent(
              type
            )}`,
            {
              method:
                "GET",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );


        const questionList =
          await response.json();


        if (!response.ok) {
          throw new Error(
            questionList.error ||
              (
                "Could not load " +
                "questions."
              )
          );
        }


        console.log(
          "getting questions"
        );

        setQuestions(
          questionList
        );

      } catch (error) {
        console.error(
          "Question loading failed:",
          error
        );
      }
    }


    fetchQuestionList();

  }, [
    language,
    type,
  ]);


  useEffect(() => {
    if (
      type === "matching"
    ) {
      audioLink.current =
        isChinese
          ? (
              "https://non-question-links." +
              "s3.us-east-2.amazonaws.com/" +
              "chinese-matching-" +
              "instructions.m4a"
            )
          : (
              "https://non-question-links." +
              "s3.us-east-2.amazonaws.com/" +
              "english-matching-" +
              "instructions.m4a"
            );

    } else if (
      type === "repetition"
    ) {
      audioLink.current =
        isChinese
          ? (
              "https://non-question-links." +
              "s3.us-east-2.amazonaws.com/" +
              "chinese-repetition-" +
              "instructions.m4a"
            )
          : (
              "https://non-question-links." +
              "s3.us-east-2.amazonaws.com/" +
              "english-repetition-" +
              "instructions.m4a"
            );

      setShowAudioPermission(
        true
      );
    }

  }, [
    type,
    isChinese,
  ]);


  const completed =
    curId ===
    questions.length;


  if (
    questions.length > 0
  ) {
    return (
      <div id="testPage">
        <AppBar
          className={
            "titleContainer"
          }
        >
          <progress
            id="progress"
            value={
              curId - 1
            }
            max={
              questions.length -
              1
            }
          />

          <TranslationButton
            showChinese={
              showChinese
            }
            setShowChinese={
              setShowChinese
            }
          />
        </AppBar>


        {localStorage.getItem(
          "username"
        ) === "lucy" ? (
          <div
            className={
              "debugAdvanceButton"
            }
          >
            <GreenButton
              textEnglish={
                "next part"
              }
              onClick={() => {
                setCurId(
                  (previous) =>
                    previous + 1
                );
              }}
            />
          </div>
        ) : null}


        <Container
          className={
            "testContainer"
          }
        >
          {completed ? (
            <div>
              <CompletionPage
                showChinese={
                  showChinese
                }
                imageLink={
                  "https://non-question-links.s3.us-east-2.amazonaws.com/puppy3.gif"
                }
                submitAnswers={
                  submitAnswers
                }
                audioLink={
                  ReinforcementAudio[3][
                    isEnglish
                      ? 0
                      : 1
                  ]
                }
                uploadsInProgress={
                  submitting
                    ? 1
                    : 0
                }
              />

              {submitError && (
                <p
                  style={{
                    color:
                      "#b00020",
                    fontWeight:
                      700,
                    textAlign:
                      "center",
                    maxWidth:
                      600,
                    margin:
                      "0 auto 30px",
                  }}
                >
                  {showChinese
                    ? (
                        "提交失败。请检查连接并再次点击提交。 "
                      )
                    : (
                        "Submission failed. " +
                        "Check the message below " +
                        "and click Submit Answers " +
                        "again."
                      )}

                  <br />

                  {
                    submitError
                  }
                </p>
              )}
            </div>

          ) : showReinforcementPage ? (
            <ReinforcementPage
              showChinese={
                showChinese
              }
              audioLink={
                ReinforcementAudio[
                  reinforcementID
                ][
                  isEnglish
                    ? 0
                    : 1
                ]
              }
              imageLink={
                "https://non-question-links.s3.us-east-2.amazonaws.com/puppy3.gif"
              }
              setShowReinforcement={
                setShowReinforcementPage
              }
            />

          ) : showAudioPermission ? (
            <AudioPermission
              setShowAudioPermission={
                setShowAudioPermission
              }
              showChinese={
                showChinese
              }
            />

          ) : showInstructions ? (
            <div>
              <Instructions
                showChinese={
                  showChinese
                }
                audioLink={
                  audioLink.current
                }
                setShowInstructions={
                  setShowInstructions
                }
              />
            </div>

          ) : showPractice ? (
            <Practice
              setShowPractice={
                setShowPractice
              }
              type={type}
              language={
                curId > 1
                  ? "second"
                  : language
              }
              question={
                questions[
                  curId - 1
                ]
              }
              showChinese={
                showChinese
              }
              recordAudioBlob={
                recordAudioBlob
              }
            />

          ) : type ===
            "matching" ? (
            <Question
              curQuestion={
                questions[
                  curId
                ]
              }
              recordAnswer={
                recordAnswer
              }
              showChinese={
                showChinese
              }
            />

          ) : type ===
            "repetition" ? (
            <Repetition
              curQuestion={
                questions[
                  curId
                ]
              }
              recordAnswer={
                recordAnswer
              }
              showChinese={
                showChinese
              }
              recordAudioBlob={
                recordAudioBlob
              }
            />

          ) : (
            <p>
              page does not exist
            </p>
          )}
        </Container>
      </div>
    );
  }


  return (
    <div
      className={
        "loadingContainer"
      }
    >
      <CircularProgress
        size={75}
        thickness={3}
        variant="indeterminate"
      />
    </div>
  );
};


export default Test;
