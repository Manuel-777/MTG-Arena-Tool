import {
  WHITE,
  BLUE,
  BLACK,
  RED,
  GREEN,
  MULTI,
  COLORLESS
} from "./constants.js";

class Colors {
  /**
   * Creates a new colors object
   * Colors can be set by propierties matching the colors (w, u, b, r, g)
   **/
  constructor() {
    this.w = 0;
    this.u = 0;
    this.b = 0;
    this.r = 0;
    this.g = 0;

    return this;
  }

  set w(number: number) {
    this.w = number;
  }

  set u(number: number) {
    this.u = number;
  }

  set b(number: number) {
    this.b = number;
  }

  set r(number: number) {
    this.r = number;
  }

  set g(number: number) {
    this.g = number;
  }

  /**
   * Returns an array containing the colors as non-repeating constants
   * inside an array.
   */
  get() {
    let _arr = [];
    if (this.w) _arr.push(WHITE);
    if (this.u) _arr.push(BLUE);
    if (this.b) _arr.push(BLACK);
    if (this.r) _arr.push(RED);
    if (this.g) _arr.push(GREEN);

    return _arr;
  }

  /**
   * Return the color, multicolor or colorless.
   */
  getBaseColor() {
    if (this.length > 1) {
      return MULTI;
    } else if (this.length == 0) {
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
    for (var c of cost) {
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
    }

    return this;
  }

  /**
   * Adds an array mana cost to this one.
   */
  addFromArray(cost: number[]) {
    cost.forEach(color => {
      switch (color) {
        case WHITE:
          this.w += 1
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
    );
  }

  get w() {
    return this.w;
  }

  get u() {
    return this.u;
  }

  get b() {
    return this.b;
  }

  get r() {
    return this.r;
  }

  get g() {
    return this.g;
  }
}

export default Colors;
