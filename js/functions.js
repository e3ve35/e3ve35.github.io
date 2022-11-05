function startAnimation() {
  for (let i = 0; i < allWorms.length; i++) {
    allWorms[i].lightUp(width / 2, height / 2, startR);
  }
  startFrame++;
  startR += startO;
  if (startR > width / 5 && fade == false) {
    startO *= -1;
    fade = true;
  }
}

function displayWorms() {
  for (let i = 0; i < allWorms.length; i++) {
    allWorms[i].moveAndDisplay();
  }
}

function disableLink(i) {
  let p = this.projDesc[i][this.projDesc[i].length - 1];
  p.active = false;
  p.setAvailability();
}

function disableLinks() {
  for (let i = 0; i < this.projDesc.length; i++) {
    let p = this.projDesc[i][this.projDesc[i].length - 1];
    p.active = false;
    p.setAvailability();
  }
}

function enableLink(i) {
  let p = this.projDesc[i][this.projDesc[i].length - 1];
  p.active = true;
  p.setAvailability();
}

function enableLinks() {
  for (let i = 0; i < this.projDesc.length; i++) {
    let p = this.projDesc[i][this.projDesc[i].length - 1];
    p.active = true;
    p.setAvailability();
  }
}

let myFont;
function preload() {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
}
