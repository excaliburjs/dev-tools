import * as ex from "excalibur";
import { BladeApi, FolderApi, ListApi, Pane, SliderApi, TabApi, TabPageApi } from "tweakpane";
import { PickerSystem } from './picker-system'

type SceneOption = { text: string, value: string };
type ArrayComparator<T> = (item: T, index: number, otherItems: T[]) => boolean

export class DevTool {
    public pane: Pane
    public tabs: TabApi;
    public pickerSystem: PickerSystem;
    pointerPos: { x: number, y: number } = { x: 0, y: 0 };
    highlightedEntities: number[] = [-1];
    selectedEntity: ex.Actor | null = null;
    selectedEntityId: number = -1;
    currentResolution: ex.ScreenDimension;
    currentViewport: ex.ScreenDimension;
    resolutionText: BladeApi<any>;
    viewportText: BladeApi<any>;
    screenFolder: FolderApi;

    // tabs
    selectedEntityTab: TabPageApi;
    selectedEntityFolder: FolderApi;
    screenTab: TabPageApi;
    cameraTab: TabPageApi;
    timerTab: TabPageApi;
    clockTab: TabPageApi;
    physicsTab: TabPageApi;
    debugTab: TabPageApi;
    pointerPosInput: any;

    constructor(public engine: ex.Engine) {
        this.pane = new Pane({
            title: 'Excalibur Dev Tools',
            expanded: true
        });
        const style = document.createElement('style');
        style.innerText = ".excalibur-tweakpane-custom { width: 405px; }";
        document.head.appendChild(style);
        this.pane.element.parentElement.classList.add("excalibur-tweakpane-custom");

        this._buildMain();

        this.tabs = this.pane.addTab({
            pages: [
                { title: 'Entity' },
                { title: 'Screen' },
                { title: 'Camera' },
                { title: 'Clock' },
                { title: 'Timers' },
                { title: 'Physics' },
                { title: 'Settings' }
            ]
        });

        this.selectedEntityTab = this.tabs.pages[0];
        this.screenTab = this.tabs.pages[1];
        this.cameraTab = this.tabs.pages[2];
        this.clockTab = this.tabs.pages[3];
        this.timerTab = this.tabs.pages[4];
        this.physicsTab = this.tabs.pages[5];
        this.debugTab = this.tabs.pages[6];

        this._installPickerSystemIfNeeded(engine.currentScene);

        engine.debug.transform.showPosition = true;
        engine.debug.entity.showName = true;
        this.selectedEntityFolder = this.selectedEntityTab.addFolder({
            title: 'Selected',
        });


        this._buildScreenTab();
        this._buildCameraTab();
        this._buildClockTab();
        this._buildTimersTab();
        this._buildPhysicsTab();
        this._buildDebugSettingsTab();

        setInterval(() => {
            this.update(this)
        }, 30)

        this.addListeners();
    }

    /**
     * Add any event listeners relevant to the devtool
     */
    public addListeners() {
        const game = this.engine;
        game.canvas.addEventListener('click', () => {
            if (this.highlightedEntities[0] !== -1) {
                this.selectEntityById(this.highlightedEntities[0]);
            }
        });
    }

    public selectEntityById(id: number) {
        const game = this.engine;
        this.selectedEntityId = id;
        this.selectedEntity = game.currentScene.world.entityManager.getById(id) as ex.Actor;
        this._buildEntityUI(this.selectedEntity);

        const transformComponent = this.selectedEntity.get(ex.TransformComponent)
        this._buildTransformUI(transformComponent);

        const motionComponent = this.selectedEntity.get(ex.MotionComponent);
        this._buildMotionUI(motionComponent);

        if (this.selectedEntity instanceof ex.ParticleEmitter) {
            // build particle emitter UI
            this._buildParticleEmitterUI(this.selectedEntity);
        } else {
            const graphicsComponent = this.selectedEntity.get(ex.GraphicsComponent);
            this._buildGraphicsUI(graphicsComponent);
            
            const colliderComponent = this.selectedEntity.get(ex.ColliderComponent);
            const bodyComponent = this.selectedEntity.get(ex.BodyComponent);
            this._buildColliderUI(colliderComponent, bodyComponent);
        }
    }

    /**
     * `update()` is called periodically over time
     * @param devtool 
     */
    public update(devtool: DevTool) {
        const game = devtool.engine;
        // Current pointer pos
        const pointerPos = game.input.pointers.primary.lastWorldPos;
        this.pointerPos.x = pointerPos.x;
        this.pointerPos.y = pointerPos.y;
        this.pointerPosInput.refresh();

        // Updated Selection
        const entityIds = [...this.pickerSystem.lastFrameEntityToPointers.keys(), ...this.pickerSystem.currentFrameEntityToPointers.keys()];
        if (entityIds.length === 0) {
            entityIds.push(-1); // nothing selected
            entityIds.push(this.selectedEntityId);
        }
        this.highlightedEntities = entityIds;
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
        // Update timers
        this._buildTimersTab();

        // Update scene ui
        this._buildSceneUI();
    }



    private _installPickerSystemIfNeeded(scene: ex.Scene) {
        this.pickerSystem = scene.world.systemManager.get(PickerSystem);
        if (!this.pickerSystem) {
            this.pickerSystem = new PickerSystem()
            scene.world.systemManager.addSystem(this.pickerSystem)
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

        this._buildSceneUI();

        this.pointerPos = { x: 10, y: 10 };
        this.pointerPosInput = this.pane.addInput(this, "pointerPos", {
            label: 'pointer pos (world)'
        });

        this.pane.addInput(this, "selectedEntityId", {
            "label": "Select By Id"
        }).on("change", ev => this.selectEntityById(ev.value));

    }

    private _buildEntityUI(entity: ex.Entity) {
        if (this.selectedEntityFolder) {
            this.selectedEntityFolder.dispose();
            this.selectedEntityFolder = this.selectedEntityTab.addFolder({
                title: 'Selected'
            });
        }
        this.selectedEntityFolder.addBlade({ view: 'text', label: 'id', value: entity.id.toString(), parse: v => String(v) });
        this.selectedEntityFolder.addInput(this.selectedEntity, 'name');

        this.selectedEntityFolder.addBlade({
            view: 'text',
            label: 'tags',
            value: entity.tags.join(',') || 'none',
            parse: v => String(v)
        });

        if (entity instanceof ex.Actor && entity.color) {
            this.selectedEntityFolder.addInput(this.selectedEntity as ex.Actor, 'color').on("change", ev => {
                entity.color = new ex.Color(ev.value.r, ev.value.g, ev.value.b, ev.value.a);
            });
        }
        this.selectedEntityFolder.addBlade({
            view: 'text',
            label: 'parent',
            value: entity.parent ? `(${entity.parent?.id}) ${entity.parent?.name}` : 'none',
            parse: (v) => String(v)
        });
        this.selectedEntityFolder.addBlade({
            view: 'list',
            label: 'children',
            options: entity.children.map(c => ({ text: `(${c.id}) ${c.name}`, value: c.id })),
            value: entity.children.length ? entity.children[0].id : 'none',
        });
        this.selectedEntityFolder.addButton({
            title: 'Kill Entity'
        }).on("click", ev => {
            this.selectedEntity.kill();
            // clear entity tab
            this.selectedEntityFolder.dispose();
            this.selectedEntityFolder = this.selectedEntityTab.addFolder({
                title: 'Selected'
            });
        });

    }

    private _buildColliderUI(colliderComponent: ex.ColliderComponent, bodyComponent: ex.BodyComponent) {
        if (colliderComponent) {

            const collider = this.selectedEntityFolder.addFolder({
                title: 'Collider & Body'
            });
            collider.addBlade({
                view: 'text',
                label: 'type',
                value: (colliderComponent.get() as any)?.constructor.name ?? 'none',
                parse: (v) => String(v)
            });
            if (bodyComponent) {

                const collisionTypes = collider.addBlade({
                    view: 'list',
                    label: 'collisionType',
                    options: [ex.CollisionType.Active, ex.CollisionType.Fixed, ex.CollisionType.Passive, ex.CollisionType.PreventCollision].map(
                        c => ({
                            text: c,
                            value: c
                        })),
                    value: bodyComponent.collisionType
                }) as ListApi<ex.CollisionType>;
                collisionTypes.on("change", ev => {
                    bodyComponent.collisionType = ev.value;
                });

                const collisionGroups = collider.addBlade({
                    view: 'list',
                    label: 'collisionGroup',
                    options: [ex.CollisionGroup.All, ...ex.CollisionGroupManager.groups].map(c => ({
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
    }

    private _buildParticleEmitterUI(particles: ex.ParticleEmitter) {
        const particlesFolder = this.selectedEntityFolder.addFolder({
            title: 'Particles'
        });

        particlesFolder.addInput(particles, "isEmitting");
        particlesFolder.addInput(particles, "emitRate");
        particlesFolder.addInput(particles, "fadeFlag");
        particlesFolder.addInput(particles, "particleLife", {
            min: 100,
            max: 10000,
            step: 100
        });
        particlesFolder.addInput(particles, "width");
        particlesFolder.addInput(particles, "height");
        particlesFolder.addInput(particles, "minVel");
        particlesFolder.addInput(particles, "maxVel");
        particlesFolder.addInput(particles, "minAngle", {
            min: 0,
            max: Math.PI * 2,
            step: .1
        });
        particlesFolder.addInput(particles, "maxAngle",  {
            min: 0,
            max: Math.PI * 2,
            step: .1
        });
        particlesFolder.addInput(particles, "minSize");
        particlesFolder.addInput(particles, "maxSize");
        particlesFolder.addInput(particles, "beginColor");
        particlesFolder.addInput(particles, "endColor");
        particlesFolder.addInput(particles, "opacity", {
            min: 0,
            max: 1,
            step: .01
        });
        particlesFolder.addInput(particles, "randomRotation");
        particlesFolder.addInput(particles, "particleRotationalVelocity");
    }

    private _buildGraphicsUI(graphicsComponent: ex.GraphicsComponent) {
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
            const dropdown: { text: string; value: number; }[] = [];
            const allGraphics: ex.Graphic[] = [];
            const currentGfx = graphicsComponent.current.map(c => c.graphic);
            const namedGfx: ex.Graphic[] = [];
            let gfxIndex = 0;
            for (let key in graphicsComponent.graphics) {
                dropdown.push({ text: key, value: gfxIndex++ });
                allGraphics.push(graphicsComponent.graphics[key]);

                namedGfx.push(graphicsComponent.graphics[key]);
            }
            let anonIndex = 0;
            for (let graphic of currentGfx) {
                if (namedGfx.indexOf(graphic) === -1) {
                    dropdown.push({ text: `anonymous${anonIndex++}`, value: gfxIndex });
                    allGraphics.push(graphic);
                }
            }

            const graphicsList = graphics.addBlade({
                view: 'list',
                label: 'graphics',
                options: dropdown,
                value: allGraphics.indexOf(graphicsComponent.current[0]?.graphic)
            }) as ListApi<number>;
            graphicsList.on('change', ev => {
                graphicsComponent.use(allGraphics[ev.value]);
            });
        }
    }

    private _buildMotionUI(motionComponent: ex.MotionComponent) {
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
    }

    private _buildTransformUI(transformComponent: ex.TransformComponent) {
        if (transformComponent) {
            const transform = this.selectedEntityFolder.addFolder({
                title: 'Transform'
            });
            const coordPlane = transform.addBlade({
                view: 'list',
                label: 'coord plane',
                options: [ex.CoordPlane.World, ex.CoordPlane.Screen].map(c => ({ text: c, value: c })),
                value: transformComponent.coordPlane
            }) as ListApi<ex.CoordPlane>;
            coordPlane.on("change", ev => transformComponent.coordPlane = ev.value);

            const tx = transform.addInput(transformComponent, "pos");
            const rot = transform.addInput(transformComponent, "rotation", {
                min: 0,
                max: 2 * Math.PI,
            });
            const scale = transform.addInput(transformComponent, 'scale');
            transform.addSeparator();

            const globalTx = transform.addInput(transformComponent, "globalPos", { label: "global pos" });
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

            transform.addInput(transformComponent, "z", {label : "z-index"});
        }
    }

    private _buildScreenTab() {
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

        this.screenFolder.addSeparator();

        const colorBlindness = this.screenFolder.addBlade({
            view: 'list',
            label: 'Color Blindness Mode',
            options: [ex.ColorBlindnessMode.Deuteranope, ex.ColorBlindnessMode.Protanope, ex.ColorBlindnessMode.Tritanope].map(c => ({ text: c, value: c })),
            value: ex.ColorBlindnessMode.Deuteranope
        }) as ListApi<ex.ColorBlindnessMode>;

        const shouldSimulate = {"simulate": false};
        const simulate = this.screenFolder.addInput(shouldSimulate, "simulate");

        this.screenFolder.addButton({
            title: 'Apply'
        }).on("click", () => {
            if (shouldSimulate.simulate) {
                this.engine.debug.colorBlindMode.simulate(colorBlindness.value);
            } else {
                this.engine.debug.colorBlindMode.correct(colorBlindness.value);
            }
        });
        this.screenFolder.addButton({
            title: 'Clear'
        }).on('click', () => {
            this.engine.debug.colorBlindMode.clear();
        });
    }

    private _buildCameraTab() {
        const cameraFolder = this.cameraTab.addFolder({
            title: 'Camera',
        });

        cameraFolder.addInput(this.engine.currentScene.camera, "zoom", {
            min: .01,
            max: 10,
            step: .1
        });
        cameraFolder.addInput(this.engine.currentScene.camera, "pos");
    }

    private _buildClockTab() {
        const clock = this.clockTab.addFolder({
            title: 'Clock'
        });

        let usingTestClock = this.engine.clock instanceof ex.TestClock;
        let stepMs = 16;
        const step = clock.addButton({
            title: 'step',
            disabled: !usingTestClock,
            index: 2
        }).on('click', () => (this.engine.clock as ex.TestClock).step(stepMs));
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

    private _timersFolder: FolderApi;
    private _buildTimersTab() {
        const timers = this.timerTab;

        if (this._timersFolder) {
            this._timersFolder.dispose();
        }
        this._timersFolder = this.timerTab.addFolder({
            title: "Timers"
        });


        for (let timer of this.engine.currentScene.timers) {
            let status = (timer.repeats && timer.maxNumberOfRepeats === -1) ? 'repeats': ((timer as any)._numberOfTicks + 1) + ' of ' + (timer.maxNumberOfRepeats === -1 ? 1 : timer.maxNumberOfRepeats);
            if (!timer.isRunning) {
                status = "stopped";
            }
            if (timer.complete) {
                status = "complete";
            }
            this._timersFolder.addBlade({
                view: 'text',
                label: `timer(${timer.id})`,
                value:`${status} next(${timer.timeToNextAction.toFixed(0)}ms)`,
                parse: v => String(v)
            });
        }
    }

    private _buildPhysicsTab() {
        const physics = this.physicsTab;

        const physicsSettings: typeof ex.Physics = {} as any

        for (let key in ex.Physics) {
            physicsSettings[key] = ex.Physics[key];
        }
        physics.addInput(physicsSettings, "enabled").on('change', ev => ex.Physics.enabled = ev.value);
        physics.addInput(physicsSettings, "acc");
        const solverInput = physics.addInput(physicsSettings, "collisionResolutionStrategy");
        physics.addButton({
            title: 'Use Arcade'
        }).on('click', () => {
            ex.Physics.useArcadePhysics();
            physicsSettings.collisionResolutionStrategy = ex.Physics.collisionResolutionStrategy;
            solverInput.refresh();
        });
        physics.addButton({
            title: 'Use Realistic'
        }).on('click', () => {
            ex.Physics.useRealisticPhysics();
            physicsSettings.collisionResolutionStrategy = ex.Physics.collisionResolutionStrategy;
            solverInput.refresh();
        });

        physics.addInput(physicsSettings, 'bodiesCanSleepByDefault').on("change", ev => ex.Physics.bodiesCanSleepByDefault = ev.value);
        physics.addInput(physicsSettings, 'warmStart').on("change", ev => ex.Physics.warmStart = ev.value);
        physics.addInput(physicsSettings, 'sleepEpsilon', { min: 0.01, max: 2, step: .05}).on("change", ev => ex.Physics.sleepEpsilon = ev.value);
        physics.addInput(physicsSettings, 'wakeThreshold', { min: 0.01, max: 2, step: .05}).on("change", ev => ex.Physics.wakeThreshold = ev.value);
        physics.addInput(physicsSettings, "positionIterations", {
            min: 1,
            max: 30,
            step: 1
        }).on("change", ev => ex.Physics.positionIterations = ev.value);
        physics.addInput(physicsSettings, "velocityIterations", {
            min: 1,
            max: 30,
            step: 1
        }).on('change', ev => ex.Physics.velocityIterations = ev.value);
        // physics.addInput(Physics, "acc");
        physics.addInput(physicsSettings, "checkForFastBodies").on("change", ev => ex.Physics.checkForFastBodies = ev.value);
    }

    private _buildDebugSettingsTab() {
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

    private _scenePicker: ListApi<string>;
    private _numberEntitiesBlade: BladeApi<any>;
    private _previousScenes: SceneOption[] = [];
    private _previousScene: ex.Scene = null;

    private _areArraysEqual<T = any>(items: T[], otherItems: T[], comparator: ArrayComparator<T>) {
        if(items.length !== otherItems.length) {
            return false;
        }
        
        return items.every(comparator)
    }

    private _areScenesEqual(previousScenes: SceneOption[], scenes: SceneOption[]) {
        return this._areArraysEqual(previousScenes, scenes, (item, index, otherItems) => item.value === otherItems[index].value);
    }

    private _buildSceneUI() {
        const scenes: SceneOption[] = [];
        let currentSceneName = '';

        for (let key in this.engine.scenes) {
            if (this.engine.currentScene === this.engine.scenes[key]) {
                currentSceneName = key;
            }
            scenes.push({ text: key, value: key })
        }
        
        if(this._previousScene === this.engine.currentScene && this._areScenesEqual(this._previousScenes, scenes)) {
            return;
        }

        if(this._scenePicker) {
            this._scenePicker.dispose();
        }

        if(this._numberEntitiesBlade) {
            this._numberEntitiesBlade.dispose();
        }

        this._scenePicker = this.pane.addBlade({
            view: 'list',
            label: 'current scene',
            options: scenes,
            value: currentSceneName,
            index: 2,
        }) as ListApi<string>;

        this._scenePicker.on('change', ev => {
            this.engine.goToScene(ev.value);
        });

        this._numberEntitiesBlade = this.pane.addBlade({
            view: 'text',
            label: 'number of entities',
            value: this.engine.currentScene.world.entityManager.entities.length,
            parse: v => String(v),
            index: 3
        });

        this._installPickerSystemIfNeeded(this.engine.currentScene);
        this._previousScene = this.engine.currentScene;
        this._previousScenes = scenes;
    }
}