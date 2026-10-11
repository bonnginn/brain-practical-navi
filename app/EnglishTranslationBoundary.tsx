import {Component,type ReactNode} from 'react';

// Optional DOM translation must not unmount an ongoing learner activity.
export class EnglishTranslationBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(!this.state.failed)return this.props.children;
    return <p role="status" data-no-localize>English translations could not be loaded. Some text remains in Japanese. Your current activity is preserved.</p>;
  }
}
