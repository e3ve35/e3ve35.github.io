function keyPressed() {
  if (showHome == false) {
    showHome = true;
  }
  console.log(keyCode);
  if (showContent) {
    if (keyIsDown(13)) {
      startAnimation();
      showHome = true;
    }
  }
}

function mousePressed() {
  if (showHome == false) {
    showHome = true;
  }
  for (let i = 0; i < navs.length; i += 2) {
    if (navs[i].collide()) {
      for (let j = 0; j < navs.length; j += 2) {
        navs[j].active = false;
      }
      navs[i].active = true;
    }
  }

  if (navs[0].active) {
    for (let i = 0; i < projs.length; i++) {
      if (projs[i].collide()) {
        for (let j = 0; j < projs.length; j++) {
          projs[j].active = false;
        }
        projs[i].active = true;
      }
    }
  }
}
