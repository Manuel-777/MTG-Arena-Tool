/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { shell } from "electron";
import Checkbox from "./components/Checkbox";
import { ipcSend } from "./renderer-util";
import {
  dispatchAction,
  SET_LOADING,
  SET_LOGIN_STATE,
  LOGIN_WAITING
} from "./app/ContextReducer";
import { useDispatch } from "./app/ContextProvider";
import sha1 from "js-sha1";
import { HIDDEN_PW } from "../shared/constants";

function clickRememberMe(value: boolean): void {
  const rSettings = {
    remember_me: value
  };
  ipcSend("save_app_settings", rSettings);
}

interface AuthProps {
  canLogin: boolean;
  authForm: {
    email: string;
    pass: string;
    rememberme: boolean;
  };
}

export default function Auth(props: AuthProps): JSX.Element {
  const [errorMessage, setErrorMessage] = React.useState("");
  const [formData, setFormData] = React.useState(props.authForm);
  const dispatcher = useDispatch();

  const handleEmailChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setFormData({ ...formData, email: event.target.value });
  };

  const handlePassChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setFormData({ ...formData, pass: event.target.value });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (formData.pass.length < 8) {
      setErrorMessage("Passwords must contain at least 8 characters.");
    } else {
      setErrorMessage("");
      const pwd = formData.pass == HIDDEN_PW ? HIDDEN_PW : sha1(formData.pass);
      ipcSend("login", {
        username: formData.email,
        password: pwd
      });
      dispatchAction(dispatcher, SET_LOADING, true);
      dispatchAction(dispatcher, SET_LOGIN_STATE, LOGIN_WAITING);
    }
  };

  React.useEffect(() => {
    setFormData(props.authForm);
  }, [props]);

  return (
    <div className="form-container">
      <div className="form-authenticate">
        <div className="form-icon" />
        <form onSubmit={onSubmit} id="loginform" method="POST">
          <label className="form-label">Email</label>
          <div className="form-input-container">
            <input
              onChange={handleEmailChange}
              type="email"
              id="signin_email"
              autoComplete="off"
              defaultValue={formData.email}
            />
          </div>
          <label className="form-label">Password</label>
          <div className="form-input-container">
            <input
              onChange={handlePassChange}
              type="password"
              id="signin_pass"
              autoComplete="off"
              defaultValue={formData.pass}
            />
          </div>
          <div style={{ marginBottom: "16px" }}></div>
          <button
            className="form-button"
            type="submit"
            id="submit"
            disabled={!props.canLogin}
          >
            Login
          </button>
          <div className="form-error">{errorMessage}</div>
        </form>
      </div>
      <div className="form-options">
        <Checkbox
          style={{ width: "max-content", margin: "auto auto 12px auto" }}
          text="Remember me?"
          value={props.authForm.rememberme}
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
          <a
            onClick={(): void => {
              ipcSend("login", { username: "", password: "" });
            }}
            className="offline_link"
          >
            continue offline
          </a>
        </div>
        <div className="message_small">
          Did you{" "}
          <a
            onClick={(): void => {
              shell.openExternal("https://mtgatool.com/resetpassword/");
            }}
            className="forgot_link"
          >
            forget your password?
          </a>
        </div>
      </div>
    </div>
  );
}
