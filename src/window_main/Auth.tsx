/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppState } from "./app/appState";
import { shell } from "electron";
import Checkbox from "./components/Checkbox";
import { ipcSend } from "./renderer-util";
import { HIDDEN_PW } from "../shared/constants";
import { dispatchAction, SET_CAN_LOGIN } from "./app/reducers";
const sha1 = require("js-sha1");

function clickRememberMe(value: boolean): void {
  const rSettings = {
    remember_me: value
  };
  ipcSend("save_app_settings", rSettings);
}

interface AuthProps {
  authForm: { email: string; pass: string; rememberme: boolean };
}

export default function Auth(props: AuthProps): JSX.Element {
  const [errorMessage, setErrorMessage] = React.useState("");
  const [authForm, setAuthForm] = React.useState(props.authForm);
  const canLogin = useSelector((state: AppState) => state.canLogin);
  const dispatcher = useDispatch();

  const handleEmailChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setAuthForm({ ...authForm, email: event.target.value });
    },
    [authForm]
  );

  const handlePassChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setAuthForm({ ...authForm, pass: event.target.value });
    },
    [authForm]
  );

  React.useEffect(() => {
    setAuthForm(props.authForm);
  }, [props.authForm]);

  const onSubmit = React.useCallback((): void => {
    if (authForm.pass.length < 8) {
      setErrorMessage("Passwords must contain at least 8 characters.");
    } else {
      setErrorMessage("");
      const pwd = authForm.pass == HIDDEN_PW ? HIDDEN_PW : sha1(authForm.pass);
      dispatchAction(dispatcher, SET_CAN_LOGIN, false);
      ipcSend("login", {
        username: authForm.email,
        password: pwd
      });
    }
  }, [dispatcher, authForm.email, authForm.pass]);

  return (
    <div className="form-container">
      <div className="form-authenticate">
        <div className="form-icon" />
        <div id="loginform">
          <label className="form-label">Email</label>
          <div className="form-input-container">
            <input
              onChange={handleEmailChange}
              type="email"
              id="signin_email"
              autoComplete="off"
              value={authForm.email}
            />
          </div>
          <label className="form-label">Password</label>
          <div className="form-input-container">
            <input
              onChange={handlePassChange}
              type="password"
              id="signin_pass"
              autoComplete="off"
              value={authForm.pass}
            />
          </div>
          <div
            style={{
              color: "var(--color-mid-75)",
              cursor: "pointer",
              marginBottom: "16px"
            }}
          >
            <a
              onClick={(): void => {
                shell.openExternal("https://mtgatool.com/resetpassword/");
              }}
              className="forgot_link"
            >
              Forgot your password?
            </a>
          </div>
          <button
            className="form-button"
            type="submit"
            id="submit"
            onClick={onSubmit}
            disabled={!canLogin}
          >
            Login
          </button>
          <div className="form-error">{errorMessage}</div>
        </div>
      </div>
      <div className="form-options">
        <Checkbox
          style={{ width: "max-content", margin: "auto auto 12px auto" }}
          text="Remember me?"
          value={authForm.rememberme}
          callback={clickRememberMe}
        />
        <div className="message_small">
          Dont have an account?{" "}
          <a
            onClick={(): void => {
              shell.openExternal("https://mtgatool.com/signup/");
            }}
            className="signup_link"
          >
            Sign up!
          </a>
        </div>
        <div className="message_small">
          You can also{" "}
          {canLogin ? (
            <a
              onClick={(): void => {
                ipcSend("login", { username: "", password: "" });
              }}
              className="offline_link"
            >
              continue offline
            </a>
          ) : (
            "continue offline"
          )}
        </div>
      </div>
    </div>
  );
}
