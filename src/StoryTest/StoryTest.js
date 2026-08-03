import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import PauseCircleIcon from (
  "@mui/icons-material/PauseCircle"
);
import PlayCircleIcon from (
  "@mui/icons-material/PlayCircle"
);
import IconButton from (
  "@mui/material/IconButton"
);
import AppBar from "@mui/material/AppBar";
import CircularProgress from (
  "@mui/material/CircularProgress"
);
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import GreenButton from (
  "../Components/GreenButton"
);
import TranslationButton from (
  "../Components/TranslationButton"
);
import Confirmation from (
  "../Components/Confirmation"
);
import Story from "./Story";
import Retell from "./Retell";
import Questions from "./Questions";
import Instructions from "./Instructions";
import CompletionPage from (
  "../Tests/CompletionPage"
);
import AudioPermission from (
  "../Tests/AudioPermission"
);
import { APIBASEURL } from "../config";
import { buildRecordingBin } from (
  "../utils/recordingBins"
);

import "../Tests/Test.scss";


let questionAudio;
let audioLink;


const LAMBDAAPIENDPOINT = (
  `${APIBASEURL}/audio-upload`
);


const narrationInstruction = (
  "https://merls-story-audio." +
  "s3.us-east-2.amazonaws.com/" +
  "instruction/" +
  "narration_instructions.m4a"
);


const retellingLinks = [
  (
    "https://merls-story-audio." +
    "s3.us-east-2.amazonaws.com/" +
    "instruction/" +
    "retell_instructions_1.m4a"
  ),
  (
    "https://merls-story-audio." +
    "s3.us-east-2.amazonaws.com/" +
    "instruction/" +
    "retell_instructions_2.m4a"
  ),
  (
    "https://merls-story-audio." +
    "s3.us-east-2.amazonaws.com/" +
    "instruction/" +
    "retell_instructions_2.m4a"
  ),
];


const normalizeStoryData = (
  rawData
) => {
  if (
    !Array.isArray(rawData)
    || rawData.length === 0
  ) {
    return [];
  }

  if (
    Array.isArray(
      rawData[0]?.questions
    )
  ) {
    return rawData.map(
      (story, index) => ({
        story_id:
          story.story_id ??
          index + 1,

        questions:
          Array.isArray(
            story.questions
          )
            ? story.questions
            : [],

        image_links:
          Array.isArray(
            story.image_links
          )
            ? story.image_links
            : [],

        narration_audios:
          Array.isArray(
            story.narration_audios
          )
            ? story.narration_audios
            : [],
      })
    );
  }

  const grouped = rawData.reduce(
    (accumulator, row) => {
      const storyId =
        row.story_id ?? 1;

      if (!accumulator[storyId]) {
        accumulator[storyId] = {
          story_id: storyId,
          questions: [],
          image_links: [],
          narration_audios: [],
        };
      }

      accumulator[
        storyId
      ].questions.push(row);

      return accumulator;
    },
    {}
  );

  return Object.values(grouped)
    .map((story) => {
      const imageSet = new Set();
      const narrationSet = new Set();

      const sortedQuestions = [
        ...story.questions,
      ].sort(
        (first, second) =>
          (
            first.question_id ?? 0
          ) -
          (
            second.question_id ?? 0
          )
      );

      sortedQuestions.forEach(
        (question) => {
          const links =
            Array.isArray(
              question.image_links
            )
              ? question.image_links
              : [];

          links.forEach((link) => {
            if (link) {
              imageSet.add(link);
            }
          });

          if (
            question.narration_audio
          ) {
            narrationSet.add(
              question.narration_audio
            );
          }
        }
      );

      return {
        ...story,
        questions: sortedQuestions,
        image_links:
          Array.from(imageSet),
        narration_audios:
          Array.from(narrationSet),
      };
    })
    .sort(
      (first, second) =>
        (
          first.story_id ?? 0
        ) -
        (
          second.story_id ?? 0
        )
    );
};


const StoryTest = ({
  language,
}) => {
  const [
    currentStory,
    setCurrentStory,
  ] = useState(1);

  const [
    stage,
    setStage,
  ] = useState(0);

  const [
    subStage,
    setSubStage,
  ] = useState(1);

  const subStageRef = useRef(
    subStage
  );

  const [
    audioUrls,
    setAudioUrls,
  ] = useState({});

  const [
    retellUrls,
    setRetellUrls,
  ] = useState({});

  const [
    stories,
    setStories,
  ] = useState([]);

  const [
    imageLinks,
    setImageLinks,
  ] = useState([]);

  const [
    narrationLinks,
    setNarrationLinks,
  ] = useState([]);

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    showAudioPermission,
    setShowAudioPermission,
  ] = useState(true);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const [
    showLoading,
    setShowLoading,
  ] = useState(true);

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const [
    showChinese,
    setShowChinese,
  ] = useState(false);

  const [
    audioPlaying,
    setAudioPlaying,
  ] = useState(false);

  const [
    countDown,
    setCountDown,
  ] = useState(3);

  const [
    disableOption,
    setDisableOption,
  ] = useState(true);

  const [
    uploadsInProgress,
    setUploadsInProgress,
  ] = useState(0);

  const [
    totalStages,
    setTotalStages,
  ] = useState(1);

  const [
    currentStage,
    setCurrentStage,
  ] = useState(0);

  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    const languageParam =
      params.get("cn-zw");

    setShowChinese(
      languageParam === "true"
    );
  }, [location]);

  useEffect(() => {
    clearTimeout(
      timeoutRef.current
    );

    if (
      showLoading
      || showAudioPermission
    ) {
      return undefined;
    }

    if (countDown > 0) {
      timeoutRef.current =
        setTimeout(() => {
          setCountDown(
            (previous) =>
              previous - 1
          );
        }, 1000);

    } else if (!audioPlaying) {
      playAudio();
    }

    return () =>
      clearTimeout(
        timeoutRef.current
      );

  }, [
    countDown,
    showLoading,
    showAudioPermission,
    audioPlaying,
  ]);

  useEffect(() => {
    async function fetchStoryData() {
      const response = await fetch(
        `${APIBASEURL}/questions` +
          `?language=` +
          `${encodeURIComponent(language)}` +
          `&type=story`,
        {
          method: "GET",
          headers: {
            Accept: (
              "application/json"
            ),
          },
        }
      );

      const rawData =
        await response.json();

      const normalizedStories =
        normalizeStoryData(rawData);

      setStories(
        normalizedStories
      );

      if (
        !normalizedStories
        || normalizedStories.length === 0
      ) {
        setShowLoading(false);
        return;
      }

      setQuestions(
        normalizedStories[0]
          .questions || []
      );

      setImageLinks(
        normalizedStories[0]
          .image_links || []
      );

      setNarrationLinks(
        normalizedStories[0]
          .narration_audios || []
      );

      audioLink = narrationInstruction;

      setShowLoading(false);

      let total = 0;

      for (
        const story
        of normalizedStories
      ) {
        total += 8;

        total += Array.isArray(
          story.questions
        )
          ? story.questions.length
          : 0;
      }

      setTotalStages(total);
    }

    fetchStoryData();
  }, [language]);

  const recordAudioUrl = (
    questionId,
    s3Url,
    type
  ) => {
    if (
      !questionId
      || !s3Url
    ) {
      console.error(
        "Missing required parameters:",
        {
          questionId,
          s3Url,
        }
      );

      return;
    }

    const truncatedUrl =
      s3Url.split("?")[0];

    if (type === "retell") {
      setRetellUrls(
        (previous) => ({
          ...previous,
          [currentStory]: {
            ...(
              previous[
                currentStory
              ] || {}
            ),
            [questionId]:
              truncatedUrl,
          },
        })
      );

    } else {
      setAudioUrls(
        (previous) => ({
          ...previous,
          [currentStory]: {
            ...(
              previous[
                currentStory
              ] || {}
            ),
            [questionId]:
              truncatedUrl,
          },
        })
      );
    }
  };

  const uploadToLambda = async (
    recordedBlob,
    type
  ) => {
    setUploadsInProgress(
      (previous) =>
        previous + 1
    );

    try {
      if (!recordedBlob?.blob) {
        throw new Error(
          "No audio recording was provided."
        );
      }

      const base64Data =
        await new Promise(
          (resolve, reject) => {
            const reader =
              new FileReader();

            reader.onload = () =>
              resolve(reader.result);

            reader.onerror = reject;

            reader.readAsDataURL(
              recordedBlob.blob
            );
          }
        );

      const questionId = subStage;

      const requestBody = {
        fileType:
          recordedBlob.blob.type ||
          "audio/webm",

        audioData: base64Data,

        userId:
          localStorage.getItem(
            "username"
          ),

        questionId,

        bucketName:
          buildRecordingBin({
            language,
            task:
              type === "retell"
                ? "story-retell"
                : "story-question",
            source:
              "system-recording",
            storyId: currentStory,
            questionId,
          }),
      };

      const response = await fetch(
        LAMBDAAPIENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": (
              "application/json"
            ),
          },
          body: JSON.stringify(
            requestBody
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Audio upload failed."
        );
      }

      if (!data.url) {
        throw new Error(
          "The backend did not return " +
            "an audio URL."
        );
      }

      recordAudioUrl(
        questionId,
        data.url,
        type
      );

      return data.url;

    } finally {
      setUploadsInProgress(
        (previous) =>
          Math.max(
            0,
            previous - 1
          )
      );
    }
  };

  const submitAnswers = async () => {
    const username =
      localStorage.getItem(
        "username"
      );

    const endpoint =
      `${APIBASEURL}/submissions`;

    const requestBody = {
      participantId: username,
      userAns: null,

      isEN:
        String(language)
          .toLowerCase()
        !== "chinese",

      isAudioTest: false,
      storySubmissionList:
        audioUrls,
      retellSubmissionList:
        retellUrls,
      submissionType: "story",
    };

    const response = await fetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": (
            "application/json"
          ),
        },
        body: JSON.stringify(
          requestBody
        ),
      }
    );

    if (response.ok) {
      const queryParam =
        `?cn-zw=` +
        `${
          showChinese
            ? "true"
            : "false"
        }`;

      navigate(
        `/test-selection${queryParam}`
      );

    } else {
      alert(
        "Failed to submit answers"
      );
    }
  };

  const playAudio = () => {
    if (!audioLink) {
      setDisableOption(false);
      return;
    }

    questionAudio =
      new Audio(audioLink);

    questionAudio.addEventListener(
      "play",
      () => setAudioPlaying(true)
    );

    questionAudio.addEventListener(
      "ended",
      () => {
        setAudioPlaying(false);

        if (disableOption) {
          setDisableOption(false);
        }
      }
    );

    questionAudio
      .play()
      .catch(() => {
        alert(
          "Error playing the question."
        );

        setDisableOption(false);
      });
  };

  const stopAudio = () => {
    try {
      if (questionAudio) {
        questionAudio.pause();
      }

      setAudioPlaying(false);

    } catch {
      console.log(
        "Could not pause audio"
      );
    }
  };

  const updateInstructionLink = (
    stageValue,
    subStageValue
  ) => {
    if (stageValue === 1) {
      audioLink =
        narrationLinks[
          subStageValue - 1
        ] || "";

    } else if (stageValue === 2) {
      audioLink =
        retellingLinks[
          subStageValue - 1
        ];

    } else if (stageValue === 4) {
      audioLink =
        questions[
          subStageValue - 1
        ]?.question_audio || "";

    } else {
      audioLink = "";
    }
  };

  const advanceSubStage = () => {
    if (
      stage === 0
      && currentStory === 1
    ) {
      setShowConfirmation(true);
      return;
    }

    stopAudio();
    setCountDown(3);
    setDisableOption(true);

    setCurrentStage(
      (previous) =>
        previous + 1
    );

    if (stage === 0) {
      setSubStage(1);
      setStage(1);

      updateInstructionLink(
        1,
        1
      );

    } else if (stage === 1) {
      if (subStage === 3) {
        updateInstructionLink(
          2,
          1
        );

        setStage(2);
        setSubStage(1);

      } else {
        updateInstructionLink(
          1,
          subStage + 1
        );

        setSubStage(
          (previous) =>
            previous + 1
        );
      }

    } else if (stage === 2) {
      subStageRef.current =
        subStage;

      if (subStage === 3) {
        audioLink = (
          "https://merls-story-audio." +
          "s3.us-east-2.amazonaws.com/" +
          "instruction/" +
          "question_instructions.m4a"
        );

        setStage(3);
        setSubStage(1);

      } else {
        updateInstructionLink(
          2,
          subStage + 1
        );

        setSubStage(
          (previous) =>
            previous + 1
        );
      }

    } else if (stage === 3) {
      setStage(4);

      updateInstructionLink(
        4,
        1
      );

    } else {
      subStageRef.current =
        subStage;

      if (
        subStage ===
        questions.length
      ) {
        audioLink =
          narrationInstruction;

        setStage(0);
        setSubStage(1);

        if (
          currentStory ===
          stories.length
        ) {
          setCompleted(true);
          setAudioPlaying(true);

        } else {
          const nextStory =
            stories[currentStory];

          setQuestions(
            nextStory?.questions || []
          );

          setImageLinks(
            nextStory?.image_links || []
          );

          setNarrationLinks(
            nextStory
              ?.narration_audios || []
          );

          setCurrentStory(
            (previous) =>
              previous + 1
          );
        }

      } else {
        updateInstructionLink(
          4,
          subStage + 1
        );

        setSubStage(
          (previous) =>
            previous + 1
        );
      }
    }
  };

  const getRetellLinks = () => {
    if (subStage === 1) {
      return [
        {
          id: 1,
          link: imageLinks[0],
        },
        {
          id: 2,
          link: imageLinks[1],
        },
      ].filter(
        (item) => Boolean(item.link)
      );
    }

    if (subStage === 2) {
      return [
        {
          id: 3,
          link: imageLinks[2],
        },
        {
          id: 4,
          link: imageLinks[3],
        },
      ].filter(
        (item) => Boolean(item.link)
      );
    }

    if (subStage === 3) {
      return [
        {
          id: 5,
          link: imageLinks[4],
        },
        {
          id: 6,
          link: imageLinks[5],
        },
      ].filter(
        (item) => Boolean(item.link)
      );
    }

    return [];
  };

  if (showLoading) {
    return (
      <div
        className="loadingContainer"
      >
        <CircularProgress
          size={75}
          thickness={3}
          variant="indeterminate"
        />
      </div>
    );
  }

  if (showAudioPermission) {
    return (
      <AudioPermission
        showChinese={showChinese}
        setShowAudioPermission={
          setShowAudioPermission
        }
      />
    );
  }

  if (completed) {
    return (
      <div id="testPage">
        <AppBar
          className="titleContainer"
        >
          <progress
            id="progress"
            value={1}
            max={1}
          />

          <TranslationButton
            showChinese={showChinese}
            setShowChinese={
              setShowChinese
            }
          />
        </AppBar>

        <CompletionPage
          showChinese={showChinese}
          audioLink={
            "https://non-question-links." +
            "s3.us-east-2.amazonaws.com/" +
            "RV-Englsih-End-of-the-test-" +
            "narration-w-audio.m4a"
          }
          imageLink={
            "https://non-question-links." +
            "s3.us-east-2.amazonaws.com/" +
            "puppy3.gif"
          }
          submitAnswers={submitAnswers}
          uploadsInProgress={
            uploadsInProgress
          }
        />
      </div>
    );
  }

  return (
    <div id="testPage">
      <AppBar
        className="titleContainer"
      >
        <progress
          id="progress"
          value={currentStage}
          max={totalStages}
        />

        <TranslationButton
          showChinese={showChinese}
          setShowChinese={
            setShowChinese
          }
        />
      </AppBar>

      {showConfirmation && (
        <Confirmation
          showChinese={showChinese}
          setShowConfirmation={
            setShowConfirmation
          }
          englishText={
            "Are you sure you want " +
            "to begin the English " +
            "Story Test?"
          }
          chineseText={
            "你确定要开始英语故事测试吗"
          }
          confirmAction={() => {
            setAudioPlaying(false);
            setCountDown(3);
            setDisableOption(true);

            setCurrentStage(
              (previous) =>
                previous + 1
            );

            setSubStage(1);
            setStage(1);

            updateInstructionLink(
              1,
              1
            );
          }}
        />
      )}

      {localStorage.getItem(
        "username"
      ) === "lucy" && (
        <div
          className={
            "debugAdvanceButton"
          }
        >
          <GreenButton
            textEnglish="next part"
            onClick={() => {
              stopAudio();
              advanceSubStage();
            }}
          />
        </div>
      )}

      <div className="indicator">
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

            <p className="actionText">
              {showChinese
                ? "播放中"
                : (
                    "Playing " +
                    "Instructions"
                  )}
            </p>
          </div>
        ) : (
          <div>
            <IconButton
              aria-label="play"
              style={{
                marginBottom: 0,
              }}
              onClick={playAudio}
            >
              <PlayCircleIcon
                color="primary"
                className="pauseButton"
              />
            </IconButton>

            <div className="actionText">
              {countDown > 0 ? (
                <p className="actionText">
                  {showChinese ? (
                    <>
                      {countDown}
                      {" 秒内播放音频"}
                    </>
                  ) : (
                    <>
                      {"Audio playing in "}
                      {countDown}
                      {" second(s)"}
                    </>
                  )}
                </p>
              ) : (
                <p className="actionText">
                  {showChinese
                    ? "再听一次指示?"
                    : (
                        "Listen to " +
                        "instructions again?"
                      )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {stage === 0 ||
      stage === 1 ? (
        <Story
          imageLinks={imageLinks}
          disableOption={
            disableOption
          }
          showChinese={showChinese}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
        />

      ) : stage === 2 ? (
        <Retell
          imageLinks={
            getRetellLinks()
          }
          showChinese={showChinese}
          setShowChinese={
            setShowChinese
          }
          disableOption={
            disableOption
          }
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
          uploadToLambda={
            uploadToLambda
          }
          type="retell"
          participantId={
            localStorage.getItem(
              "username"
            ) || ""
          }
          questionId={
            `story-${currentStory}-` +
            `retell-${subStage}`
          }
          testLanguage={language}
        />

      ) : stage === 3 ? (
        <Instructions
          showChinese={showChinese}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
          disableOption={
            disableOption
          }
        />

      ) : stage === 4 ? (
        <Questions
          showChinese={showChinese}
          beforeUnload={() => {
            stopAudio();
            advanceSubStage();
          }}
          disableOption={
            disableOption
          }
          question={
            questions[
              subStage - 1
            ]
          }
          uploadToLambda={
            uploadToLambda
          }
          type="question"
        />

      ) : (
        <div>
          page does not exist
        </div>
      )}
    </div>
  );
};


export default StoryTest;
