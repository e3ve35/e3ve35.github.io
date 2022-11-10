/**
 * Load assets
 */
function preload() {
  myFont = loadFont("Share_Tech_Mono/ShareTechMono-Regular.ttf");
}

/**
 * Initialize the page
 */
function setup() {
  let myCanvas = createCanvas(innerWidth - 10, innerHeight - 40);
  updateCurrentWH();
  myCanvas.id("my-canvas");
  currentScreenWidth = innerWidth;
  currentScreenHeight = innerHeight;
  for (let i = 0; i < 1000; i++) {
    allWorms.push(new Worm(random(innerWidth), random(innerHeight)));
  }
  createPage();
}
