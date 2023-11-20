/**
 * Load assets
 */
function preload() {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
}

/**
 * Don't want to update canvas WH continuously while user resizes the window.
 * So we use debounce to optimize this.
 */
function debounce(func, wait) {
  let timeout;
  return function () {
    const context = this,
      args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      func.apply(context, args);
    }, wait);
  };
}

// Only debounce on non-mobile devices
function isMobileDevice() {
  return (
    typeof window.orientation !== "undefined" ||
    navigator.userAgent.indexOf("IEMobile") !== -1
  );
}

/**
 * Updates current scale to inner scale
 */
function updateCurrentWH() {
  canvasW = Math.max(innerWidth - 10, minWidth);
  canvasH = Math.max(innerHeight - 40, minHeight);
  resizeCanvas(canvasW, canvasH);
  currentScreenWidth = innerWidth;
  currentScreenHeight = innerHeight;
  renderPage();
}

/**
 * Initialize the page
 */
function setup() {
  let myCanvas = createCanvas(innerWidth - 10, innerHeight - 40);

  canvasW = Math.max(innerWidth - 10, minWidth);
  canvasH = Math.max(innerHeight - 40, minHeight);
  resizeCanvas(canvasW, canvasH);
  currentScreenWidth = innerWidth;
  currentScreenHeight = innerHeight;

  myCanvas.id("my-canvas");
  currentScreenWidth = innerWidth;
  currentScreenHeight = innerHeight;
  for (let i = 0; i < 1000; i++) {
    allWorms.push(new Worm(random(innerWidth), random(innerHeight)));
  }
  createPage();
  if (!isMobileDevice()) {
    let debouncedUpdate = debounce(updateCurrentWH, 150);
    window.addEventListener("resize", debouncedUpdate);
  }
}

function draw() {
  if (startR > 0) {
    background(0, 10);
    startAnimation();
  } else {
    // Create CV link for resume
    if (!linkCreated) {
      viewCV = createA(
        // "https://docs.google.com/document/d/1BcptW6lur3Te2B3zGoOZHS2SZ0z15W2j8YuBsHUR5bM/edit?usp=sharing",
        "./resume.pdf",
        "RESUME",
        "_blank"
      );
      viewCV.position(canvasW * 0.5 - 5, canvasH * 0.1 - 20);
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
        contacts.display();
      }
    }
    footer.display();
  }
}
