class Footer extends TXT {
  constructor(txt, link, x, y, active = false, fs = 25) {
    super(txt);
    this.link = link;
    this.x = x;
    this.y = y;
    this.w = textWidth(txt);
    this.h = fs;
    this.fs = fs;
    this.active = active;
    this.noiseLocation = 0;
  }

  thinking() {}

  display() {
    push();
    textAlign(CENTER);
    textSize(this.fs);
    if (this.active) {
      noiseR = map(noise(this.noiseLocation), 0, 1, 220, 255);
      this.x = width * 0.15;
    } else {
      noiseR = map(noise(this.noiseLocation), 0, 1, 120, 200);
    }
    fill(noiseR);
    this.noiseLocation += 0.1;

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
    stroke(noiseR, 90, 90, 50);
    strokeWeight(3);
    pop();
    this.thinking();
  }
}
