import React from "react";
import "../Tests/Test.scss";
import GreenButton from "../Components/GreenButton";

const Instructions = ({ showChinese, beforeUnload, disableOption }) => {

    return (
        <div>
            <div className="puppyContainer">
                <img
                    className="instructionPuppy"
                    src="https://non-question-links.s3.us-east-2.amazonaws.com/puppy.png"
                    alt="puppy staring"
                ></img>
            </div>
            <div className="submitButtonContainer">
                <div className="submitButtonContainer">
                    <GreenButton
                        showChinese={showChinese}
                        textEnglish="Continue"
                        textChinese="继续"
                        disabled={disableOption}
                        onClick={() => {
                            if (!disableOption) {
                                beforeUnload();
                            }
                        }} />
                </div>
            </div>
        </div>
    )
}

export default Instructions;