const numBalls = 600;
let balls = [];
let bigBallRadius = 150;
let bigBallAngle = 0;
let angleX = 0;
let angleY = 0;
let zoom = 1;
let isMiddleMousePressed = false;
let fpsHistory = []; // 用于存储最近的FPS值
const fpsHistorySize = 10; // 移动平均的窗口大小

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL); // 修改为窗口宽度和高度
  angleMode(DEGREES);
  frameRate(60); // 设置目标帧率为60 FPS
  // 滑杆居中显示
  const sliderWidth = 200;
  const sliderX = (windowWidth - sliderWidth) / 2;
  const sliderY = windowHeight - 50;
  
  bigBallRadiusSlider = createSlider(50, 200, bigBallRadius);
  bigBallRadiusSlider.position(sliderX, sliderY);
  bigBallRadiusSlider.style('width', sliderWidth + 'px');
  
  // 添加大球直径文字和数值显示
  diameterLabel = createP('大球直径');
  diameterLabel.position(sliderX + 40, sliderY - 80);
  diameterLabel.style('font-size', '30px');
  diameterLabel.style('color', '#000');
  
  diameterValue = createP(bigBallRadius);
  diameterValue.position(sliderX + sliderWidth + 10, sliderY - 43);
  diameterValue.style('font-size', '30px');
  diameterValue.style('color', '#000');
  for (let i = 0; i < numBalls; i++) {
    balls.push(new Ball());
  }
}

function draw() {
  background(255); // 更改背景颜色为白色，确保轨迹可见
  rotateX(angleX); // 使用angleX进行X轴旋转
  rotateY(angleY); // 使用angleY进行Y轴旋转
  scale(zoom); // 应用缩放
  noFill();
  stroke(0, 100);
  strokeWeight(2);
  bigBallRadius = bigBallRadiusSlider.value();
  diameterValue.html(bigBallRadius);
  sphere(bigBallRadius); // 使用sphere代替ellipse

  // 更新小球位置
  for (let ball of balls) {
    ball.update();
    ball.checkCollision();
  }

  // 使用空间分区优化碰撞检测
  const gridSize = bigBallRadius / 5;
  const grid = new Map();
  
  // 将小球分配到网格
  for (let ball of balls) {
    const x = Math.floor(ball.pos.x / gridSize);
    const y = Math.floor(ball.pos.y / gridSize);
    const z = Math.floor(ball.pos.z / gridSize);
    const key = `${x},${y},${z}`;
    
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(ball);
  }

  // 只检查相邻网格中的小球
  for (let [key, cellBalls] of grid) {
    for (let i = 0; i < cellBalls.length; i++) {
      for (let j = i + 1; j < cellBalls.length; j++) {
        cellBalls[i].checkBallCollision(cellBalls[j]);
      }
    }
  }

  // 批量绘制小球和轨迹
  for (let ball of balls) {
    ball.display();
  }

  // 更新FPS显示
  fpsHistory.push(frameRate());
  if (fpsHistory.length > fpsHistorySize) {
    fpsHistory.shift();
  }
  const averageFPS = fpsHistory.reduce((sum, fps) => sum + fps, 0) / fpsHistory.length;
  document.getElementById('fps-display').textContent = `FPS: ${averageFPS.toFixed(2)}`;
}

function mouseDragged() {
  console.log("mouseDragged called");
  // 检测鼠标是否在滑杆区域内（x:10-160, y:窗口高度-30到窗口高度-10）
  const inSliderArea = mouseX > 10 && mouseX < 160 &&
                       mouseY > (windowHeight - 30) &&
                       mouseY < (windowHeight - 10);
  if (!inSliderArea) {
    angleY += (mouseX - pmouseX) * 0.1;
    angleX -= (mouseY - pmouseY) * 0.1;
  }
}

function mouseWheel(event) {
  // 根据滚轮的滚动方向调整缩放
  zoom -= event.delta * 0.001; // 修改为减法以对调缩放方向
  zoom = constrain(zoom, 0.1, 10); // 限制缩放范围
}

class Ball {
  constructor() {
    this.pos = p5.Vector.random3D().mult(random(bigBallRadius - 10)); // 修改为3D向量
    this.vel = p5.Vector.random3D().mult(random(1, 2)); // 修改为3D向量，加快速度
    this.r = 3; // 修改为3以减大小球
    this.color = color(random(255), random(255), random(255)); // 添加颜色属性
    this.trail = []; // 添加轨迹数组
  }

  update() {
    this.pos.add(this.vel);
    let distance = this.pos.mag();
    if (distance + this.r > bigBallRadius) {
      this.pos.setMag(bigBallRadius - this.r);
    }
    this.trail.push(this.pos.copy()); // 更新轨迹点
    if (this.trail.length > 10) { // 修改轨迹点数量限制到50
      this.trail.shift();
    }
  }

  display() {
    fill(this.color); // 使用小球的颜色
    noStroke();
    push();
    translate(this.pos.x, this.pos.y, this.pos.z); // 添加z轴位置
    sphere(this.r); // 使用sphere代替ellipse
    pop();

    // 使用更高效的轨迹绘制方式
    if (this.trail.length > 1) {
      stroke(this.color);
      strokeWeight(1);
      beginShape(LINES);
      for (let i = 1; i < this.trail.length; i++) {
        const prev = this.trail[i - 1];
        const curr = this.trail[i];
        vertex(prev.x, prev.y, prev.z);
        vertex(curr.x, curr.y, curr.z);
      }
      endShape();
    }
  }

  checkCollision() {
    let distance = this.pos.mag();
    if (distance + this.r > bigBallRadius) {
      this.pos.setMag(bigBallRadius - this.r);
      this.vel.reflect(this.pos.copy().normalize());
    }
  }

  checkBallCollision(other) {
    // 重用Vector对象
    const temp1 = p5.Vector.sub(this.pos, other.pos);
    const distance = temp1.mag();
    
    if (distance < this.r + other.r) {
      const normal = temp1.normalize();
      const temp2 = p5.Vector.sub(this.vel, other.vel);
      const velocityAlongNormal = temp2.dot(normal);

      if (velocityAlongNormal > 0) {
        return;
      }

      const restitution = 1; // 弹性系数
      let impulseMagnitude = -(1 + restitution) * velocityAlongNormal;
      impulseMagnitude /= (1 / this.r + 1 / other.r);

      const impulse = normal.mult(impulseMagnitude);
      this.vel.add(impulse.div(this.r));
      other.vel.sub(impulse.div(other.r));
    }
  }
}