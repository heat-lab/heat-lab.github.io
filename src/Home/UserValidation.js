import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import TextField from "@mui/material/TextField";
import TranslationButton from "../Components/TranslationButton";
import BlueButton from "../Components/BlueButton";
import "./Home.css";
import { APIBASEURL } from "../config";

const UserValidation = () => {
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [chineseLoginPage, setChineseLoginPage] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const languageParam = params.get("cn-zw");
    setChineseLoginPage(languageParam === "true");
  }, [location]);

  const alertLoginFailure = () => {
    alert(
      chineseLoginPage
        ? "登录失败，请检查您的用户名或联系研究员"
        : "Login failed, please check your username or contact the researcher"
    );
  };

  const validateUser = async () => {
    setUsername(false);
    try {
      const response = await fetch(
        `${APIBASEURL}/users?participant_id=${encodeURIComponent(username)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0 && data[0].is_active) {
          localStorage.setItem("username", username);
          const queryParam = `?cn-zw=${chineseLoginPage ? "true" : "false"}`;
          navigate(`/test-selection${queryParam}`);
        } else {
          alertLoginFailure();
        }
      } else {
        alertLoginFailure();
      }
    } catch (error) {
      alertLoginFailure();
    }
  };

  return (
    <div className="home">
      <AppBar className="titleContainer">
        <h1 className="title">
          {chineseLoginPage ? <>欢迎来到MERLS</> : <>Welcome to MERLS</>}
        </h1>
        <h2 className="subHeading">
          {chineseLoginPage
            ? "请输入您的用户名并点击登陆"
            : "Please enter your username to login"}
        </h2>
        <TranslationButton
          showChinese={chineseLoginPage}
          setShowChinese={setChineseLoginPage}
        />
      </AppBar>
      <div className="loginSection">
        <TextField
          label={chineseLoginPage ? "用户名" : "Username"}
          variant="standard"
          onChange={(e) => setUsername(e.target.value)}
        />
        <BlueButton
          textEnglish={"Login"}
          textChinese={"登录"}
          showChinese={chineseLoginPage}
          onClick={validateUser}
          disabled={!username}
        />
      </div>
    </div>
  );
};

export default UserValidation;
