// Import @tensorflow/tfjs or @tensorflow/tfjs-core
// import * as tf from '@tensorflow/tfjs';
// Adds the WASM backend to the global backend registry.
// import '@tensorflow/tfjs-backend-wasm';

import './index.css';
import React from 'react';
import { createFFmpeg } from '@ffmpeg/ffmpeg';
// import exampleMp4 from './static/example.mp4';


interface IProps {

}

interface IState {
  log: string
  frames: string[]
}

class Frame extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      log: '',
      frames: []
    };
    this.onChangeFile = this.onChangeFile.bind(this);
  }

  _success = false
  _duration = 0
  _resolution = ''
  _ffmpeg?: any = this._createFFmpeg();
  _timeout?: any = undefined

  componentDidMount() {
    this.setState({
      log: this.state.log + `[${new Date().toLocaleTimeString()}]componentDidMount`
    });
    if (this._ffmpeg) {
      this._ffmpeg.load();
    }
  }

  _createFFmpeg() {
    return createFFmpeg({
      log: false,
      logger: this._ffmpegLogger.bind(this),
      mainName: 'main',
    });
  }

  _ffmpegLogger({ message }: { message: string }) {
    if (message.indexOf('Duration') > -1) {
      const duration = message.split(',')[0].split(':').slice(1).map(item => Number(item));
      this._duration = duration[0] * 3600 + duration[1] * 60 + duration[2];
    } else if (message.indexOf(': Video: ') > -1) {
      const resolution = message.split(',')[2].split(' ')[1].split('x');
      let width = Number(resolution[0]);
      let height = Number(resolution[1]);
      if (width < height) {
        height = height * (256 / width);
        width = 256;
      } else {
        width = width * (256 / height);
        height = 256;
      }
      this._resolution = `${Math.round(width)}x${Math.round(height)}`;
    }
  }

  async onChangeFile(e: any) {
    const files = e.target.files;
    if (files.length > 0) {
      const file = files[0];
      this._success = false;
      this.setState({
        frames: [],
        log: this.state.log + `\n[${new Date().toLocaleTimeString()}]选择文件完成`
      });

      this._runFFmpeg(file);
    }
  }

  async _runFFmpeg(file: File) {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    try {

      const bufferArr = (await this._fileToUint8Array(file) as Uint8Array);
      // 加载ffmpeg
      if (!this._ffmpeg) {
        this._ffmpeg = createFFmpeg();
      }
      if (!this._ffmpeg.isLoaded()) {
        await this._ffmpeg.load();
      }
      // 读取视频数据
      this._ffmpeg.FS('writeFile', 'example.mp4', bufferArr); // 先保存到MEMFS
      this.setState({
        log: this.state.log + `\n[${new Date().toLocaleTimeString()}]ffmpeg读取视频完成`
      });
      // 获取视频时长
      this._ffmpeg.setLogger(this._ffmpegLogger.bind(this));
      await this._ffmpeg.run('-i', 'example.mp4', '-loglevel', 'info');
      this._ffmpeg.setLogger(() => {});
      this.setState({
        log: this.state.log + `\n[${new Date().toLocaleTimeString()}]时长：${(this._duration / 60).toFixed(2)}min，分辨率：${this._resolution}，开始加载ffmpeg`
      });
      // 截帧
      await this._getFrames();
      this._success = true;

      // 超时处理
      this._timeout = setTimeout(() => {
        if (!this._success && this._ffmpeg) {
          this._ffmpeg.exit();
          this._ffmpeg = undefined;
          this.setState({
            log: this.state.log + `\n[${new Date().toLocaleTimeString()}]截图超时，终止ffmpeg运行`
          });
        }
      }, 10000);

    } catch(e) {
      // 报错，终止ffmpeg
      console.error(e)
      this.setState({
        log: this.state.log + `\n[${new Date().toLocaleTimeString()}]截图终止，错误：${e.message}，终止ffmpeg`
      });
    }
  }

  // File转成Uint8Array
  _fileToUint8Array(file: File) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    return new Promise((resolve) => {
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          const arrayBuffer = e.target?.result;
          const data = new Uint8Array(arrayBuffer);
          resolve(data);
        }
      }
    })
  }

  async _getFrames() {
    if (!this._duration) {
      throw new Error('no duration');
    }
    if (!this._resolution) {
      throw new Error('no resolution');
    }
    if (!this._ffmpeg) {
      throw new Error('no _ffmpeg');
    }
    // 截帧
    // const isGetScore = this._duration > 50;
    const frameNum = 8;
    const per = this._duration / (frameNum - 1);
    const fileLen = 6;
    this.setState({
      log: this.state.log + `\n[${new Date().toLocaleTimeString()}]开始截帧，每${per}秒截1帧，共截${frameNum}帧`
    });

    // let per: string|number = 1 / (this._duration / frameNum);
    // per = (per < 0.01 ? 0.01 : per).toFixed(2);
    // await this._ffmpeg.run('-threads', '3', '-y', '-loglevel', 'error', '-i', 'example.mp4', '-t', `${this._duration}`, '-filter_complex', `[0]fps=fps=${(1 / per)}:round=zero:start_time=-1[fps_0]`, '-map', '[fps_0]', '-pix_fmt', 'yuv420p', '-f', 'image2', '-frames', `${frameNum}`, `frame-%0${fileLen}d.jpg`); 
    for (let i = 0; i < frameNum; i++) {
      const fileName = `frame-${this._getFrameFileNum(i + 1, fileLen)}.jpg`;
      // API文档：https://www.ffmpeg.org/ffmpeg.html
      // ffmpeg-filter： http://ffmpeg.org/ffmpeg-filters.html
      await this._ffmpeg.run('-ss', `${Math.floor(per * i)}`, '-threads', '3', '-y', '-loglevel', 'quiet', '-i', 'example.mp4', '-s', this._resolution,  '-f', 'image2', '-frames', `1`, fileName);
      // '-vf', "select='eq(pict_type,I)'",
    }
    this._ffmpeg.FS('unlink', 'example.mp4');
    this.setState({
      log: this.state.log + `\n[${new Date().toLocaleTimeString()}]截帧完成`,
    });
    
    // 渲染图片
    let frames = [];
    for (let i = 0; i < frameNum; i++) {
      const fileName = `frame-${this._getFrameFileNum(i + 1, fileLen)}.jpg`;
      const frameData = this._ffmpeg.FS('readFile', fileName); // 从MEMFS获取图片二进制数据Uint8Array
      const src = URL.createObjectURL(
        new Blob([frameData.buffer], { type: 'image/jpg' })
      ); // Uint8Array转成dataURL
      frames.push(src);
      this._ffmpeg.FS('unlink', fileName); // 从MEMFS中删除
    }
    this.setState({
      frames,
    });
  }

  _getFrameFileNum(i: number, len: number) {
    const numStr = i.toString();
    const name = new Array(len - numStr.length).fill('0').join('') + numStr;
    return name;
  }

  // async _getScore() {
  //   await tf.ready();
  //   // Define a model for linear regression.
  //   const model = tf.sequential();
  //   model.add(tf.layers.dense({units: 1, inputShape: [1]}));

  //   // Prepare the model for training: Specify the loss and the optimizer.
  //   model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

  //   // Generate some synthetic data for training.
  //   const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
  //   const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);

  //   // Train the model using the data.
  //   await model.fit(xs, ys);
  //   // Use the model to do inference on a data point the model hasn't seen before:
  //   // Open the browser devtools to see the output
  //   (model.predict(tf.tensor2d([5], [1, 1])) as any).print();

  //   // Set the backend to WASM and wait for the module to be ready.
  //   // console.log('tf.ready')
  //   // await tf.setBackend('wasm');
  //   // console.log('tf wasm')
  // }

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

export default Frame;
