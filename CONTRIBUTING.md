# Contributing to MTG Arena Tool

:+1: :tada: :heart_eyes_cat: Thanks for your interest! :heart_eyes_cat: :tada: :+1:

The following is a set of guidelines for contributing to MTG Arena Tool, hosted
[here on GitHub](https://github.com/Manuel-777/MTG-Arena-Tool/). These are just
guidelines, not rules. Use your best judgment, and
feel free to propose changes to this document in a pull request.

Note that MTG Arena Tool is an evolving project, so expect things to change over
time as the team learns, listens, and refines how we work with the community.

#### Table Of Contents

- [What should I know before I get started?](#what-should-i-know-before-i-get-started)
  * [Code of Conduct](#code-of-conduct)

- [How Can I Contribute?](#how-can-i-contribute)
  * [Reporting Bugs](#reporting-bugs)
  * [Suggesting Enhancements](#suggesting-enhancements)

- [Running from Source](#running-from-source)
  * [Set Up Your Machine](#set-up-your-machine)
  * [Available Scripts](#available-scripts)
  * [Optional Git Hooks](#optional-git-hooks)

## What should I know before I get started?

### Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](./CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.
Please report unacceptable behavior to [mtgatool@gmail.com](mailto:mtgatool@gmail.com).

## How Can I Contribute?

:star: :star2: **[Please join the discussion on our Discord `#devs` channel!](https://discordapp.com/channels/463844727654187020/506793351786266624)**
:star2: :star:

This is easiest way to get started immediately, and hopefully another contributor
can help answer questions about set up or current guidelines.

### Reporting Bugs

This section guides you through submitting a bug report for MTG Arena Tool.
Following these guidelines helps maintainers and the community understand your
report :pencil:, reproduce the behavior :computer: :computer:, and find related
reports :mag_right:.

#### Before Submitting A Bug Report

Before creating bug reports, **please check [this list](https://github.com/Manuel-777/MTG-Arena-Tool/issues)**
as you might find out that the problem has already been reported. If it does exist,
add a :thumbsup: to the issue to indicate this is also an issue for you, and add a
comment to the existing issue if there is extra information you can contribute.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/).

Simply create an issue on the [MTG Arena Tool issue tracker](https://github.com/Manuel-777/MTG-Arena-Tool/issues/new).

The information we are interested in includes:

 - details about your environment - which build, which trackers are running, which operating system
 - details about reproducing the issue - what steps to take, what happens, how
   often it happens, what you expect to happen instead
 - other relevant information - log files, screenshots, etc

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for
MTG Arena Tool, including completely new features and minor improvements to
existing functionality. Following these guidelines helps maintainers and the
community understand your suggestion :pencil: and find related suggestions
:mag_right:.

#### Before Submitting An Enhancement Suggestion

Before creating enhancement suggestions, **please check [this list](https://github.com/Manuel-777/MTG-Arena-Tool/labels/enhancement)**
as you might find out that the enhancement has already been suggested. If it has,
add a :thumbsup: to indicate your interest in it, or comment if there is additional
information you would like to add.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://guides.github.com/features/issues/).

Simply create an issue on the [MTG Arena Tool issue tracker](https://github.com/Manuel-777/MTG-Arena-Tool/issues/new).

Some additional advice:

* **Use a clear and descriptive title** for the feature request
* **Provide a step-by-step description of the suggested enhancement**
  This additional context helps the maintainers understand the enhancement from
  your perspective
* **Explain why this enhancement would be useful** to MTG Arena Tool users
* **Include screenshots and animated GIFs** if relevant to help you demonstrate
  the steps or point out the part of MTG Arena Tool which the suggestion is
  related to. You can use [this tool](http://www.cockos.com/licecap/) to record
  GIFs on macOS and Windows
* **List some other applications where this enhancement exists, if applicable**

## Running from Source

### Set Up Your Machine

MTG Arena Tool is developed using Electron JS, To get started simply clone this repo and install:

```
git clone https://github.com/Manuel-777/MTG-Arena-Tool
cd MTG-Arena-Tool
npm install
npm run start:all
```

Once webpack builds, after the initial `start:all` command, you can make builds faster by invoking
the build process for the process you modified only;
```
npm run start:renderer
npm run start:background
npm run start:overlay
npm run start:updater
npm run start:main
```

If you modify shared code, it is recommended to use the `start:all` command again.


### Electron Developer Tools

You can toggle developer tools for debugging using `Shift+Alt+D`, or use `F12` to view the renderer process's tools if you run from source.
Use `Shift+Alt+O` to open the developer tools for the overlay process.

### Available Scripts

In the project directory, you can run:

#### `npm run clean`

Removes all cached local build state and reinstalls all dependencies from scratch.
This will most likely change your working tree because it requires removing and
re-creating `package-lock.json`.

##### `npm run clean:modules`

Convenience script to remove `node_modules`.

##### `npm run clean:lock`

Convenience script to remove `package-lock.json`.

#### `npm install`

Installs all required dependencies.

#### `npm run eslint:fix`

Automatically formats all source code to match project guidelines. We currently use
`prettier` and `eslint` to keep things looking tidy.

#### `npm run test`

Runs all project tests. This includes unit tests run via `jest` and style guidelines
enforced by `eslint` and `prettier`.

##### `npm run test:eslint`

Tests all source code against project `eslint` and `prettier` style guidelines.

See https://eslint.org/
See https://prettier.io/

##### `npm run test:jest`

Runs all project unit tests via `jest`.

See https://jestjs.io/

#### `npm run dist`

Builds a packaged version of the project for potential distribution.

### Optional Git Hooks
You can optionally install git hooks to help with code formatting and
ensuring that your commits build successfully. Note that these can
sometimes take a moment to run and will potentially modify files in your
working tree. For more information, [see the git hooks documentation.](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

#### Pre-Commit Hook
This automatically reformats all files with staged changes to match the
project guidelines.

To install (or update), run the following commands in a terminal. WARNING: this will overwrite any previous custom
git hook.
```
rm .git/hooks/pre-commit
./git-pre-commit.sh
```
This will run the hook and place a copy in your `.git/hooks/` folder.
Future commits will always run the hook.

To uninstall:
```
rm .git/hooks/pre-commit
```

#### Pre-Push Hook
This automatically checks all modified files against the project
guidelines and only allows you to push valid commits.

To install (or update), run the following commands in a terminal. WARNING: this will overwrite any previous custom
git hook.
```
rm .git/hooks/pre-push
./git-pre-push.sh
```
This will run the hook and place a copy in your `.git/hooks/` folder.
Future pushes will always run the hook.

To uninstall:
```
rm .git/hooks/pre-push
```

