class Conversation {
  constructor(conv) {
    this.conv = conv;
    this.convIndex = 0;
  }

  updatePosition(x, y) {
    this.conv.map((c) => {
      c.updatePosition(x, y);
    });
  }

  display() {
    let c = this.conv[this.convIndex];
    c.display();
    if (c.convFrame % c.displayTime == 0) {
      if (this.convIndex >= this.conv.length - 1) {
        showHome = true;
      } else {
        this.convIndex++;
      }
    }
    c.convFrame++;
  }
}
