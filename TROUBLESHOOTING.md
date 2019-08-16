This is meant as a guide to help you locate and resolve the most common issues running MTG Arena Tool. **Please** only follow these steps if you encounter one of the issues mentioned.

### Stuck on 'please wait a minute' (without loading %)

Refer to this issue, the solution is on the comments;
[github.com/Manuel-777/MTG-Arena-Tool/issues/112](https://github.com/Manuel-777/MTG-Arena-Tool/issues/112)

### Overlay is a black or white box

Change the 'Overlay Scale' and 'Overlay transparency' settings to any value, then restart mtgatool.

### Overlay is not visible, but visible in the taskbar (offscreen)
Use `Alt+Tab` to switch to the off-screen application.
Press `Alt+SPACE` to bring up the system menu (you won't see it because it is off screen)
Press `R` to select the "Restore" menu choice to ensure the windows isn't maximized (you cannot move it if it is maximized)
Press `Alt+SPACE` again, then M to select the "Move" menu choice.
Press one of the arrow keys to initiate the movement.
Now just use the mouse to place the window where you want.

[Link](https://superuser.com/a/53590)

### If the app freezes in loading "Just a second" page:
This is probably caused by an error reading the user configuration, probably due to an unhandled exception or new data added from MTGA that mtgatool is not handling properly. Bear in mind this issue is **not** because of a bad or improper installation, so reinstalling will make no difference. Altrough, you can roll back to a previous version safely if an update caused it.

Locate your log and config files;
- Close MTG Arena and MTG Arena Tool.
- Go to `%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\`
- Rename `output.log`, do not delete it!
- Run MTG Arena, once open, run MTG Arena Tool again.

If this works, send the the old log file file to [mtgatool@gmail.com](mailto:mtgatool@gmail.com) to analyze the error.

If that does not work;
- Proceed to `%APPDATA%\mtg-arena-tool`
- Locate your user-data file (the .json file named with your User ID, something like `0A1F2E3E4D5C6B7A.json`)
- Rename the file, adding something to the end. **Do not delete it!**
- Run MTG Arena Tool again.

If the last step worked, send your user-data file to [mtgatool@gmail.com](mailto:mtgatool@gmail.com) and I will inspect what is wrong with it.

### If you recieve a "No log file found" error

Close MTG Arena and MTG Arena tool, then start MTG Arena. Once MTG Arena is loaded run MTG Arena Tool again.

### If you have any other unexpected behaviour

First of all, uninstalling and installing again will probably not change anything, as most errors are either configuration errors or log provessing errors. Neither of them are solved by uninstalling. So, just to save you some time, make sure you have the latest version only.

Run the app then use `Alt+Shift+D` to open three developer consoles, one for each process (main, overlay and background).
Check if any of them has errors. If you see anything here (or anywhere else, really) you can submit to:
- [Discord](https://discord.gg/K9bPkJy)
- [Github issues](https://github.com/Manuel-777/MTG-Arena-Tool/issues)
- [mtgatool@gmail.com](mailto:mtgatool@gmail.com)
