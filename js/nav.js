class Nav extends TXT {
  constructor(txt, x, y, active = false) {
    super(txt);
    this.x = x;
    this.y = y;
    this.w = textWidth(txt);
    this.h = 25;
    this.active = active;
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    push();
    textSize(25);
    if (this.active || this.collide()) {
      noiseR = map(noise(noiseLocation), 0, 1, 220, 255);
    } else {
      noiseR = map(noise(noiseLocation), 0, 1, 120, 200);
    }
    fill(noiseR);

    if (!this.doneDisplayText) {
      if (this.txtFrame % 1 == 0) {
        this.displayedText += this.txtArray[this.txtIndex++];
        if (this.txtIndex >= this.txtArray.length) this.doneDisplayText = true;
      }
      text(this.displayedText, this.x, this.y - 30);
      this.txtFrame++;
    } else {
      text(this.txt, this.x, this.y - 30);
    }
    stroke(theme);
    strokeWeight(3);
    if (this.active) {
      let sWidth = textWidth(this.displayedText);
      let lineX = this.x - sWidth / 2;
      let lineY = this.y - 15;
      line(lineX, lineY, lineX + sWidth, lineY);
    }
    pop();
  }

  collide() {
    if (
      mouseX > this.x - this.w / 2 &&
      mouseX < this.x + this.w / 2 &&
      mouseY > this.y - this.h * 2 &&
      mouseY < this.y + this.h
    ) {
      cursor(HAND);
      return true;
    }
    return false;
  }
}
