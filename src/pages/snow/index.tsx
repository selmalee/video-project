import React, { createRef, RefObject } from 'react';
import './index.less';

interface IProps {
}

interface IPoint {
  left: number
  top: number
  width: number
  height: number
  opacity: number
  duration: number
  delay?: number
  img?: string
}

interface IState {
  points: IPoint[]
  points2: IPoint[]
  points3: IPoint[]
}

function Point(props: IPoint) {
  const Img = (imgProps: {src?: string}) => {
    if (imgProps.src) {
      return <img src={props.img} />
    }
    return <React.Fragment></React.Fragment>
  }
  return <div className="point" style={{
    left: props.left.toFixed(1) + '%',
    top: props.top.toFixed(1) + '%',
    width: props.width.toFixed(1) + 'px',
    height: props.height.toFixed(1) + 'px',
    opacity: props.opacity.toFixed(1),
    animationDuration: props.duration.toFixed(1) + 's',
    animationDelay: props.delay + 's',
  }}>
    <Img src={props.img}></Img>
  </div>
}

class Snow extends React.Component<IProps, IState> {

  constructor(props: IProps) {
    super(props);
    this.state = {
      points: [],
      points2: [],
      points3: [],
    };
  }

  _start?: number = undefined;
  _bgRef = (createRef() as RefObject<HTMLDivElement>);

  componentDidMount() {
    this.setState({
      points: this._generateSnow(),
      points2: this._generateSnow(3),
      points3: this._generateSnow(6),
    });
    
    window.requestAnimationFrame(this._animation.bind(this));
  }
  _animation(ts: number) {
    if (!this._start) {
      this._start = ts;
    }
    const elapsed = ts - this._start;
    if (this._bgRef.current) {
      if (elapsed < 3000) {
        this._bgRef.current.style.transform = `translate(${Math.round(elapsed / 10)}px, 0)`; // 向右移动
      } else if (elapsed < 6000) {
        this._bgRef.current.style.transform = `translate(${Math.round((6000 - elapsed) / 10)}px, 0)`; // 回到原点
      } else {
        this._start = ts; // 循环
      }
    }
    window.requestAnimationFrame(this._animation.bind(this));
  }

  _generateSnow(delay?: number) {
    const num = 15;
    let points = [];
    for (let i = 0; i < num; i++) {
      points.push({
        left: Math.random() * 100,
        top: Math.random() * 90,
        width: 5 + Math.random() * 5,
        height: 5 + Math.random() * 5,
        opacity: 0.4 + Math.random() * 0.6,
        duration: 4 + Math.random() * 5,
        delay: delay || 0,
      });
    }
    return points;
  }

  render() {
    return (
      <div className="bg" ref={this._bgRef}>
        {
          this.state.points.map((item, id) => (
            <Point {...item} key={id}></Point>
          ))
        }
        {
          this.state.points2.map((item, id) => (
            <Point {...item} key={id}></Point>
          ))
        }
        {
          this.state.points3.map((item, id) => (
            <Point {...item} key={id}></Point>
          ))
        }
      </div>
    );
  }

}

export default Snow;
