"use strict";

/**
 * @module TransparencyMouseFix
 */

// TODO: Linux: can't drop files out of electron?
// TODO: Windows: can't drag files over voids

// No external dependencies!
import electron from 'electron';

// Style for the default console logging tag
const consoleTag = [
  "%celectron-transparency-mouse-fix",
  `margin-right: .25em;padding: .1em .4em;border-radius: .25em;background-color: #3eabdc;color: white;font-weight: bold;`
];

/** Provide click-through support for Electron BrowserWindows */
class TransparencyMouseFix {
  /**
   * Creates an instance of TransparencyMouseFix
   * @param {Object} options
   * @param {electron.BrowserWindow} options.electronWindow
   * @param {Window} options.htmlWindow
   * @param {(boolean|string)} options.fixPointerEvents
   * @param {(boolean|string)} options.fixPointerEvents
   */
  constructor({
    electronWindow = electron.remote.getCurrentWindow(),
    htmlWindow = window,
    fixPointerEvents = "auto",
    log = false
  } = {}) {
    // Set local variables
    // > constant
    // > public
    /**
     * The window to receive mouseevents
     * @type {electron.BrowserWindow}
     */
    this.electronWindow = electronWindow;
    /**
     * The renderers window/global variable
     * @type {Object}
     */
    this.htmlWindow = htmlWindow;
    // > private
    /**
     * Latches the state of setIgnoreMouseEvents
     * @private
     */
    this._ignoringMouse = true;
    /**
     * Counts the amount of parallel getAnimationFrame loops (maxed to 1)
     * @private
     */
    this.altCheckHover._instanceCount = 0;
    /**
     * Event listener callback tied to 'TransparencyMouseFix' scope
     * @private
     */
    this._scopedOnMouseEvent = event => this.onMouseEvent(event);
    /**
     * Event listener callback tied to 'TransparencyMouseFix' scope
     * @private
     */
    this._scopedAltCheckHover = () => this.altCheckHover();
    this.log = log;
    this.fixPointerEvents = fixPointerEvents;

    // Register event listeners
    this.registerWindow();

    // Workaround for:
    //   https://github.com/electron/electron/issues/15376
    //   setIgnoreMouseEvents({forward: true}) stops forwarding
    //     after a page reload
    this.htmlWindow.addEventListener("beforeunload", function() {
      sessionStorage.setItem("etmf-reloaded", "true");
    });
  }

  get log() {
    return this._log;
  }
  /**
   * Enable or disable logging with an optional function for styling the console output.
   * @access public
   * @type {function}
   * @param  {(boolean|function)} fn true | false | function (logLevel,...msg) {<..>}
   */
  set log(fn) {
    if (typeof fn === "function") {
      this._log = fn;
    } else if (fn) {
      this._log = function(level, ...msg) {
        console[level](...consoleTag, ...msg);
      };
    } else {
      this._log = false;
    }
  }

  get fixPointerEvents() {
    return this._fixPointerEvents;
  }
  /**
   * Emulation for BrowserWindow.setIgnoreMouseEvents(true, {forward: true})
   * <li>Linux: has no support => fully replaced<br>
   * <li>Windows: (BUG) only after a reload (see electron/electron#15376)
   * @access public
   * @type {boolean}
   * @param {(boolean|string)} condition 'auto'=true | off'=false | 'force' | 'linux'
   */
  set fixPointerEvents(condition) {
    condition = condition
      ? typeof condition === "string"
        ? condition.toLowerCase()
        : true
      : false;

    switch (condition) {
      case false:
      case "off":
        this._fixPointerEvents = false;
        break;
      case "force":
        this._fixPointerEvents = true;
        break;
      case "linux":
        this._fixPointerEvents =
          process.platform !== "win32" && process.platform !== "darwin";
        break;
      case "auto":
      default:
        this._fixPointerEvents = false;
        if (process.platform === "win32") {
          if (sessionStorage.getItem("etmf-reloaded") === "true")
            this._fixPointerEvents = true;
        } else if (process.platform !== "darwin") {
          this._fixPointerEvents = true;
        }
        break;
    }

    // Start polling here so you can manually change the mode.
    // The function is adjusted so you can't have 2 parallel polling loops
    if (this._fixPointerEvents) this.altCheckHover(true);
  }

  /**
   * Register mouse movement event listeners and prepare styling.
   * @access public
   */
  registerWindow() {
    this.htmlWindow.addEventListener("mousemove", this._scopedOnMouseEvent);
    this.htmlWindow.addEventListener("dragover", this._scopedOnMouseEvent);
    let styleSheet = this.htmlWindow.document.createElement("style");
    styleSheet.classList.add("etmf-css");
    styleSheet.innerHTML = `
      html {pointer-events: none}
      body {position: relative}
    `;
    this.htmlWindow.addEventListener("beforeunload", () =>
      this.unregisterWindow(this.htmlWindow)
    );
    this.log && this.log("info", "Registered event listener");
  }

  /**
   * @access public
   * Remove event listeners.
   */

  unregisterWindow() {
    // keep for manual use
    this.htmlWindow.removeEventListener("mousemove", this._scopedOnMouseEvent);
    this.htmlWindow.removeEventListener("dragover", this._scopedOnMouseEvent);
    this.electronWindow.setIgnoreMouseEvents(false);
    this.log && this.log("info", "Removed event listener");
  }

  /**
   * Handles events like mousemove, dragover, ..
   * @param {(MouseEvent|DragEvent|Object.<string, HTMLElement>)} event
   */
  onMouseEvent(event) {
    this.log && this.log("debug", event);

    let sinkHole = event.target.classList.contains("etmf-void");

    // Handle dragging events
    if (event.type === "dragover") {
      event.preventDefault(); // fixes dropping files inside electron
      if (!sinkHole) return;
    }

    // Is the pointer is hovering an element that receives events?
    let reachedBottom =
      event.target === this.htmlWindow.document.documentElement;
    let ignoreEvents = sinkHole || reachedBottom;
    if (ignoreEvents) {
      // Latched state
      if (this._ignoringMouse) return;
      this._ignoringMouse = true;

      // Apply pass-through-window on pointer events
      if (this.fixPointerEvents) {
        // Circumvent forwarding of ignored mouse events
        // TODO: pause on minimize/hide/..
        this.electronWindow.setIgnoreMouseEvents(true, { forward: false });
        this.altCheckHover(true);
        this.log && this.log("info", "mouse off (polling)");
      } else {
        // Ignore mouse events with built-in forwarding
        this.electronWindow.setIgnoreMouseEvents(true, { forward: true });
        this.log && this.log("info", "mouse off (listening)");
      }
    } else {
      // Latched state
      if (!this._ignoringMouse) return;
      this._ignoringMouse = false;

      // Catch all mouse events
      this.electronWindow.setIgnoreMouseEvents(false);
      this.log && this.log("info", "mouse on (listening)");
    }
  }

  /**
   * Circumvent the lack of forwarded mouse events by polling mouse position with requestAnimationFrame
   * @param {boolean} once Don't request a next animationFrame
   * @returns {boolean} True if a element is found besides sinkholes or the main <html> element
   */
  altCheckHover(first = false) {
    // HINT: you can manually stop the loop by incrementing _instanceCount
    if (first) {
      this.altCheckHover._instanceCount++;
    }
    if (this.altCheckHover._instanceCount > 1) {
      this.log &&
        this.log(
          "warn",
          "aborting",
          this.altCheckHover._instanceCount,
          "parallel altCheckHover polls"
        );
      this.altCheckHover._instanceCount--;
      return null;
    }

    // If the cursor is within content bounds, check the element it's hovering,
    //   emulate a MouseMove event with the element as target
    let { x, y } = electron.screen.getCursorScreenPoint();
    let {
      x: left,
      y: top,
      width,
      height
    } = this.electronWindow.getContentBounds();
    this.log &&
      this.log("debug", {
        mouse: { x, y },
        window: { left, top, width, height }
      });
    if (x >= left && x < left + width && y >= top && y < top + height) {
      let tgt = document.elementFromPoint(x - left, y - top);
      // HINT: update classList checks when expanding code
      if (
        tgt &&
        !tgt.classList.contains("etmf-void") &&
        tgt !== this.htmlWindow.document.documentElement
      ) {
        this.onMouseEvent({ target: tgt });
        this.altCheckHover._instanceCount--;
        return true;
      }
    }

    requestAnimationFrame(this._scopedAltCheckHover);
    return false;
  }
}

export default TransparencyMouseFix;
