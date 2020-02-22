import React from "react";
import ReactDOM from "react-dom";
import { ContextProvider, useContext } from "./ContextProvider";
import { TopNav } from "../components/main/topNav";
import BackgroundImage from "../components/main/BackgroundImage";
import TopBar from "../components/main/TopBar";
import LoadingBar from "../components/main/LoadingBar";

function App(): JSX.Element {
  const appContext = useContext();

  return (
    <>
      <BackgroundImage />
      <div className="outer_wrapper">
        <TopBar artist={appContext.TopArtist} offline={appContext.Offline} />
        <TopNav />
        {appContext.Loading ?? <LoadingBar />}
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
