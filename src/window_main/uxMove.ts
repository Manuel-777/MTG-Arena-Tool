import anime from "animejs";
import { EASING_DEFAULT } from "../shared/constants";

export default function uxMove(position: number): void {
  anime({
    targets: ".moving_ux",
    left: position + "%",
    easing: EASING_DEFAULT,
    duration: 350
  });
}
