import { Actor, Color, DisplayMode, Engine, vec, CollisionType, Vector, Scene, Label, Font, FontUnit, Text, ParticleEmitter, Timer, Input, Random } from "excalibur";
import { DevTool } from "./dev-tools";

const rand = new Random(1234)

const fontOptions = {
    family: 'Times New Roman',
    size: 30, 
    unit: FontUnit.Px
};

const game = new Engine({
    width: 800,
    height: 600,
    displayMode: DisplayMode.FitScreen
});

const a1 = new Actor({
    name: 'actor 1',
    pos: vec(100, 100),
    width: 100,
    height: 100,
    color: Color.Red
});
a1.addChild(new Actor({
    name: 'child 1',
    pos: vec(100, 0),
    width: 30,
    height: 30,
    color: Color.Blue
}));
game.add(a1);

const circle = new Actor({
    name: 'circle',
    pos: vec(300, 300),
    radius: 60,
    color: Color.Rose
});
game.add(circle);

const ground = new Actor({
    name: 'ground',
    pos: vec(0, 500),
    anchor: Vector.Zero,
    width: 1200,
    height: 20,
    collisionType: CollisionType.Fixed,
    color: Color.Green.darken(.5)
});
game.add(ground);

const text = new Text({
    text: "Yo it's text",
    font: new Font(fontOptions),
});
const label = new Actor({
    pos: vec(400, 100)
});
label.graphics.use(text);
label.graphics.add("other text", new Text({text: "Other Text!!! 💪"}))
game.add(label);


const label2 = new Label({
    text: "Label text",
    font: text.font as Font,
    color: Color.Green,
    pos: vec(400, 300),
});
game.add(label2);

const actorWithOnlyPosition = new Actor({
    name: 'only position',
    pos: vec(400, 400)
});
game.add(actorWithOnlyPosition);

const timer1 = new Timer({
    interval: 3000,
    repeats: true
});
game.add(timer1);
timer1.start();

const timer2 = new Timer({
    interval: 10000,
    numberOfRepeats: 3,
    repeats: true
});
game.add(timer2);
timer2.start();

const otherScene = new Scene();
game.addScene("other scene", otherScene);
otherScene.add(new Actor({
    name: "Actor in another scene",
    pos: vec(100, 100),
    width: 100,
    height: 100,
    color: Color.Red
}));

otherScene.add(new Actor({
    name: "Actor in another scene without things",
    pos: vec(200, 200),
}));
var emitter = new ParticleEmitter({
    pos: vec(100, 300),
    width: 2,
    height: 2,
    minVel: 417,
    maxVel: 589,
    minAngle: Math.PI,
    maxAngle: Math.PI * 2,
    isEmitting: true,
    emitRate: 494,
    opacity: 0.84,
    fadeFlag: true,
    particleLife: 2465,
    maxSize: 20.5,
    minSize: 10,
    acceleration: vec(0, 460),
    beginColor: Color.Blue,
    endColor: Color.Red,
    // particleSprite: blockSpriteLegacy,
    particleRotationalVelocity: Math.PI / 10,
    randomRotation: true
  });
otherScene.add(emitter);

game.start();

const dynamicSceneKey = 'dynamic scene';

const createDynamicScene = () => {
    if(dynamicSceneKey in game.scenes) {
        game.removeScene(dynamicSceneKey);
    }

    const dynamicScene = new Scene();

    for (let index = 0; index < rand.integer(1, 5); index++) {        
        const label = new Actor({ 
            pos: vec(10, 30 + (index * 30)),
            anchor: vec(0, 0),
        });
        const text = new Text({
            text: `Dynamically added scene with varying entities ${index} 👋`,
            font: new Font({ ...fontOptions, size: 18 }),
            color: Color.Orange,
        });
        label.graphics.use(text);
        dynamicScene.add(label);
    }
    
    game.addScene(dynamicSceneKey, dynamicScene);
};

game.input.keyboard.on("press", (evt: Input.KeyEvent) => {
    switch(evt.key) {
        // Add a dynamic scene, without activating it. This should still be reflected in dev tools
        case Input.Keys.N:
            createDynamicScene();
            break;
            
        // Add a dynamic scene and activate it
        case Input.Keys.A:
            createDynamicScene();
            game.goToScene(dynamicSceneKey);
            break;
    } 
});

const devtool = new DevTool(game);
