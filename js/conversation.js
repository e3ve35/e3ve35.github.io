class Conversation {
  constructor(conv) {
    this.conv = conv;
    this.convIndex = 0;
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
