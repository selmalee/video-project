import React from 'react';
import flvjs from 'flv.js/dist/flv.js';

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

  componentDidMount() {
    // console.log('flvjs', flvjs)
    if (flvjs.isSupported()) {
      const videoElement = (document.getElementById('videoElement') as HTMLMediaElement);
      try {
        const flvPlayer = flvjs.createPlayer({
          type: 'flv',
          url: 'http://159.75.213.179/flv/test?app=live0'
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
        <video id="videoElement" controls={true}></video>
      </div>
    );
  }

}

export default Live;
