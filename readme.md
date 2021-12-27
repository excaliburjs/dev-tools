## Excalibur Dev Tools

This is a dev tool to help you debug your game written in excalibur.

This tool allows you to see information about the engine, currentScene, camera, clock, entities, and more!

UI is built using [tweakpane](https://cocopon.github.io/tweakpane/)

### Using dev tools in your excalibur game!

```typescript
const game = new ex.Engine({...});
const devtool = new DevTool(game);
```

### Building & Running Locally

Install node & npm 

* `npm install`
* `npm run start`


### TODO Currently Unspported

- [ ] Support timers