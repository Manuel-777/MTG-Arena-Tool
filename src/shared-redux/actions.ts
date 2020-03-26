import { INCREMENT, DECREMENT } from "./constants";
import counterSlice from "./slices/counterSlice";

const actions = Array<(arg: any) => any>();
actions[INCREMENT] = counterSlice.actions.increment;
actions[DECREMENT] = counterSlice.actions.decrement;

export default actions;
