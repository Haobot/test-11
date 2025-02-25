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
  // 确保轨迹可见性
  noFill();
  strokeWeight(2);
  bigBallAngle += 0.01;

  // 更新小球位置
  for (let i = 0; i < balls.length; i++) {
    let distance = balls[i].pos.mag();
    if (distance > bigBallRadius) {
      balls[i].pos.setMag(bigBallRadius - 10);
    }
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      balls[i].checkBallCollision(balls[j]);
    }
    balls[i].update();
    balls[i].display();
    balls[i].checkCollision();
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

    // 绘制轨迹
    beginShape();
    noFill();
    for (let i = 0; i < this.trail.length; i++) {
      let pos = this.trail[i];
      let alpha = map(i, 0, this.trail.length, 255, 150); // 从255到150的透明度变化，确保轨迹可见
      let tailColor = color(this.color.levels[0], this.color.levels[1], this.color.levels[2], alpha); // 使用小球的颜色
      stroke(tailColor); // 设置尾焰颜色和透明度
      strokeWeight(map(i, 0, this.trail.length, 15, 3)); // 从粗到细的尾焰效果
      vertex(pos.x, pos.y, pos.z);
    }
    endShape();
  }

  checkCollision() {
    let distance = this.pos.mag();
    if (distance + this.r > bigBallRadius) {
      this.pos.setMag(bigBallRadius - this.r);
      this.vel.reflect(this.pos.copy().normalize());
    }
  }

  checkBallCollision(other) {
    let distance = p5.Vector.dist(this.pos, other.pos);
    if (distance < this.r + other.r) {
      let normal = p5.Vector.sub(this.pos, other.pos).normalize();
      let relativeVelocity = p5.Vector.sub(this.vel, other.vel);
      let velocityAlongNormal = relativeVelocity.dot(normal);

      if (velocityAlongNormal > 0) {
        return;
      }

      let restitution = 1; // 弹性系数
      let impulseMagnitude = -(1 + restitution) * velocityAlongNormal;
      impulseMagnitude /= (1 / this.r + 1 / other.r);

      let impulse = normal.mult(impulseMagnitude);
      this.vel.add(impulse.div(this.r));
      other.vel.sub(impulse.div(other.r));
    }
  }
}