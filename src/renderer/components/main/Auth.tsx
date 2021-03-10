/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import store, { AppState } from "../../../shared/redux/stores/rendererStore";
import { shell } from "electron";
import Checkbox from "../misc/Checkbox";
import { ipcSend } from "../../ipcSend";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import css from "./auth.css";
import formsCss from "../../forms.css";
import { constants, sha1 } from "mtgatool-shared";
const {
  HIDDEN_PW,
  IPC_NONE,
  IPC_BACKGROUND,
  IPC_ALL,
  IPC_RENDERER,
} = constants;

function clickRememberMe(value: boolean): void {
  reduxAction(
    store.dispatch,
    { type: "SET_APP_SETTINGS", arg: { rememberMe: value } },
    IPC_BACKGROUND
  );
}

interface AuthProps {
  authForm: { email: string; pass: string; rememberme: boolean };
}

export default function Auth(props: AuthProps): JSX.Element {
  const [errorMessage, setErrorMessage] = React.useState("");
  const [authForm, setAuthForm] = React.useState(props.authForm);
  const canLogin = useSelector((state: AppState) => state.login.canLogin);
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
      reduxAction(dispatcher, { type: "SET_CAN_LOGIN", arg: false }, IPC_NONE);
      reduxAction(
        dispatcher,
        { type: "SET_APP_SETTINGS", arg: { email: authForm.email } },
        IPC_ALL ^ IPC_RENDERER
      );
      ipcSend("login", {
        username: authForm.email,
        password: pwd,
      });
    }
  }, [dispatcher, authForm.email, authForm.pass]);

  return (
    <form>
      <div className={formsCss.formContainer}>
        <div className={formsCss.formAuthenticate}>
          <div className={formsCss.formIcon} />
          <div id="loginform">
            <label className={formsCss.formLabel}>Email</label>
            <div className={formsCss.formInputContainer}>
              <input
                onChange={handleEmailChange}
                type="email"
                id="signin_email"
                autoComplete="off"
                value={authForm.email}
              />
            </div>
            <label className={formsCss.formLabel}>Password</label>
            <div className={formsCss.formInputContainer}>
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
                color: "var(--color-text-link)",
                cursor: "pointer",
                marginBottom: "16px",
              }}
            >
              <a
                onClick={(): void => {
                  shell.openExternal("https://mtgatool.com/resetpassword/");
                }}
                className={"forgot_link"}
              >
                Forgot your password?
              </a>
            </div>
            <button
              className={formsCss.formButton}
              type="submit"
              id="submit"
              onClick={onSubmit}
              disabled={!canLogin}
            >
              Login
            </button>
            <div className={formsCss.formError}>{errorMessage}</div>
            <div className={formsCss.formOptions}>
              <Checkbox
                style={{ width: "max-content", margin: "auto auto 12px auto" }}
                text="Remember me?"
                value={authForm.rememberme}
                callback={clickRememberMe}
              />
              <div className={css.messageSmall}>
                Dont have an account?{" "}
                <a
                  onClick={(): void => {
                    shell.openExternal("https://mtgatool.com/signup/");
                  }}
                  className={css.signupLink}
                >
                  Sign up!
                </a>
              </div>
              <div className={css.messageSmall}>
                You can also{" "}
                {canLogin ? (
                  <a
                    onClick={(): void => {
                      ipcSend("login", { username: "", password: "" });
                    }}
                    className={"offline_link"}
                  >
                    continue offline
                  </a>
                ) : (
                  "continue offline"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
