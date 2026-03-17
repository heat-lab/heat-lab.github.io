export const isChineseLanguage = (language) => {
    if (!language) {
        return false;
    }

    const normalized = String(language).toLowerCase();
    return normalized === "cn" || normalized === "chinese";
};

export const isEnglishLanguage = (language) => {
    if (!language) {
        return false;
    }

    const normalized = String(language).toLowerCase();
    return normalized === "en" || normalized === "english";
};