import { WHITE, BLUE, BLACK, RED, GREEN, MULTI, COLORLESS } from "./constants";

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
  equalTo(color: Colors): boolean {
    return (
      this.w == color.w &&
      this.u == color.u &&
      this.b == color.b &&
      this.r == color.r &&
      this.g == color.g
    );
  }

  getColorArchetype(): string {
    const colorFlags = {
      NONE: 0,
      W: 1,
      U: 2,
      B: 4,
      R: 8,
      G: 16
    };

    let currentColorFlags: number = colorFlags.NONE;
    if (this.w) currentColorFlags |= colorFlags.W;
    if (this.u) currentColorFlags |= colorFlags.U;
    if (this.b) currentColorFlags |= colorFlags.B;
    if (this.r) currentColorFlags |= colorFlags.R;
    if (this.g) currentColorFlags |= colorFlags.G;

    switch (currentColorFlags) {
      case 1:
        return "Mono White";
      case 2:
        return "Mono Blue";
      case 3: //wu
        return "Azorius";
      case 4:
        return "Mono Black";
      case 5: //wb
        return "Orzhov";
      case 6: //ub
        return "Dimir";
      case 7: //wub
        return "Esper";
      case 8:
        return "Mono Red";
      case 9: //wr
        return "Boros";
      case 10: //ur
        return "Izzet";
      case 11: //wur
        return "Jeskai";
      case 12: //br
        return "Rakdos";
      case 13: //wbr
        return "Mardu";
      case 14: //ubr
        return "Grixis";
      case 15: //wubr
        return "WUBR";
      case 16:
        return "Mono Green";
      case 17: //wg
        return "Selesnya";
      case 18: //ug
        return "Simic";
      case 19: //wug
        return "Bant";
      case 20: //bg
        return "Golgari";
      case 21: //wbg
        return "Abzan";
      case 22: //ubg
        return "Sultai";
      case 23: //wubg
        return "WUBG";
      case 24: //rg
        return "Gruul";
      case 25: //wrg
        return "Naya";
      case 26: //urg
        return "Temur";
      case 27: //wurg
        return "WURG";
      case 28: //brg
        return "Jund";
      case 29: //wbrg
        return "WBRG";
      case 30: //ubrg
        return "UBRG";
      case 31:
        return "5-color";
      default:
        return "";
    }
  }
}

export default Colors;
