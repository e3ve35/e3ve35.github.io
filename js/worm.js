const WORMSPEED = 5;
let allWorms = [];

class Worm {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 3;
    this.color = random(10, 5);
    this.pickNewSpeed();
    this.timeToMoveInThisDirection = int(random(20, 60));
    this.timeMoving = 0;
  }

  lightUp(x, y, r) {
    let d = dist(x, y, this.x, this.y);

    // light up effect
    if (d < r) {
      fill(200);
    } else {
      fill(this.color);
    }

    noStroke();
    rect(this.x, this.y, this.size, this.size);

    // move
    this.x += this.xSpeed;
    this.y += this.ySpeed;

    // wrap around
    if (this.x > canvasW) {
      this.x = 0;
    }
    if (this.x < 0) {
      this.x = canvasW;
    }
    if (this.y > height) {
      this.y = 0;
    }
    if (this.y < 0) {
      this.y = height;
    }

    this.timeMoving++;
    if (this.timeMoving >= this.timeToMoveInThisDirection) {
      this.pickNewSpeed();
      this.timeMoving = 0;
      this.timeToMoveInThisDirection = int(random(20, 60));
    }
  }

  moveAndDisplay() {
    // light up effect
    fill(this.color);

    noStroke();
    rect(this.x, this.y, this.size, this.size);

    // move
    this.x += this.xSpeed;
    this.y += this.ySpeed;

    // wrap around
    if (this.x > canvasW) {
      this.x = 0;
    }
    if (this.x < 0) {
      this.x = canvasW;
    }
    if (this.y > height) {
      this.y = 0;
    }
    if (this.y < 0) {
      this.y = height;
    }

    this.timeMoving++;
    if (this.timeMoving >= this.timeToMoveInThisDirection) {
      this.pickNewSpeed();
      this.timeMoving = 0;
      this.timeToMoveInThisDirection = int(random(20, 60));
    }
  }

  pickNewSpeed() {
    this.xSpeed = 0;
    this.ySpeed = 0;

    let chance = random(100);
    if (chance < 25) {
      this.xSpeed = -WORMSPEED;
    } else if (chance < 50) {
      this.xSpeed = WORMSPEED;
    } else if (chance < 75) {
      this.ySpeed = -WORMSPEED;
    } else {
      this.ySpeed = WORMSPEED;
    }
  }
}
