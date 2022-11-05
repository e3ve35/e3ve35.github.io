function setup() {
  textFont(myFont);
  textSize(25);
  textAlign(CENTER);
  frameRate(60);

  let myCanvas = createCanvas(windowWidth - 10, windowHeight - 40);
  myCanvas.id("my-canvas");

  background(0);

  for (let i = 0; i < 1000; i++) {
    allWorms.push(new Worm(random(width), random(height)));
  }

  // Welcome message
  conv0 = new Conversation([new Passcode()]);
  conv1 = new Conversation([
    new TXT("Hello", 50),
    new TXT("I'm Evelyn", 50),
    new TXT("I'm a programmer and a game developer", 120),
  ]);

  // Nav menu
  navY = height * 0.13;
  navs = [
    new Nav("MY PROJECTS", width * 0.3, navY, true),
    new Nav("CV", width * 0.5, navY),
    new Nav("CONTACT ME", width * 0.7, navY),
  ];

  // Create projects
  projsX = width * 0.17;
  projsY = 0.27;
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

  // Create project descriptions
  projX = width * 0.53;
  projY = height * 0.27;
  proj0 = [
    new Desc("Overview", projX, projY, 25),
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
    new Desc("Overview", projX, projY, 25),
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
    new Desc("Overview", projX, projY, 25),
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
    new Desc("Overview", projX, projY, 25),
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
    new Desc("Overview", projX, projY, 25),
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
    new Desc("Overview", projX, projY, 25),
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

  contacts = [new TXT("Email: zhixuanw@andrew.cmu.edu")];

  footer = new Footer(
    "Evelyn Wu 2022",
    100,
    width / 2,
    height * 0.99,
    false,
    20
  );
}
