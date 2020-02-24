import React from "react";
import ReactDOM from "react-dom";
import { ContextProvider, useContext, useDispatch } from "./ContextProvider";
import { TopNav } from "../components/main/topNav";
import { getOpenNav } from "../tabControl";
import BackgroundImage from "../components/main/BackgroundImage";
import TopBar from "../components/main/TopBar";
import LoadingBar from "../components/main/LoadingBar";
import Auth from "../Auth";
import { LOGIN_OK } from "./ContextReducer";
import ipcListeners from "./ipcListeners";
import Popup from "../components/main/Popup";
import CardHover from "../components/main/CardHover";

function App(): JSX.Element {
  const appContext = useContext();
  const dispatcher = useDispatch();

  /*
    Set up IPC listeners.
    This should only happen once when the app starts, so no
    action should recreate the App component.
    IPC Listeners should be inside a React component below the
    context provider hierarchy, so they can dispatch actions.
  */
  React.useEffect(() => {
    ipcListeners(dispatcher);
  }, [dispatcher]);

  return (
    <>
      <BackgroundImage appContext={appContext} />
      <div className="outer_wrapper">
        <TopBar artist={appContext.topArtist} offline={appContext.offline} />
        <Popup text={appContext.popup.text} time={appContext.popup.time} />
        <CardHover />
        {appContext.login == LOGIN_OK ? <TopNav /> : <></>}
        {appContext.loading ? (
          <LoadingBar
            style={
              appContext.login == LOGIN_OK ? { top: "99px" } : { top: "35px" }
            }
          />
        ) : (
          <></>
        )}
        {appContext.login == LOGIN_OK ? (
          <div className="wrapper">
            <div className="overflow_ux_main">
              <div className="moving_ux">
                <div className="ux_item">{getOpenNav(appContext)}</div>
                <div className="ux_item"></div>
                <div className="ux_item"></div>
              </div>
            </div>
          </div>
        ) : (
          <Auth
            authForm={appContext.loginForm}
            canLogin={appContext.canLogin}
          />
        )}
      </div>
    </>
  );
}

export default function RenderApp(): void {
  ReactDOM.render(
    <ContextProvider>
      <App />
    </ContextProvider>,
    document.getElementById("appcontainer")
  );
}
