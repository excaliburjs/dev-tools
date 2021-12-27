import { Actor, Color, DisplayMode, Engine, vec, CollisionType, Vector, Scene, Label, Font, FontUnit, Text } from "excalibur";
import { DevTool } from "./dev-tools";

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
    font: new Font({
        family: 'Times New Roman',
        size: 30,
        unit: FontUnit.Px
    }),
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
    pos: vec(400, 300),
});
game.add(label2);

game.addScene("other scene", new Scene());

game.start();

const devtool = new DevTool(game);
