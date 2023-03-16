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

/*
  THIS ISN'T AN ACTUAL PASSCODE SYSTEM!!!!!!
  JUST HERE FOR FUN :))
*/
class Passcode extends TXT {
  constructor() {
    super("Enter a Passcode To View:", 100, canvasW / 2, height / 2, 25);
    this.input = createInput();
    this.input.id("passcode");
    this.code = "GUEST";
  }

  checkCode(str) {
    if (str === this.code) {
      showContent = true;
    } else {
      console.log("Your Passcode is " + this.code);
    }
  }

  display() {
    super.display();
    if (this.doneDisplayText) this.passcodeBox(5);
  }

  thinking() {
    if (this.doneDisplayText) {
      let l = loading[loadingIndex];
      push();
      fill(noiseR, 90, 90, 50);
      text(l, canvasW / 2, height / 2 + 170);
      pop();
      if (loadingFrame % 10 == 0) {
        loadingIndex++;
        loadingIndex = loadingIndex % loading.length;
      }
      loadingFrame++;
    }
  }

  passcodeBox(n) {
    let w = textWidth(this.txt);
    let d = 40;
    let m = 20;
    let x = canvasW / 2 - w / 2 + m;
    let y = height / 2 + 30;
    let inputX = x + 5;
    let rectW = (w - d * (n - 1) - m * 2) / n;
    let rectH = (rectW / 4) * 5;
    let rectO = rectW + d;
    let txtX = x + rectW / 2;
    let txtY = y + rectH / 2 + 8;
    let txtO = rectW + d;

    push();

    this.input.position(inputX, y + 5);
    this.input.size(w - m * 2, rectH);
    let inputVal = trim(this.input.value());
    let userInput = split(inputVal, "");
    if (userInput.length > n) {
      this.input.value(userInput[userInput.length - 1]);
    }
    if (userInput.length == n) {
      this.checkCode(inputVal);
    }
    fill(noiseR, 90, 90, 50);
    noStroke();
    for (let i = 0; i < Math.min(userInput.length, n); i++) {
      text(userInput[i], txtX, txtY);
      txtX += txtO;
    }
    noFill();
    stroke(noiseR, 90, 90, 50);
    strokeWeight(3);
    for (let i = 0; i < n; i++) {
      rect(x, y, rectW, rectH);
      x += rectO;
    }

    pop();
  }
}
