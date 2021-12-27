import { Actor, BodyComponent, ColliderComponent, CollisionGroup, CollisionGroupManager, CollisionType, Color, Engine, Graphic, GraphicsComponent, MotionComponent, Physics, PointerSystem, Scene, ScreenDimension, TestClock, TransformComponent, Vector } from "excalibur";
import { BladeApi, FolderApi, ListApi, Pane, SliderApi, TabApi, TabPageApi } from "tweakpane";

export class DevTool {
    public pane: Pane
    public tabs: TabApi;
    public pointerSystem: PointerSystem;
    pointerPos: { x: number, y: number } = { x: 0, y: 0 };
    highlighted: number[] = [-1];
    selectedEntity: Actor | null = null;
    selectedEntityId: number = -1;
    currentResolution: ScreenDimension;
    currentViewport: ScreenDimension;
    resolutionText: BladeApi<any>;
    viewportText: BladeApi<any>;
    screenFolder: FolderApi;

    // tabs
    selectedEntityTab: TabPageApi;
    selectedEntityFolder: FolderApi;
    screenTab: TabPageApi;
    cameraTab: TabPageApi;
    clockTab: TabPageApi;
    physicsTab: TabPageApi;
    debugTab: TabPageApi;
    pointerPosInput: any;

    constructor(public engine: Engine) {
        this.pane = new Pane({
            title: 'Excalibur Dev Tools',
            expanded: true
        });

        this._buildMain();

        this.tabs = this.pane.addTab({
            pages: [
                { title: 'Entity' },
                { title: 'Screen' },
                { title: 'Camera' },
                { title: 'Clock' },
                { title: 'Physics' },
                { title: 'Settings' }
            ]
        });
        this.selectedEntityTab = this.tabs.pages[0];
        this.screenTab = this.tabs.pages[1];
        this.cameraTab = this.tabs.pages[2];
        this.clockTab = this.tabs.pages[3];
        this.physicsTab = this.tabs.pages[4];
        this.debugTab = this.tabs.pages[5];

        this.pointerSystem = engine.currentScene.world.systemManager.get(PointerSystem);
        engine.debug.transform.showPosition = true;
        this.selectedEntityFolder = this.selectedEntityTab.addFolder({
            title: 'Selected',
        });


        this.buildScreen();
        this.buildCamera();
        this.buildClock();
        this.buildPhysics();
        this.buildDebugSettingsTab();

        setInterval(() => {
            this.update(this)
        }, 30)

        this.start();
    }

    private _findSceneName(scene: Scene): string {
        for (let key in this.engine.scenes) {
            if (scene === this.engine.scenes[key]) {
                return key;
            }
        }
    }

    private _buildMain() {
        this.pane.addInput({ debug: false }, 'debug').on('change', () => {
            this.engine.toggleDebug();
        });

        this.pane.addMonitor(this.engine.clock.fpsSampler, 'fps', {
            view: 'graph',
            label: 'fps (0 - 120)',
            min: 0,
            max: 120
        });

        let currentSceneName = '';
        let scenes: { text: string, value: string }[] = []
        for (let key in this.engine.scenes) {
            if (this.engine.currentScene === this.engine.scenes[key]) {
                currentSceneName = key;
            }
            scenes.push({ text: key, value: key })
        }

        let numberEntitiesBlade: BladeApi<any>;
        const scenePicker = this.pane.addBlade({
            view: 'list',
            label: 'current scene',
            options: scenes,
            value: currentSceneName
        }) as ListApi<string>;

        scenePicker.on('change', ev => {
            this.engine.goToScene(ev.value);
            numberEntitiesBlade.dispose();
            numberEntitiesBlade = this.pane.addBlade({
                view: 'text',
                label: 'number of entities',
                value: this.engine.currentScene.world.entityManager.entities.length,
                parse: v => String(v),
                index: 3
            });
        });

        numberEntitiesBlade = this.pane.addBlade({
            view: 'text',
            label: 'number of entities',
            value: this.engine.currentScene.world.entityManager.entities.length,
            parse: v => String(v),
            index: 3
        });
        this.pointerPos = { x: 10, y: 10 };
        this.pointerPosInput = this.pane.addInput(this, "pointerPos", {
            label: 'pointer pos (world)'
        });

        
    }

    public update(devtool: DevTool) {
        const game = devtool.engine;
        // Current pointer pos
        const pointerPos = game.input.pointers.primary.lastWorldPos;
        this.pointerPos.x = pointerPos.x;
        this.pointerPos.y = pointerPos.y;
        this.pointerPosInput.refresh();

        // Updated Selection
        const entityIds = [...this.pointerSystem.lastFrameEntityToPointers.keys(), ...this.pointerSystem.currentFrameEntityToPointers.keys()];
        if (entityIds.length === 0) {
            entityIds.push(-1); // nothing selected
            entityIds.push(this.selectedEntityId);
        }
        this.highlighted = entityIds;
        game.debug.filter.useFilter = true;
        game.debug.filter.ids = entityIds;

        // Update Screen if needed
        if (this.currentResolution.width !== game.screen.resolution.width ||
            this.currentResolution.height !== game.screen.resolution.height ||
            this.currentViewport.width !== game.screen.viewport.width ||
            this.currentViewport.height !== game.screen.viewport.height) {

            this.resolutionText.dispose();
            this.viewportText.dispose();
            this.resolutionText = this.screenFolder.addBlade({
                view: 'text',
                label: 'resolution',
                value: `(${game.screen.resolution.width}x${game.screen.resolution.height})`,
                parse: v => String(v),
                index: 0
            });
            this.viewportText = this.screenFolder.addBlade({
                view: 'text',
                label: 'viewport',
                value: `(${game.screen.viewport.width.toFixed(0)}x${game.screen.viewport.height.toFixed(0)})`,
                parse: v => String(v),
                index: 1
            });
        }
    }

    public start() {
        const game = this.engine;
        game.canvas.addEventListener('click', () => {
            if (this.highlighted[0] !== -1) {
                this.selectedEntityId = this.highlighted[0];
                this.selectedEntity = game.currentScene.world.entityManager.getById(this.highlighted[0]) as Actor;
                console.log('Selected', this.selectedEntity);
                if (this.selectedEntityFolder) {
                    this.selectedEntityFolder.dispose();
                    this.selectedEntityFolder = this.selectedEntityTab.addFolder({
                        title: 'Selected',
                        // disabled: true
                    });
                }
                this.selectedEntityFolder.addBlade({ view: 'text', label: 'id', value: this.selectedEntity.id.toString(), parse: v => String(v) });
                this.selectedEntityFolder.addInput(this.selectedEntity, 'name');
                if (this.selectedEntity.color) {
                    this.selectedEntityFolder.addInput(this.selectedEntity as Actor, 'color').on("change", ev => {
                        this.selectedEntity.color = new Color(ev.value.r, ev.value.g, ev.value.b, ev.value.a)
                    });
                }
                this.selectedEntityFolder.addBlade({
                    view: 'text',
                    label: 'parent',
                    value: this.selectedEntity.parent ? `(${this.selectedEntity.parent?.id}) ${this.selectedEntity.parent?.name}` : 'none',
                    parse: (v) => String(v)
                });
                this.selectedEntityFolder.addBlade({
                    view: 'list',
                    label: 'children',
                    options: this.selectedEntity.children.map(c => ({ text: `(${c.id}) ${c.name}`, value: c.id })),
                    value: this.selectedEntity.children.length ? this.selectedEntity.children[0].id : 'none',
                });

                const transformComponent = this.selectedEntity.get(TransformComponent)
                if (transformComponent) {

                    const transform = this.selectedEntityFolder.addFolder({
                        title: 'Transform'
                    });

                    const tx = transform.addInput(transformComponent, "pos");
                    const rot = transform.addInput(transformComponent, "rotation", {
                        min: 0,
                        max: 2 * Math.PI,
                    });
                    const scale = transform.addInput(transformComponent, 'scale');
                    transform.addSeparator();

                    const globalTx = transform.addInput(transformComponent, "globalPos", { label: "global pos" })
                    const globalRot = transform.addInput(transformComponent, "globalRotation", {
                        label: "global rot",
                        min: 0,
                        max: 2 * Math.PI,
                    });
                    const globalScale = transform.addInput(transformComponent, 'globalScale', { label: "global pos" });

                    globalTx.on("change", () => tx.refresh());
                    tx.on("change", () => globalTx.refresh());

                    globalRot.on("change", () => rot.refresh());
                    rot.on("change", () => globalRot.refresh());

                    globalScale.on("change", () => scale.refresh());
                    scale.on("change", () => globalScale.refresh());
                }

                const motionComponent = this.selectedEntity.get(MotionComponent);
                if (motionComponent) {

                    const motion = this.selectedEntityFolder.addFolder({
                        title: 'Motion'
                    });
                    motion.addInput(motionComponent, "vel");
                    motion.addInput(motionComponent, "acc");
                    motion.addInput(motionComponent, "angularVelocity", {
                        step: .1
                    });
                    motion.addInput(motionComponent, "scaleFactor");
                    motion.addInput(motionComponent, "inertia");
                }

                const graphicsComponent = this.selectedEntity.get(GraphicsComponent);
                if (graphicsComponent) {

                    const graphics = this.selectedEntityFolder.addFolder({
                        title: 'Graphics'
                    });

                    graphics.addInput(graphicsComponent, "anchor");
                    graphics.addInput(graphicsComponent, "opacity", {
                        min: 0,
                        max: 1,
                        step: 0.05
                    });
                    graphics.addInput(graphicsComponent, "visible");

                    // woof a lot of effort to do this
                    const dropdown: {text: string, value: number}[] = [];
                    const allGraphics: Graphic[] = [];
                    const currentGfx = graphicsComponent.current.map(c => c.graphic);
                    const namedGfx: Graphic[] = [];
                    let gfxIndex = 0;
                    for (let key in graphicsComponent.graphics) {
                        dropdown.push({text: key, value: gfxIndex++});
                        allGraphics.push(graphicsComponent.graphics[key]);

                        namedGfx.push(graphicsComponent.graphics[key]);
                    }
                    let anonIndex = 0;
                    for (let graphic of currentGfx) {
                        if (namedGfx.indexOf(graphic) === -1) {
                            dropdown.push({text: `anonymous${anonIndex++}`, value: gfxIndex});
                            allGraphics.push(graphic);
                        }
                    }

                    console.log(dropdown);
                    const graphicsList = graphics.addBlade({
                        view: 'list',
                        label: 'graphics',
                        options: dropdown,
                        value: allGraphics.indexOf(graphicsComponent.current[0].graphic)
                    }) as ListApi<number>;
                    graphicsList.on('change', ev => {
                        graphicsComponent.use(allGraphics[ev.value]);
                    });
                }

                const colliderComponent = this.selectedEntity.get(ColliderComponent);
                const bodyComponent = this.selectedEntity.get(BodyComponent);
                if (colliderComponent) {

                    const collider = this.selectedEntityFolder.addFolder({
                        title: 'Collider & Body'
                    });
                    collider.addBlade({
                        view: 'text',
                        label: 'type',
                        value: (colliderComponent.get() as any).constructor.name,
                        parse: (v) => String(v)
                    });
                    if (bodyComponent) {

                        const collisionTypes = collider.addBlade({
                            view: 'list',
                            label: 'collisionType',
                            options: [CollisionType.Active, CollisionType.Fixed, CollisionType.Passive, CollisionType.PreventCollision].map(
                                c => ({
                                    text: c,
                                    value: c
                                })),
                                value: bodyComponent.collisionType
                            }) as ListApi<CollisionType>;
                        collisionTypes.on("change", ev => {
                            bodyComponent.collisionType = ev.value;
                        });
                        
                        const collisionGroups = collider.addBlade({
                            view: 'list',
                            label: 'collisionGroup',
                            options: [CollisionGroup.All, ...CollisionGroupManager.groups].map(c => ({
                                text: c.name,
                                value: c
                            })),
                            value: bodyComponent.group
                        }) as ListApi<any>;
                        collisionGroups.on("change", ev => {
                            bodyComponent.group = ev.value;
                        });
                    }
                }

                this.selectedEntityFolder.disabled = false;
            }
            // selected.disabled = true;
        });
    }

    public buildScreen() {
        this.screenFolder = this.screenTab.addFolder({
            title: 'Screen'
        });
        this.currentResolution = this.engine.screen.resolution;
        this.currentViewport = this.engine.screen.viewport;
        this.resolutionText = this.screenFolder.addBlade({
            view: 'text',
            label: 'resolution',
            value: `(${this.engine.screen.resolution.width}x${this.engine.screen.resolution.height})`,
            parse: v => String(v),
            index: 0
        });
        this.viewportText = this.screenFolder.addBlade({
            view: 'text',
            label: 'viewport',
            value: `(${this.engine.screen.viewport.width.toFixed(0)}x${this.engine.screen.viewport.height.toFixed(0)})`,
            parse: v => String(v),
            index: 1
        });

        let fullscreen = this.screenFolder.addButton({
            title: 'Fullscreen',
        });
        fullscreen.on('click', () => {
            this.engine.screen.goFullScreen();
        });
    }

    public buildCamera() {
        const cameraFolder = this.cameraTab.addFolder({
            title: 'Camera',
        });

        cameraFolder.addInput(this.engine.currentScene.camera, "zoom", {
            min: .01,
            max: 10,
            step: .5
        });
        cameraFolder.addInput(this.engine.currentScene.camera, "pos");
    }

    public buildClock() {
        const clock = this.clockTab.addFolder({
            title: 'Clock'
        });

        let usingTestClock = this.engine.clock instanceof TestClock;
        let stepMs = 16;
        const step = clock.addButton({
            title: 'step',
            disabled: !usingTestClock,
            index: 2
        }).on('click', () => (this.engine.clock as TestClock).step(stepMs));
        const stepSlider = clock.addBlade({
            view: 'slider',
            label: 'step (ms)',
            min: 1,
            max: 100,
            step: 16,
            value: stepMs
        }) as SliderApi;
        stepSlider.on('change', ev => stepMs = ev.value)

        const useTestClock = clock.addButton({
            title: 'Use Test Clock',
            index: 0,
        });
        useTestClock.on('click', () => {
            this.engine.debug.useTestClock();
            usingTestClock = true;
            step.disabled = false;
        });

        const useStandardClock = clock.addButton({
            title: 'Use Standard Clock',
            index: 1
        });
        useStandardClock.on('click', () => {
            this.engine.debug.useStandardClock();
            usingTestClock = false;
            step.disabled = true;
        });

        this.pane.addSeparator();

        const stopGameButton = clock.addButton({
            title: 'Stop',
            disabled: false
        });
        const startGameButton = clock.addButton({
            title: 'Start',
            disabled: true
        });
        stopGameButton.on('click', () => {
            this.engine.clock.stop();
            startGameButton.disabled = false;
            stopGameButton.disabled = true;
        });
        startGameButton.on('click', () => {
            this.engine.clock.start();
            stopGameButton.disabled = false;
            startGameButton.disabled = true;
        });
        
    }

    public buildPhysics() {
        const physics = this.physicsTab;

        const physicsSettings: typeof Physics = {} as any

        for (let key in Physics) {
            physicsSettings[key] = Physics[key];
        }
        physics.addInput(physicsSettings, "enabled").on('change', ev => Physics.enabled = ev.value);
        physics.addInput(physicsSettings, "acc");
        physics.addInput(physicsSettings, "collisionResolutionStrategy");
        physics.addButton({
            title: 'Use Arcade'
        }).on('click', () => Physics.useArcadePhysics());
        physics.addButton({
            title: 'Use Realistic'
        }).on('click', () => Physics.useRealisticPhysics());
        physics.addInput(physicsSettings, "positionIterations", {
            min: 1,
            max: 30,
            step: 1
        }).on("change", ev => Physics.positionIterations = ev.value);
        physics.addInput(physicsSettings, "velocityIterations", {
            min: 1,
            max: 30,
            step: 1
        }).on('change', ev => Physics.velocityIterations = ev.value);
        // physics.addInput(Physics, "acc");
        physics.addInput(physicsSettings, "checkForFastBodies").on("change", ev => Physics.checkForFastBodies = ev.value);
    }

    public buildDebugSettingsTab() {
        const debug = this.debugTab;

        var supportedKeys = ['entity', 'transform', 'motion', 'body', 'collider', 'physics', 'graphics', 'camera'];
        for (let key of supportedKeys) {
            let folder = debug.addFolder({ title: key });
            if (this.engine.debug[key]) {
                for (let option in this.engine.debug[key]) {
                    if (option) {
                        if (option.toLocaleLowerCase().includes('color')) {
                            folder.addInput(this.engine.debug[key], option);
                        } else {
                            if (Array.isArray(this.engine.debug[key][option])) {
                                continue;
                            }
                            folder.addInput(this.engine.debug[key], option);
                        }
                    }
                }
            }
        }
    }
}