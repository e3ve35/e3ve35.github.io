/**
 * Play start animation
 */
function startAnimation() {
  for (let i = 0; i < allWorms.length; i++) {
    allWorms[i].lightUp(canvasW / 2, height / 2, startR);
  }
  startFrame++;
  startR += startO;
  if (startR > canvasW / 5 && fade == false) {
    startO *= -1;
    fade = true;
  }
}

/**
 * Display background animation
 */
function displayWorms() {
  for (let i = 0; i < allWorms.length; i++) {
    allWorms[i].moveAndDisplay();
  }
}

/**
 * Display desc links
 * @param {*} i
 */
function disableLink(i) {
  let p = this.projDesc[i][this.projDesc[i].length - 1];
  p.active = false;
  p.setAvailability();
}

/**
 * Unactivate link
 */
function disableLinks() {
  for (let i = 0; i < this.projDesc.length; i++) {
    let p = this.projDesc[i][this.projDesc[i].length - 1];
    p.active = false;
    p.setAvailability();
  }
}

/**
 * Make link clickable
 * @param {*} i
 */
function enableLink(i) {
  let p = this.projDesc[i][this.projDesc[i].length - 1];
  p.active = true;
  p.setAvailability();
}

/**
 * Make all links clickable
 */
function enableLinks() {
  for (let i = 0; i < this.projDesc.length; i++) {
    let p = this.projDesc[i][this.projDesc[i].length - 1];
    p.active = true;
    p.setAvailability();
  }
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
}

/**
 * Create all projects
 */
function createProjects() {
  projX = canvasW * 0.53;
  projY = canvasH * 0.27;
  descY = canvasH * 0.33;
  btnX = canvasW * 0.7;
  btnY = canvasH * 0.7;
  proj0 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "Random Island Generator is a Procedural Content Generation algorithm that outputs natural-looking game environments. The algorithm is designed to generate flexible and customizable maps.",
      projX,
      descY
    ),
    new Button(
      "Random Island Generator",
      "https://github.com/zhixuanevelynwu/random_island_generator",
      btnX,
      btnY
    ),
  ];

  proj1 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is an open-world game inspired by Terraria. In the game, you can collect materials, craft furnitures, and interact with different items. A complete walkthrough of the game can be found below.",
      projX,
      descY
    ),
    new Button(
      "Terraria Inspired Game",
      "https://drive.google.com/file/d/14A3ED_Bb8Y9gSPYR-Q-LoUoXUU_xSChf/view?usp=sharing",
      btnX,
      btnY
    ),
  ];

  proj2 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is an augmented reality garden simulation that uses speech recognition and feature tracking to let users plant a miniature garden through their webcam.",
      projX,
      descY
    ),
    new Button(
      "Garden on the Desk",
      "https://drive.google.com/file/d/1CcCR003ayRCFdHPvCzm7G4QfyzgTci4k/view?usp=sharing",
      btnX,
      btnY
    ),
  ];

  proj3 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is a random maze generator & maze solver that is implemented using various maze generation algorithms including Sidewinder, Wilson's, Random Walk, Aldous-Broder, etc.",
      projX,
      descY
    ),
    new Button(
      "Maze Generator & Solver",
      "https://github.com/zhixuanevelynwu/maze_generator",
      btnX,
      btnY
    ),
  ];

  proj4 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is a story-telling data visualization system of the history of worldwide video games. It includes up to three views and supports linked highlighting and filters.",
      projX,
      descY
    ),
    new Button(
      "Evolution of Video Games",
      "https://github.com/zhixuanevelynwu/game-evolution-datavis",
      btnX,
      btnY
    ),
  ];

  proj5 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "Pixel Art Workshop is a website for users to create pixel arts. It supports login, saving, and cross-device saving features.",
      projX,
      descY
    ),
    new Button(
      "Pixel Art Workshop 2020",
      "https://github.com/zhixuanevelynwu/pixel_workshop",
      btnX,
      btnY
    ),
  ];

  projDesc = [proj0, proj1, proj2, proj3, proj4, proj5];
}

/**
 * Render all projects overview
 */
function renderProjects() {
  // Create projects
  projsX = canvasW * 0.17;
  projsY = 0.27;
  projsOff = 0.12;
  projs = [
    new Link(
      "Random Island Generator",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 0),
      true
    ),
    new Link(
      "Terraria Inspired Game",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 1)
    ),
    new Link(
      "Garden on the Desk",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 2),
      true
    ),
    new Link(
      "Maze Generator & Solver",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 3)
    ),
    new Link(
      "Evolution of Video Games",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 4)
    ),
    new Link(
      "Pixel Art Workshop 2020",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 5)
    ),
  ];
}

/**
 * Create the homepage
 */
function createPage() {
  textFont(myFont);
  textSize(25);
  textAlign(CENTER);
  frameRate(60);

  background(0);

  // Welcome message
  conv0 = new Conversation([new Passcode()]);
  conv1 = new Conversation([
    new TXT("Hello", 50),
    new TXT("I'm Evelyn", 50),
    new TXT("I'm a programmer and a game developer", 120),
  ]);

  // Nav menu
  navY = canvasH * 0.13;
  navs = [
    new Nav("MY PROJECTS", canvasW * 0.3, navY, true),
    new Nav("CV", canvasW * 0.5, navY),
    new Nav("CONTACT ME", canvasW * 0.7, navY),
  ];

  // Create project descriptions
  createProjects();
  renderProjects(canvasW, canvasH);

  lastHovered = 0;

  passcode = new Passcode();

  contacts = [new TXT("Email: zhixuanw@andrew.cmu.edu")];

  footer = new Footer(
    "Evelyn Wu 2022",
    100,
    canvasW / 2,
    canvasH * 0.95,
    false,
    20
  );
  if (linkCreated) viewCV.position(canvasW * 0.5 - 5, canvasH * 0.1 - 20);
}

/**
 * Create the homepage
 */
function renderPage() {
  textFont(myFont);
  textSize(25);
  textAlign(CENTER);
  frameRate(60);

  background(0);

  // Welcome message
  conv0 = new Conversation([new Passcode()]);
  conv1 = new Conversation([
    new TXT("Hello", 50),
    new TXT("I'm Evelyn", 50),
    new TXT("I'm a programmer and a game developer", 120),
  ]);

  // Reposition Nav menu
  navY = canvasH * 0.13;
  navs[0].updatePosition(canvasW * 0.3, navY);
  navs[1].updatePosition(canvasW * 0.5, navY);
  navs[2].updatePosition(canvasW * 0.7, navY);

  renderProjects(canvasW, canvasH);

  // Reposition project descriptions
  projX = canvasW * 0.53;
  projY = canvasH * 0.27;
  descY = canvasH * 0.33;
  btnX = canvasW * 0.7;
  btnY = canvasH * 0.7;

  createProjects();

  projDesc = [proj0, proj1, proj2, proj3, proj4, proj5];

  passcode = new Passcode();

  contacts = [new TXT("Email: zhixuanw@andrew.cmu.edu")];

  footer = new Footer(
    "Evelyn Wu 2022",
    100,
    canvasW / 2,
    canvasH * 0.95,
    false,
    20
  );
  if (linkCreated) viewCV.position(canvasW * 0.5 - 5, canvasH * 0.1 - 20);
}
