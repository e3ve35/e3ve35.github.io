/**
 * Play start animation
 */
function startAnimation() {
  for (let i = 0; i < allWorms.length; i++) {
    allWorms[i].lightUp(canvasW / 2, height / 2, startR);
  }
  startFrame++;
  startR += startO;
  if (startR > canvasW / 3 && fade == false) {
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
  let p = projDesc[i][projDesc[i].length - 1];
  p.active = false;
  p.setAvailability();
}

/**
 * Unactivate link
 */
function disableLinks() {
  for (let i = 0; i < projDesc.length; i++) {
    let p = projDesc[i][projDesc[i].length - 1];
    p.active = false;
    p.setAvailability();
  }
}

/**
 * Make link clickable
 * @param {*} i
 */
function enableLink(i) {
  let p = projDesc[i][projDesc[i].length - 1];
  p.active = true;
  p.setAvailability();
}

/**
 * Make all links clickable
 */
function enableLinks() {
  for (let i = 0; i < projDesc.length; i++) {
    let p = projDesc[i][projDesc[i].length - 1];
    p.active = true;
    p.setAvailability();
  }
}

/**
 * Create all projects
 */
function createProjects() {
  projX = canvasW * 0.53;
  projY = canvasH * 0.27;
  descY = canvasH * 0.33;
  btnX = canvasW * 0.7;
  btnY = canvasH * 0.75;
  proj0 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is a website for users to create music compositions through visual interactions. My motivation for this project was to enhance the experience of computer music composition and make it more accessible for everyone.",
      projX,
      descY
    ),
    new Button(
      "GOMI",
      "https://drive.google.com/file/d/187dM0Xr1PB2zVEv9FvdQaDkEEt5CKbMA/view?usp=sharing",
      btnX,
      btnY
    ),
  ];

  proj1 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is a Procedural Content Generation algorithm that outputs natural-looking game environments. The algorithm is designed to generate flexible and customizable maps.",
      projX,
      descY
    ),
    new Button(
      "Random Island Generator",
      "https://github.com/e3ve35/random_island_generator",
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
      "https://github.com/e3ve35/maze_generator",
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
      "https://github.com/e3ve35/game-evolution-datavis",
      btnX,
      btnY
    ),
  ];

  proj5 = [
    new Desc("Overview", projX, projY, 25),
    new Desc(
      "This is a website for users to create pixel arts. It supports login, saving, and cross-device saving features.",
      projX,
      descY
    ),
    new Button(
      "Pixel Art Workshop 2020",
      "https://github.com/e3ve35/pixel_workshop",
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
  projsX = canvasW * 0.17;
  projsY = 0.27;
  projsOff = 0.12;
  projs = [
    new Link(
      "Graphical Music Interface",
      "https://e3ve35.github.io/GOMI/",
      projsX,
      canvasH * (projsY + projsOff * 0),
      true
    ),
    new Link(
      "Random Island Generator",
      "http://random",
      projsX,
      canvasH * (projsY + projsOff * 1),
      true
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
  conv1 = new Conversation([
    new TXT("Hello", 50),
    new TXT("I'm Evelyn", 50),
    new TXT("I'm a programmer and a game developer", 120),
  ]);

  // Nav menu
  navY = canvasH * 0.13;
  navs = [
    new Nav("MY PROJECTS", canvasW * 0.3, navY, true),
    new Nav("RESUME", canvasW * 0.5, navY),
    new Nav("CONTACT ME", canvasW * 0.7, navY),
  ];

  // Create project descriptions
  createProjects();
  renderProjects(canvasW, canvasH);

  lastHovered = 0;

  contacts = new TXT("Email: e3ve35@gmail.com");

  footer = new Footer(
    `Evelyn Wu ${new Date().getFullYear()}`,
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

  // Reposition welcome message
  conv1.updatePosition(canvasW / 2, canvasH / 2);

  // Reposition Nav menu
  navY = canvasH * 0.13;
  navs[0].updatePosition(canvasW * 0.3, navY);
  navs[1].updatePosition(canvasW * 0.5, navY);
  navs[2].updatePosition(canvasW * 0.7, navY);

  // Reposition proj links
  let linkX = canvasW * 0.17;
  let linkY = 0.27;
  let linkOff = 0.12;
  projs.map((link, i) => {
    link.updatePosition(linkX, canvasH * (linkY + linkOff * i));
  });

  // Reposition project descriptions
  let projX = canvasW * 0.53;
  let projY = canvasH * 0.27;
  descY = canvasH * 0.33;
  btnX = canvasW * 0.7;
  btnY = canvasH * 0.75;

  projDesc.map((desc) => {
    desc[0].updatePosition(projX, projY);
    desc[1].updatePosition(projX, descY);
    desc[2].updatePosition(btnX, btnY);
  });

  contacts.updatePosition(canvasW / 2, canvasH / 2);
  footer.updatePosition(canvasW / 2, canvasH * 0.95);
  if (linkCreated) viewCV.position(canvasW * 0.5 - 5, canvasH * 0.1 - 20);
}
