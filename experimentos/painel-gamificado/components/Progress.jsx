import {progress} from '../domain/engine.mjs';
import XPProgress from './XPProgress';
export {XPBar} from './XPProgress';
export default function Progress({xp}) {
  return <div className="progress-card"><XPProgress value={progress(xp)} compact/></div>;
}
