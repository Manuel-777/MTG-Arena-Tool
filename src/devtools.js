import electronDebug from "electron-debug";
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS
} from "electron-devtools-installer";

export default function installDevTools() {
  console.log(`INSTALLING DEV TOOLS..`);
  [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS].map(ext => {
    installExtension(ext)
      .then(name => console.log(`Added ${name}`))
      .catch(err => console.log(err));
  });

  // Adds debug features like hotkeys for triggering dev tools and reload
  electronDebug({ showDevTools: false });
}
