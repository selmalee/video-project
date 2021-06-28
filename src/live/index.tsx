import React, { createRef, RefObject } from 'react';
import flvjs from 'flv.js/dist/flv.js';
import './index.css';

interface IProps {
}

interface IState {
}

class Live extends React.Component<IProps, IState> {

  constructor(props: IProps) {
    super(props);
    this.state = {
    };
  }

  _videoRef = (createRef() as RefObject<HTMLVideoElement>);

  componentDidMount() {
    // console.log('flvjs', flvjs)
    if (flvjs.isSupported()) {
      const videoElement = this._videoRef.current;
      try {
        const flvPlayer = flvjs.createPlayer({
          type: 'flv',
          url: 'https://seminelee.com/flv?app=live&stream=test'
        });
        flvPlayer.attachMediaElement(videoElement);
        flvPlayer.load();
        flvPlayer.play();
      } catch (e) {
        console.error(e);
      }
    }
  }

  render() {
    return (
      <div>
        <video ref={this._videoRef} className="video" controls={true} muted={true}></video>
      </div>
    );
  }

}

export default Live;
