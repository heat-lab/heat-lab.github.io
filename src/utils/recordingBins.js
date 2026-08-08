const normalizeLanguageBin = ({
  language,
  showChinese,
  isChinese,
} = {}) => {
  if (typeof language === "string") {
    const normalized =
      language.trim().toLowerCase();

    if (
      normalized === "cn" ||
      normalized === "chinese" ||
      normalized === "zh" ||
      normalized.startsWith("zh-")
    ) {
      return "chinese";
    }

    if (
      normalized === "en" ||
      normalized === "english" ||
      normalized.startsWith("en-")
    ) {
      return "english";
    }
  }

  if (typeof showChinese === "boolean") {
    return showChinese
      ? "chinese"
      : "english";
  }

  if (typeof isChinese === "boolean") {
    return isChinese
      ? "chinese"
      : "english";
  }

  return "english";
};


export const buildRecordingBin = ({
  language,
  showChinese,
  isChinese,
  task,
  source = "system-recording",
  storyId,
  questionId,
} = {}) => {
  const languageBin =
    normalizeLanguageBin({
      language,
      showChinese,
      isChinese,
    });

  const segments = [
    "recordings",
    languageBin,
    task,
    source,
  ].filter(Boolean);

  if (
    storyId !== undefined &&
    storyId !== null &&
    storyId !== ""
  ) {
    segments.push(
      `story-${storyId}`
    );
  }

  if (
    questionId !== undefined &&
    questionId !== null &&
    questionId !== ""
  ) {
    segments.push(
      `question-${questionId}`
    );
  }

  return segments.join("/");
};
