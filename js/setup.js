function setup() {
  textFont(myFont);
  textSize(25);
  textAlign(CENTER);
  frameRate(60);

  let myCanvas = createCanvas(windowWidth, windowHeight);
  myCanvas.id("my-canvas");

  background(0);

  for (let i = 0; i < 1500; i++) {
    allWorms.push(new Worm(random(width), random(height)));
  }

  conv0 = new Conversation([new Passcode()]);
  conv1 = new Conversation([
    new TXT("Hello", 50),
    new TXT("I'm Evelyn", 50),
    new TXT("I'm a programmer and a game developer", 120),
  ]);
  navs = [
    new Nav("MY PROJECTS", width * 0.3, height * 0.1, true),
    new Nav("CV", width * 0.5, height * 0.1),
    new Nav("CONTACT ME", width * 0.7, height * 0.1),
  ];

  projsX = width * 0.2;
  projsY = 0.24;
  projsOff = 0.12;
  projs = [
    new Link(
      "Random Island Generator",
      "http://random",
      projsX,
      height * (projsY + projsOff * 0),
      true
    ),
    new Link(
      "Terraria Inspired Game",
      "http://random",
      projsX,
      height * (projsY + projsOff * 1)
    ),
    new Link(
      "Garden on the Desk",
      "http://random",
      projsX,
      height * (projsY + projsOff * 2),
      true
    ),
    new Link(
      "Maze Generator & Solver",
      "http://random",
      projsX,
      height * (projsY + projsOff * 3)
    ),
    new Link(
      "Evolution of Video Games",
      "http://random",
      projsX,
      height * (projsY + projsOff * 4)
    ),
    new Link(
      "Pixel Art Workshop 2020",
      "http://random",
      projsX,
      height * (projsY + projsOff * 5)
    ),
  ];

  projX = width * 0.53;
  proj0 = [
    new Desc("Overview", projX, height * 0.25, 25),
    new Desc(
      "Random Island Generator is a Procedural Content Generation algorithm that outputs natural-looking game environments. The algorithm is designed to generate flexible and customizable maps.",
      projX,
      height * 0.3
    ),
    new Button(
      "Random Island Generator",
      "https://github.com/zhixuanevelynwu/random_island_generator"
    ),
  ];

  proj1 = [
    new Desc("Overview", projX, height * 0.25, 25),
    new Desc(
      "This is an open-world game inspired by Terraria. In the game, you can collect materials, craft furnitures, and interact with different items. A complete walkthrough of the game can be found below.",
      projX,
      height * 0.3
    ),
    new Button(
      "Terraria Inspired Game",
      "https://drive.google.com/file/d/14A3ED_Bb8Y9gSPYR-Q-LoUoXUU_xSChf/view?usp=sharing"
    ),
  ];

  proj2 = [
    new Desc("Overview", projX, height * 0.25, 25),
    new Desc(
      "This is an augmented reality garden simulation. The program allows users to plant a miniature garden through their webcam and view other essential parts of wildlife. The simulation makes use of speech recognition and AR trackers as user interaction. ",
      projX,
      height * 0.3
    ),
    new Button(
      "Garden on the Desk",
      "https://drive.google.com/file/d/1CcCR003ayRCFdHPvCzm7G4QfyzgTci4k/view?usp=sharing"
    ),
  ];

  proj3 = [
    new Desc("Overview", projX, height * 0.25, 25),
    new Desc(
      "This is a random maze generator & maze solver that is implemented using various maze generation algorithms including Sidewinder, Wilson's, Random Walk, Aldous-Broder, etc.",
      projX,
      height * 0.3
    ),
    new Button(
      "Maze Generator & Solver",
      "https://github.com/zhixuanevelynwu/maze_generator"
    ),
  ];

  proj4 = [
    new Desc("Overview", projX, height * 0.25, 25),
    new Desc(
      "This is a story-telling visualization system of the history of worldwide video games. It includes up to three views and supports linked highlighting and filters.",
      projX,
      height * 0.3
    ),
    new Button(
      "Evolution of Video Games",
      "https://github.com/zhixuanevelynwu/game-evolution-datavis"
    ),
  ];

  proj5 = [
    new Desc("Overview", projX, height * 0.25, 25),
    new Desc(
      "Pixel Art Workshop is a website for users to create pixel arts. It supports login, saving, and cross-device saving features.",
      projX,
      height * 0.3
    ),
    new Button(
      "Pixel Art Workshop 2020",
      "https://github.com/zhixuanevelynwu/pixel_workshop"
    ),
  ];

  projDesc = [proj0, proj1, proj2, proj3, proj4, proj5];
  lastHovered = 0;

  passcode = new Passcode();
  // viewCV = createA("files/CV_evelyn.pdf", "CV", "_blank");
  viewCV = createA(
    "https://docs.google.com/document/d/1BcptW6lur3Te2B3zGoOZHS2SZ0z15W2j8YuBsHUR5bM/edit?usp=sharing",
    "CV",
    "_blank"
  );
  viewCV.position(width * 0.5 - 5, height * 0.1 - 42);
  viewCV.style("z-index: 100");
  // new Button(
  //   "Click to Download",
  //   "files/CV_evelyn.pdf",
  //   width / 2,
  //   height / 2,
  //   width / 2 - 105,
  //   height / 2 - 10
  // );

  contacts = [new TXT("Email: zhixuanw@andrew.cmu.edu")];

  footer = new Footer(
    "Evelyn Wu 2021",
    100,
    width / 2,
    height * 0.93,
    false,
    20
  );
}
