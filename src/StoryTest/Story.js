import React from "react";
import GreenButton from "../Components/GreenButton";
import "./StoryTest.css";

const Story = ({ imageLinks, showChinese, disableOption, beforeUnload }) => {
  const storyImages = Array.isArray(imageLinks) ? imageLinks : [];

  return (
    <div id="fullStory">
      <div className="container">
        {storyImages.map((link, index) => {
          return (
            <div className="itemContainer" key={link || index}>
              {`${index + 1}.`}
              <img src={link} alt="story scene" className="storyItem" />
            </div>
          );
        })}
      </div>
      <GreenButton
        showChinese={showChinese}
        textEnglish="Next"
        textChinese="下一个"
        onClick={() => {
          beforeUnload();
        }}
        disabled={disableOption}
      />
    </div>
  );
};
export default Story;
