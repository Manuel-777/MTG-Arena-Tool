import {
  WHITE,
  BLUE,
  BLACK,
  RED,
  GREEN,
  MULTI,
  COLORLESS
} from "./constants";

class Colors {
  private w: number;
  private u: number;
  private b: number;
  private r: number;
  private g: number;

  /**
   * Creates a new colors object
   * Colors can be set by properties matching the colors (w, u, b, r, g)
   **/
  constructor() {
    this.w = 0;
    this.u = 0;
    this.b = 0;
    this.r = 0;
    this.g = 0;

    return this;
  }

  /**
   * Returns an array containing the colors as non-repeating constants
   * inside an array.
   */
  get() {
    let _arr = [];
    if (this.w !== 0) _arr.push(WHITE);
    if (this.u !== 0) _arr.push(BLUE);
    if (this.b !== 0) _arr.push(BLACK);
    if (this.r !== 0) _arr.push(RED);
    if (this.g !== 0) _arr.push(GREEN);

    return _arr;
  }

  /**
   * Return the color, multicolor or colorless.
   */
  getBaseColor() {
    if (this.length > 1) {
      return MULTI;
    } else if (this.length === 0) {
      return COLORLESS;
    }
    return this.get()[0];
  }

  /**
   * Returns the number of colors
   */
  get length() {
    let ret = 0;
    if (this.w > 0) ret += 1;
    if (this.u > 0) ret += 1;
    if (this.b > 0) ret += 1;
    if (this.r > 0) ret += 1;
    if (this.g > 0) ret += 1;

    return ret;
  }

  /**
   * Adds a string mana cost to this class.
   */
  addFromCost(cost: string[]) {
    cost.forEach(c => {
      switch (c) {
        case "w":
          this.w += 1;
          break;
        case "u":
          this.u += 1;
          break;
        case "b":
          this.b += 1;
          break;
        case "r":
          this.r += 1;
          break;
        case "g":
          this.g += 1;
          break;
      }
    });

    return this;
  }

  /**
   * Adds an array mana cost to this one.
   */
  addFromArray(cost: number[]) {
    cost.forEach(color => {
      switch (color) {
        case WHITE:
          this.w += 1;
          break;
        case BLUE:
          this.u += 1;
          break;
        case BLACK:
          this.b += 1;
          break;
        case RED:
          this.r += 1;
          break;
        case GREEN:
          this.g += 1;
          break;
      }
    });

    return this;
  }

  /**
   * Merges another instance of Colors into this one.
   */
  addFromColor(color: Colors) {
    this.w += color.w;
    this.u += color.u;
    this.b += color.b;
    this.r += color.r;
    this.g += color.g;

    return this;
  }

  /**
   * Checks if this color is equal to another
   */
  equalTo(color: Colors) {
    return (
      this.w == color.w &&
      this.u == color.u &&
      this.b == color.b &&
      this.r == color.r &&
      this.g == color.g
    )
  }
}

export default Colors;
