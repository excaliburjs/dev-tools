## Excalibur Dev Tools

This is a dev tool to help you debug your game written in excalibur.

This tool allows you to see information about the engine, currentScene, camera, clock, entities, and more!

UI is built using [tweakpane](https://cocopon.github.io/tweakpane/)

### Using dev tools in your excalibur game!

1. Install using npm

```
> npm install @excaliburjs/dev-tools
```

2. Inside your game code pass your game to the devtool

```typescript
const game = new ex.Engine({...});
const devtool = new DevTool(game);
```

3. Voila!

<img width="1153" alt="image" src="https://user-images.githubusercontent.com/612071/150462738-433536d9-28b0-486c-b5bb-8e8b4e2526fc.png">


### Building & Running Locally

Install node & npm 

* `npm install`
* `npm run start`
