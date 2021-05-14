import './App.css';
import React from 'react';
import { createFFmpeg } from '@ffmpeg/ffmpeg';
// import exampleMp4 from './static/example.mp4';

interface IProps {

}

interface IState {
  log: string
  frames: string[]
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      log: '',
      frames: []
    };
    this.onChangeFile = this.onChangeFile.bind(this);
  }

  // _runSuccess = false
  _ffmpeg = createFFmpeg({ log: true })

  componentDidMount() {
    this.setState({
      log: this.state.log + `[${new Date().toLocaleTimeString()}]componentDidMount`
    });
    // this._getFrames();
  }

  onChangeFile(e: any) {
    const files = e.target.files;
    if (files.length > 0) {
      this.setState({
        frames: [],
        log: this.state.log + `\n[${new Date().toLocaleTimeString()}]选择文件完成`
      });

      const file = files[0];
      const reader = new FileReader();
      // File转成Uint8Array
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          const arrayBuffer = e.target?.result;
          const data = new Uint8Array(arrayBuffer);
          // 获取视频时长
          const videoDom = document.createElement('video');
          videoDom.src = URL.createObjectURL(file);
          videoDom.onloadeddata = () => {
            const duration = videoDom.duration;
            this.setState({
              log: this.state.log + `\n[${new Date().toLocaleTimeString()}]视频读取完成，时长：${duration / 60}min，开始加载ffmpeg`
            });
            this._getFrames(duration, data);
          }
          // this._getFrames(25, data);
          // this.setState({
          //   log: this.state.log + `\n[${new Date().toLocaleTimeString()}]视频读取完成，开始加载ffmpeg`
          // });
        }
      }
    }
  }

  async _getFrames(duration: number, videoData?: Uint8Array) {
    // 加载ffmpeg
    if (!this._ffmpeg.isLoaded()) {
      await this._ffmpeg.load();
    }
    this.setState({
      log: this.state.log + `\n[${new Date().toLocaleTimeString()}]ffmpeg加载完成`
    });

    // 读取视频数据
    // if (videoData) {
    this._ffmpeg.FS('writeFile', 'example.mp4', videoData); // 先保存到MEMFS
    // } else {
    //   this._ffmpeg.FS('writeFile', 'example.mp4', await fetchFile(exampleMp4)); // 先保存到MEMFS
    // }

    // 截帧
    const frameNum = 8;
    const per = Math.floor(duration / frameNum);
    this.setState({
      log: this.state.log + `\n[${new Date().toLocaleTimeString()}]开始截帧，每${per}秒截1帧，截关键帧（I帧），共截${frameNum}帧`
    });
    // let per: string|number = 1 / (duration / frameNum);
    // per = (per < 0.01 ? 0.01 : per).toFixed(2);
    // this.setState({
    //   log: this.state.log + `\n[${new Date().toLocaleTimeString()}]开始截帧，每1秒截${per}帧，截关键帧（I帧），共截${frameNum}帧`
    // });
    // await this._ffmpeg.run('-i', 'example.mp4', '-r', per, '-vf', "select='eq(pict_type\,I)'", '-f', 'image2', '-frames', `${frameNum}`, 'frame-%04d.jpg'); 
    
    // 渲染图片
    let frames = [];
    for (let i = 0; i < frameNum; i++) {
      const fileName = `frame-000${i + 1}.jpg`;
      // API文档：https://www.ffmpeg.org/ffmpeg.html
      // ffmpeg-filter： http://ffmpeg.org/ffmpeg-filters.html
      await this._ffmpeg.run('-ss', `${per * i}`, '-i', 'example.mp4', '-vf', "select='eq(pict_type,I)'", '-vsync', '2', '-f', 'image2', '-frames', `1`, fileName);
      const frameData = this._ffmpeg.FS('readFile', fileName); // 从MEMFS获取图片二进制数据Uint8Array
      const src = URL.createObjectURL(
        new Blob([frameData.buffer], { type: 'image/jpg' })
      ); // Uint8Array转成dataURL
      frames.push(src);
      this._ffmpeg.FS('unlink', fileName); // 从MEMFS中删除
    }
    this.setState({
      frames,
      log: this.state.log + `\n[${new Date().toLocaleTimeString()}]截帧完成`,
    });
    this._ffmpeg.FS('unlink', 'example.mp4');
  }

  render() {
    return (
      <div className="App">
        <div className="log">{this.state.log}</div>
        <input type="file" onChange={this.onChangeFile}/>
        <div>
        {
          this.state.frames.map((item, id) => (
            <div className="frame" key={id}>
              <img src={item} alt={'推荐封面' + id}/>
            </div>
          ))
        }
        </div>
      </div>
    );
  }

}

export default App;
