# MTG Arena Tool
An MTG Arena deck tracker and collection manager.

![History Screen](/Readme/screenshot_1.png)

## Current features
- In-game overlay
	- Cards left in library
	- Odds of drawing next
	- Full deck with sideboard
	- Elapsed time / current time clock
- History of games played
	- Cards your opponents played
	- Export decklists
- Collection browser
	- Filter cards by set
	- Show newly acquired cards
	- Sort by set, name and cmc
	- Advanced card filtering and search
	- Show cards unowned
	- Collection completion statistics
- Individual deck statistics
	- Win/loss ratios
	- Wildcards needed
	- Show cards missing
	- mana curve
	- Winrate vs colors
	- Visual view
	- Deck export (to mtga, to .txt)
- Draft tracker
	- In-draft overlay
	- assistant (shows best picks)
	- replayer
	- Draft sharing
- Explore decks
	- Filter by event
	- Sorted by wins/losses

## Roadmap
`These are some features I would like to include, not ordered in any way`
- Log of events (Player X casts Y spell, This targeted that, etc), save the log too
- Metagame / Archetypes on decks explorer `this requires more data to be able to play with`
- Deck editor/modifier, for adding things like specific basic lands and then importing them to MTG Arena.

### Compiling / Run from source
MTG Arena Tool is developed using Electron JS, To get started simply clone this repo and install:

```
git clone https://github.com/Manuel-777/MTG-Arena-Tool
npm install
npm start
```

Once running from source you can open developer tools with F12 and toggle background process window visible using Shift+Alt+D.

### Download
Currently, our releases are hosted [here at GitHub](https://github.com/Manuel-777/MTG-Arena-Tool/releases). You will find all stable and pre-production releases right here.

Once downloaded the installer should simply install and run immediately. The app will read your user data and warn you if anything goes wrong.

### Disclaimer

Even though no official statement has been made about third party software by MTG Arena developers, I am obliged to put a warning about the use of this software.

It is not stated if it is legal or allowed by Wizards of the Coast to use Deck Trackers and other tools alike while playing MTG Arena, therefore MTG Arena Tool developers are not responsible if your account gets banned, locked or suspended for using this software. `Use at your own risk.`

MtG Arena Tool is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

Please read about [our Privacy Policy and How we use your data here](https://github.com/Manuel-777/MTG-Arena-Tool/blob/master/PRIVACY.md)

### Credits
[Electron](https://electronjs.org/)

[Electron Store by Sindre Sorhus](https://github.com/sindresorhus/electron-store)

[Jquery Easing by GSGD](http://gsgd.co.uk/sandbox/jquery/easing/)

[Conic Gradient Polyfill by Lea Verou](https://leaverou.github.io/conic-gradient/)

[Spectrum color picker by Brian Grinstead](http://bgrins.github.io/spectrum/)

[Scryfall.com](http://scryfall.com) in particular, for making an absolutely stunning database of every single card in the multiverse.

### Questions?
You can find me at any of these;
[Twitter](https://twitter.com/MEtchegaray7)
[Discord](https://discord.gg/K9bPkJy)
[mtgatool@gmail.com](mailto:mtgatool@gmail.com)
