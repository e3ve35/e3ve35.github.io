class Button {
  constructor(
    txt,
    link,
    x = width * 0.68,
    y = height * 0.65,
    lx = width * 0.68 - 150,
    ly = height * 0.65 - 10,
    fs = 20
  ) {
    this.txt = txt;
    this.link = link;
    this.x = x;
    this.y = y;
    this.lx = lx;
    this.ly = ly;
    this.w = textWidth(txt) + 90;
    this.h = fs + 40;
    this.a = createA(this.link, this.txt, "_blank");
    this.active = false;
  }

  setAvailability() {
    if (this.active == false) {
      this.a.style("z-index: -100");
    } else if (this.active == true) {
      this.a.style("z-index: 1");
    }
  }

  display() {
    push();
    rectMode(CENTER);
    textAlign(CENTER);
    textSize(this.fs);
    noiseR = map(noise(noiseLocation), 0, 1, 150, 255);
    stroke(noiseR, 150, 150);
    strokeWeight(2.5);
    noFill();
    rect(this.x, this.y, this.w, this.h, 5);
    fill(noiseR, 150, 150);
    noStroke();
    this.a.position(this.lx, this.ly);
    text(this.txt, this.x, this.y + 8);
    pop();
  }
}
