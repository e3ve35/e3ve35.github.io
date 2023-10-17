const loading = ["\\", "|", "/", "--"];
let loadingFrame = 0;
let loadingIndex = 0;
let noiseR;

class TXT {
  constructor(
    txt,
    displayTime = 100,
    x = canvasW / 2,
    y = height / 2,
    fs = 25
  ) {
    this.txt = txt;
    this.x = x;
    this.y = y;
    this.fs = fs;
    this.txtFrame = 0;
    this.txtIndex = 0;
    this.displayedText = "";
    this.convFrame = 1;
    this.displayTime = displayTime;
    this.doneDisplayText = false;
    this.txtArray = split(this.txt, "");
    this.show = true;
  }

  thinking() {
    let l = loading[loadingIndex];
    push();
    fill(90, 90, noiseR, 150);
    text(l, this.x, this.y + 50);
    pop();
    if (loadingFrame % 10 == 0) {
      loadingIndex++;
      loadingIndex = loadingIndex % loading.length;
    }
    loadingFrame++;
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
  }

  display() {
    push();
    textSize(this.fs);
    noiseR = map(noise(noiseLocation), 0, 1, 150, 255);
    fill(255);
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
    stroke(90, 90, noiseR, 150);
    strokeWeight(3);
    let sWidth = textWidth(this.displayedText);
    let lineX = this.x - sWidth / 2;
    line(lineX, this.y, lineX + sWidth, this.y);
    pop();
    this.thinking();
  }
}
