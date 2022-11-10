class Button {
  constructor(txt, link, x, y, fs = 20) {
    this.txt = "View Project";
    this.link = link;
    this.x = x;
    this.y = y;
    this.w = textWidth(this.txt) + 90;
    this.h = fs + 40;
    this.textX = x - this.w / 2 + 55;
    this.textY = y;
    this.a = createA(this.link, this.txt, "_blank");
    this.active = false;
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
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
    stroke(220, 150, 150);
    strokeWeight(2.5);
    noFill();
    rect(this.x, this.y, this.w, this.h, 5);
    fill(220, 150, 150);
    noStroke();
    this.a.position(this.textX, this.textY);
    text(this.txt, this.x, this.y + 8);
    pop();
  }
}
