/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
// Import @tensorflow/tfjs or @tensorflow/tfjs-core
import * as tf from '@tensorflow/tfjs';
// Adds the WASM backend to the global backend registry.
// import '@tensorflow/tfjs-backend-wasm';

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
    // this._getScore();
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
              log: this.state.log + `\n[${new Date().toLocaleTimeString()}]视频读取完成，时长：${(duration / 60).toFixed(2)}min，开始加载ffmpeg`
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
    const per = duration / (frameNum - 1);
    const fileLen = 6;
    this.setState({
      log: this.state.log + `\n[${new Date().toLocaleTimeString()}]开始截帧，每${per}秒截1帧，截关键帧（I帧），共截${frameNum}帧`
    });
    // let per: string|number = 1 / (duration / frameNum);
    // per = (per < 0.01 ? 0.01 : per).toFixed(2);
    // this.setState({
    //   log: this.state.log + `\n[${new Date().toLocaleTimeString()}]开始截帧，每1秒截${per}帧，截关键帧（I帧），共截${frameNum}帧`
    // });
    // await this._ffmpeg.run('-threads', '3', '-y', '-loglevel', 'error', '-i', 'example.mp4', '-t', `${duration}`, '-filter_complex', `[0]fps=fps=${(1 / per)}:round=zero:start_time=-1[fps_0]`, '-map', '[fps_0]', '-pix_fmt', 'yuv420p', '-f', 'image2', '-frames', `${frameNum}`, `frame-%0${fileLen}d.jpg`); 
    // this.setState({
    //   log: this.state.log + `\n[${new Date().toLocaleTimeString()}]截帧完成`,
    // });
    
    // 渲染图片
    let frames = [];
    for (let i = 0; i < frameNum; i++) {
      const fileName = `frame-${this._getFrameFileNum(i + 1, fileLen)}.jpg`;
      // API文档：https://www.ffmpeg.org/ffmpeg.html
      // ffmpeg-filter： http://ffmpeg.org/ffmpeg-filters.html
      await this._ffmpeg.run('-ss', `${Math.floor(per * i)}`, '-threads', '3', '-y', '-loglevel', 'error', '-i', 'example.mp4', '-t', `${duration}`,  '-vsync', '2', '-pix_fmt', 'yuv420p',  '-f', 'image2', '-frames', `1`, fileName);
      // '-vf', "select='eq(pict_type,I)'",
      let frameData;
      try {
        frameData = this._ffmpeg.FS('readFile', fileName); // 从MEMFS获取图片二进制数据Uint8Array
      } catch(e) {
        console.error(e)
        break;
      }
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

  _getFrameFileNum(i: number, len: number) {
    const numStr = i.toString();
    const name = new Array(len - numStr.length).fill('0').join('') + numStr;
    return name;
  }

  async _getScore() {
    await tf.ready();
    // Define a model for linear regression.
    const model = tf.sequential();
    model.add(tf.layers.dense({units: 1, inputShape: [1]}));

    // Prepare the model for training: Specify the loss and the optimizer.
    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

    // Generate some synthetic data for training.
    const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
    const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);

    // Train the model using the data.
    await model.fit(xs, ys);
    // Use the model to do inference on a data point the model hasn't seen before:
    // Open the browser devtools to see the output
    (model.predict(tf.tensor2d([5], [1, 1])) as any).print();

    // Set the backend to WASM and wait for the module to be ready.
    // console.log('tf.ready')
    // await tf.setBackend('wasm');
    // console.log('tf wasm')
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
