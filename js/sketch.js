function draw() {
  if (startR > 0) {
    background(0, 10);
    startAnimation();
  } else {
    if (!linkCreated) {
      viewCV = createA(
        "https://docs.google.com/document/d/1BcptW6lur3Te2B3zGoOZHS2SZ0z15W2j8YuBsHUR5bM/edit?usp=sharing",
        "CV",
        "_blank"
      );
      viewCV.position(width * 0.5 - 5, height * 0.1 - 42);
      viewCV.style("z-index: 100");
      linkCreated = true;
    }
    background(0, 50);
    displayWorms();
    if (!showContent && !showHome) {
      conv0.display();
    }
    if (showContent && !showHome) {
      conv1.display();
    }
    cursor(ARROW);
    if (showHome) {
      for (let i = 0; i < navs.length; i++) {
        navs[i].display();
        navs[i].collide();
      }
      if (navs[0].active || navs[1].active) {
        for (let i = 0; i < projs.length; i++) {
          projs[i].display();
          projs[i].collide();
        }

        for (let i = 0; i < projs.length; i++) {
          if (projs[i].active) {
            for (let j = 0; j < projDesc[i].length; j++) {
              projDesc[i][j].display();
            }
            enableLink(i);
            lastHovered = i;
          } else {
            disableLink(i);
          }
        }

        projs[lastHovered].active = true;
        enableLink(lastHovered);

        for (let i = 0; i < projDesc[lastHovered].length; i++) {
          projDesc[lastHovered][i].display();
        }
      } else if (navs[2].active) {
        disableLinks();

        for (let i = 0; i < contacts.length; i++) {
          contacts[i].display();
        }
      }
    }
    footer.display();
  }
}
