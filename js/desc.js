class Desc extends TXT {
  constructor(txt, x, y, fs = 20) {
    super(txt);
    this.x = x;
    this.y = y;
    this.fs = fs;
    this.w = textWidth(txt);
    this.h = fs;
    this.doneDisplayText = true;
    let words = split(this.txt, " ");
    this.s = [];
    this.lineWidth = width * 0.95 - this.x;
    let numLines = this.w / this.lineWidth;
    let i = 0;
    let j = 0;
    while (i <= numLines + 1) {
      let currentW = 0;
      let line = [];
      let word = words[j];
      let wordWidth = textWidth(word + " ");
      while (currentW + wordWidth < this.lineWidth && j <= words.length) {
        word = words[j];
        wordWidth = textWidth(word + " ");
        append(line, word);
        j++;
        currentW += textWidth(word + " ");
      }
      let newLine = join(line, " ");
      append(this.s, newLine);
      i++;
    }
    this.txtArrays = [];
    this.txtIndexes = [];
    this.displayedTexts = [];
    for (let n = 0; n < this.s.length; n++) {
      append(this.txtArrays, split(this.s[n], ""));
      append(this.txtIndexes, 0);
      append(this.displayedTexts, "");
    }
  }

  display() {
    let o = 0;
    for (let i = 0; i < this.s.length; i++) {
      this.displayLine(i, this.y + o);
      o += 35;
    }
  }

  displayLine(index, lineY) {
    push();
    textAlign(LEFT);
    textSize(this.fs);
    fill(255);

    if (!this.doneDisplayText) {
      if (this.txtFrame % 1 == 0) {
        this.displayedTexts[index] +=
          this.txtArrays[index][this.txtIndexes[index]++];
        if (this.txtIndexes[index] >= this.txtArrays[index].length)
          this.doneDisplayText = true;
      }
      text(this.displayedTexts[index], this.x, lineY - 30);
      this.txtFrame++;
    } else {
      text(this.s[index], this.x, lineY - 30);
    }
    stroke(noiseR, 90, 90, 50);
    strokeWeight(3);
    pop();
  }

  collide() {
    if (
      mouseX > this.x - this.w / 2 &&
      mouseX < this.x + this.w / 2 &&
      mouseY > this.y - this.h * 2 &&
      mouseY < this.y + this.h
    ) {
      return true;
    }
    return false;
  }
}
