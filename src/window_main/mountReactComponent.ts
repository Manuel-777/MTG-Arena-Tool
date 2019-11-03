import ReactDOM from 'react-dom';
import { addNodeToUnmountReact } from './renderer-util';

// You should only use this function to mount react components currently.
// Once whole panes are in react, we can remove this usage.
// But this helps automate the cleanup of orphaned React components.
export default function mountReactComponent(component: any, target: Element) {
  ReactDOM.render(component, target);
  addNodeToUnmountReact(target);
}